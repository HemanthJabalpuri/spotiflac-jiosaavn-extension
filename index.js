// ============================================================================
// JioSaavn for SpotiFLAC
// Metadata + download provider. Saves 320 kbps AAC with cover art and tags
// muxed into the file.
//
// Written in ES5 style on purpose - the Goja sandbox is conservative and this
// avoids surprises with arrow functions / template literals inside callbacks.
// ============================================================================

var EXT_ID = "jiosaavn";
var DEFAULT_API = "https://jiosaavn-api-ten-beryl.vercel.app";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// JioSaavn serves AAC in an MP4 container. Everything downstream assumes this.
var AUDIO_EXT = ".m4a";
var AUDIO_FORMAT = "m4a";

// Our quality ids -> the "quality" strings JioSaavn uses in downloadUrl[].
var QUALITY_MAP = {
  AAC_320: "320kbps",
  AAC_160: "160kbps",
  AAC_96: "96kbps",
  AAC_48: "48kbps",
  AAC_12: "12kbps"
};

// The app may hand us a generic quality id when the download did not originate
// from our own quality picker. Degrade sensibly instead of failing.
var GENERIC_QUALITY_MAP = {
  HI_RES: "320kbps",
  LOSSLESS: "320kbps",
  HIGH: "320kbps",
  NORMAL: "160kbps",
  LOW: "96kbps",
  DEFAULT: "320kbps"
};

var settings = {};
var apiBase = DEFAULT_API;

// ============================================================================
// LIFECYCLE
// ============================================================================

function initialize(config) {
  settings = config || {};

  apiBase = String(settings.apiBaseUrl || DEFAULT_API);
  while (apiBase.length > 1 && apiBase.charAt(apiBase.length - 1) === "/") {
    apiBase = apiBase.substring(0, apiBase.length - 1);
  }
  if (apiBase.indexOf("http") !== 0) {
    apiBase = "https://" + apiBase;
  }

  log.info("JioSaavn extension initialized (" + apiBase + ")");
  return true;
}

function cleanup() {
  settings = {};
}

// ============================================================================
// SETTINGS BUTTONS
// ============================================================================

function testConnection() {
  var data = apiGet("/api/search/songs?query=test&limit=1");
  if (!data || !data.results) {
    return { success: false, error: "Could not reach " + apiBase };
  }
  return { success: true, message: "Connected. API is responding normally." };
}

function clearCache() {
  try {
    storage.remove("song_cache");
  } catch (e) {
    return { success: false, error: String(e) };
  }
  return { success: true, message: "Cache cleared." };
}

// ============================================================================
// HELPERS
// ============================================================================

function dbg(msg, data) {
  if (settings && settings.debug) {
    log.debug("[jiosaavn] " + msg, data);
  }
}

function isArray(v) {
  return Object.prototype.toString.call(v) === "[object Array]";
}

function enc(v) {
  return encodeURIComponent(String(v == null ? "" : v));
}

/**
 * JioSaavn returns HTML-escaped names, e.g. Tum Hi Ho (From &quot;Aashiqui 2&quot;).
 * Left as-is they end up verbatim in the file tags.
 */
function decodeEntities(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#0?34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, function (m, d) {
      return String.fromCharCode(parseInt(d, 10));
    })
    .replace(/&amp;/g, "&");
}

function apiGet(path) {
  var url = apiBase + path;
  var res;
  try {
    res = http.get(url, { Accept: "application/json", "User-Agent": UA });
  } catch (e) {
    log.error("[jiosaavn] request threw: " + url, String(e));
    return null;
  }
  if (!res || !res.ok) {
    dbg("GET " + url + " -> " + (res ? res.statusCode : "no response"));
    return null;
  }
  var parsed;
  try {
    parsed = JSON.parse(res.body);
  } catch (e2) {
    log.error("[jiosaavn] bad JSON from " + url);
    return null;
  }
  if (!parsed || parsed.success === false) {
    dbg("API reported failure for " + path, parsed && parsed.message);
    return null;
  }
  return parsed.data;
}

/**
 * image[] comes back as [{quality:"50x50",url},{...150x150},{...500x500}].
 */
function pickImage(images, want) {
  if (!images) return "";
  if (typeof images === "string") return images;
  if (!isArray(images) || !images.length) return "";
  want = want || (settings.coverSize || "500x500");
  for (var i = 0; i < images.length; i++) {
    if (images[i] && images[i].quality === want) return images[i].url;
  }
  var last = images[images.length - 1];
  return last && last.url ? last.url : "";
}

/**
 * `artists` is {primary:[],featured:[],all:[]} for songs/albums but a bare
 * array for playlists. `all` repeats the same person once per role, so dedupe.
 */
function artistNames(artists, max) {
  if (!artists) return "";
  if (typeof artists === "string") return decodeEntities(artists);

  var src = null;
  if (isArray(artists)) src = artists;
  else if (artists.primary && artists.primary.length) src = artists.primary;
  else if (artists.all && artists.all.length) src = artists.all;
  if (!src || !src.length) return "";

  max = max || 4;
  var seen = {};
  var names = [];
  for (var i = 0; i < src.length && names.length < max; i++) {
    if (!src[i] || !src[i].name) continue;
    var n = decodeEntities(src[i].name);
    var key = n.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    names.push(n);
  }
  return names.join(", ");
}

function stripExt(p) {
  if (!p) return "";
  var slash = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  var dot = p.lastIndexOf(".");
  return dot > slash && dot > 0 ? p.substring(0, dot) : p;
}

function withExtension(p, ext) {
  if (!p) return "download" + ext;
  var slash = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  var dot = p.lastIndexOf(".");
  if (dot > slash && dot > 0) {
    if (p.substring(dot).toLowerCase() === ext) return p;
    return p.substring(0, dot) + ext;
  }
  return p + ext;
}

function joinPath(dir, name) {
  if (!dir) return name;
  var sep = dir.indexOf("\\") >= 0 && dir.indexOf("/") < 0 ? "\\" : "/";
  var last = dir.charAt(dir.length - 1);
  if (last === "/" || last === "\\") return dir + name;
  return dir + sep + name;
}

function safeDelete(p) {
  if (!p) return;
  try {
    if (file.exists(p)) file.delete(p);
  } catch (e) {
    /* best effort */
  }
}

/**
 * "Kesariya (From \"Brahmastra\")" -> "Kesariya". Used only for fuzzy lookups,
 * never for the tags we write.
 */
function cleanTitle(t) {
  return String(t == null ? "" : t)
    .replace(/\((?:from|From|FROM)[^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s*[-–]\s*(remastered|radio edit|single version|explicit|lyrical|full song|video)\b[^-]*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// MAPPING TO SPOTIFLAC SCHEMA
// ============================================================================

function mapSong(s, ctx) {
  if (!s) return null;
  ctx = ctx || {};

  var album = s.album || {};
  var cover = pickImage(s.image) || ctx.cover || "";
  var name = decodeEntities(s.name || s.title || "");
  var albumName = decodeEntities(album.name || ctx.albumName || "");

  var track = {
    id: String(s.id || ""),
    name: name,
    artists: artistNames(s.artists) || decodeEntities(s.primaryArtists || ""),
    album_name: albumName || name,
    album_artist: ctx.albumArtist || artistNames(s.artists, 1),
    duration_ms: Math.round((Number(s.duration) || 0) * 1000),
    release_date: s.releaseDate || (s.year ? String(s.year) : ""),
    images: cover,
    cover_url: cover,
    item_type: "track",
    provider_id: EXT_ID
  };

  if (ctx.trackNumber) track.track_number = ctx.trackNumber;
  track.disc_number = 1;

  return track;
}

function mapAlbumStub(a) {
  if (!a) return null;
  var cover = pickImage(a.image);
  return {
    id: String(a.id || ""),
    name: decodeEntities(a.name || a.title || ""),
    artists: artistNames(a.artists),
    album_name: decodeEntities(a.name || a.title || ""),
    album_type: a.type === "single" || a.type === "ep" ? a.type : "album",
    release_date: a.year ? String(a.year) : "",
    total_tracks: Number(a.songCount) || 0,
    images: cover,
    cover_url: cover,
    item_type: "album",
    provider_id: EXT_ID
  };
}

function mapPlaylistStub(p) {
  if (!p) return null;
  var cover = pickImage(p.image);
  return {
    id: String(p.id || ""),
    name: decodeEntities(p.name || p.title || ""),
    artists: decodeEntities(p.description || "Playlist"),
    album_name: decodeEntities(p.name || p.title || ""),
    album_type: "playlist",
    total_tracks: Number(p.songCount) || 0,
    images: cover,
    cover_url: cover,
    item_type: "playlist",
    provider_id: EXT_ID
  };
}

function mapArtistStub(a) {
  if (!a) return null;
  var img = pickImage(a.image);
  var name = decodeEntities(a.name || a.title || "");
  return {
    id: String(a.id || ""),
    name: name,
    artists: name,
    images: img,
    cover_url: img,
    image_url: img,
    item_type: "artist",
    provider_id: EXT_ID
  };
}

// ============================================================================
// METADATA PROVIDER
// ============================================================================

function searchLimit() {
  var n = Number(settings.searchLimit);
  if (!n || n < 1) n = 25;
  if (n > 50) n = 50;
  return n;
}

/**
 * Plain track search - used by the app when it needs candidates from us.
 */
function searchTracks(query, limit) {
  var n = limit || searchLimit();
  var data = apiGet("/api/search/songs?query=" + enc(query) + "&limit=" + n);
  if (!data || !data.results) return [];

  var out = [];
  for (var i = 0; i < data.results.length; i++) {
    var t = mapSong(data.results[i]);
    if (t && t.id) out.push(t);
  }
  return out;
}

/**
 * Rich search shown in the JioSaavn search tab: songs plus albums, playlists
 * and artists depending on the searchScope setting.
 */
function customSearch(query, options) {
  options = options || {};
  if (!query) return [];

  var scope = settings.searchScope || "everything";
  var results = searchTracks(query, options.limit || searchLimit());

  var i, d;

  if (scope === "songs+albums" || scope === "everything") {
    d = apiGet("/api/search/albums?query=" + enc(query) + "&limit=8");
    if (d && d.results) {
      for (i = 0; i < d.results.length; i++) {
        var al = mapAlbumStub(d.results[i]);
        if (al && al.id) results.push(al);
      }
    }
  }

  if (scope === "everything") {
    d = apiGet("/api/search/artists?query=" + enc(query) + "&limit=5");
    if (d && d.results) {
      for (i = 0; i < d.results.length; i++) {
        var ar = mapArtistStub(d.results[i]);
        if (ar && ar.id) results.push(ar);
      }
    }

    d = apiGet("/api/search/playlists?query=" + enc(query) + "&limit=5");
    if (d && d.results) {
      for (i = 0; i < d.results.length; i++) {
        var pl = mapPlaylistStub(d.results[i]);
        if (pl && pl.id) results.push(pl);
      }
    }
  }

  dbg("search '" + query + "' -> " + results.length + " results");
  return results;
}

/** /api/songs/{id} returns data as an array of one. */
function getSongRaw(trackId) {
  if (!trackId) return null;
  var data = apiGet("/api/songs/" + enc(trackId));
  if (!data) return null;
  if (isArray(data)) return data.length ? data[0] : null;
  return data;
}

function getTrack(trackId) {
  return mapSong(getSongRaw(trackId));
}

function albumFromRaw(a) {
  if (!a) return null;

  var cover = pickImage(a.image);
  var albumName = decodeEntities(a.name || "");
  var albumArtist = artistNames(a.artists, 2);
  var songs = a.songs || [];
  var tracks = [];

  for (var i = 0; i < songs.length; i++) {
    var t = mapSong(songs[i], {
      albumName: albumName,
      albumArtist: albumArtist,
      cover: cover,
      trackNumber: i + 1
    });
    if (t && t.id) {
      t.provider_id = EXT_ID;
      tracks.push(t);
    }
  }

  return {
    id: String(a.id || ""),
    name: albumName,
    artists: albumArtist,
    cover_url: cover,
    images: cover,
    release_date: a.year ? String(a.year) : "",
    total_tracks: tracks.length || Number(a.songCount) || 0,
    album_type: a.type === "single" || a.type === "ep" ? a.type : "album",
    tracks: tracks,
    provider_id: EXT_ID
  };
}

function getAlbum(albumId) {
  return albumFromRaw(apiGet("/api/albums?id=" + enc(albumId)));
}

function playlistFromRaw(p) {
  if (!p) return null;

  var cover = pickImage(p.image);
  var name = decodeEntities(p.name || "");
  var songs = p.songs || [];
  var tracks = [];

  for (var i = 0; i < songs.length; i++) {
    var t = mapSong(songs[i], { cover: cover, trackNumber: i + 1 });
    if (t && t.id) {
      t.provider_id = EXT_ID;
      tracks.push(t);
    }
  }

  return {
    id: String(p.id || ""),
    name: name,
    owner: decodeEntities(p.description || "JioSaavn"),
    cover_url: cover,
    images: cover,
    total_tracks: tracks.length || Number(p.songCount) || 0,
    tracks: tracks,
    provider_id: EXT_ID
  };
}

function getPlaylist(playlistId) {
  // The API paginates playlists; ask for a big page so we get the whole thing.
  return playlistFromRaw(apiGet("/api/playlists?id=" + enc(playlistId) + "&limit=200"));
}

function getArtist(artistId) {
  var info = apiGet("/api/artists?id=" + enc(artistId));
  if (!info) return null;

  var albums = [];
  var d = apiGet("/api/artists/" + enc(artistId) + "/albums?limit=50");
  var list = d && d.albums ? d.albums : [];
  var artistName = decodeEntities(info.name || "");

  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    albums.push({
      id: String(a.id || ""),
      name: decodeEntities(a.name || ""),
      artists: artistNames(a.artists) || artistName,
      cover_url: pickImage(a.image),
      images: pickImage(a.image),
      release_date: a.year ? String(a.year) : "",
      total_tracks: Number(a.songCount) || 0,
      album_type: a.type === "single" || a.type === "ep" ? a.type : "album",
      provider_id: EXT_ID
    });
  }

  return {
    id: String(info.id || artistId),
    name: artistName,
    image_url: pickImage(info.image),
    images: pickImage(info.image),
    albums: albums,
    provider_id: EXT_ID
  };
}

// ============================================================================
// URL HANDLER
// ============================================================================

function handleURL(url) {
  if (!url) return { success: false, error: "Empty URL" };

  var link = enc(url);
  var data;

  if (url.indexOf("/song/") >= 0) {
    data = apiGet("/api/songs?link=" + link);
    var raw = isArray(data) ? data[0] : data;
    var track = mapSong(raw);
    if (!track || !track.id) {
      return { success: false, error: "Could not resolve that JioSaavn song link" };
    }
    return { success: true, type: "track", track: track };
  }

  if (url.indexOf("/album/") >= 0) {
    var album = albumFromRaw(apiGet("/api/albums?link=" + link));
    if (!album || !album.id) {
      return { success: false, error: "Could not resolve that JioSaavn album link" };
    }
    return { success: true, type: "album", album: album };
  }

  if (url.indexOf("/artist/") >= 0) {
    var info = apiGet("/api/artists?link=" + link);
    if (!info || !info.id) {
      return { success: false, error: "Could not resolve that JioSaavn artist link" };
    }
    var artist = getArtist(info.id);
    if (!artist) return { success: false, error: "Could not load artist" };
    return { success: true, type: "artist", artist: artist };
  }

  if (url.indexOf("/featured/") >= 0 || url.indexOf("/playlist/") >= 0 || url.indexOf("/s/playlist/") >= 0) {
    var pl = playlistFromRaw(apiGet("/api/playlists?link=" + link + "&limit=200"));
    if (!pl || !pl.id) {
      return { success: false, error: "Could not resolve that JioSaavn playlist link" };
    }
    // Playlists are surfaced as albums so the track list screen can render them.
    return {
      success: true,
      type: "album",
      album: {
        id: pl.id,
        name: pl.name,
        artists: pl.owner,
        cover_url: pl.cover_url,
        images: pl.images,
        total_tracks: pl.total_tracks,
        album_type: "compilation",
        tracks: pl.tracks,
        provider_id: EXT_ID
      }
    };
  }

  return { success: false, error: "Unsupported JioSaavn URL type" };
}

// ============================================================================
// TRACK ENRICHMENT (optional)
// ============================================================================

/**
 * JioSaavn never returns an ISRC, which means SpotiFLAC cannot fall back to
 * Tidal/Qobuz cleanly. When enabled, ask Odesli to translate the JioSaavn page
 * URL into an ISRC plus service ids, which unlocks true lossless downloads.
 */
function enrichTrack(track) {
  if (!track || !settings.enableOdesli) return track;
  if (track.isrc) return track;

  var raw = getSongRaw(track.id);
  var pageUrl = raw && raw.url ? raw.url : "";
  if (!pageUrl) return track;

  var res;
  try {
    res = fetch("https://api.song.link/v1-alpha.1/links?url=" + enc(pageUrl), {
      method: "GET",
      headers: { "User-Agent": UA }
    });
  } catch (e) {
    dbg("odesli threw", String(e));
    return track;
  }
  if (!res || !res.ok) return track;

  var data;
  try {
    data = res.json();
  } catch (e2) {
    return track;
  }
  if (!data) return track;

  var out = {};
  var k;

  for (k in track) {
    if (Object.prototype.hasOwnProperty.call(track, k)) out[k] = track[k];
  }

  if (data.entitiesByUniqueId) {
    var keys = Object.keys(data.entitiesByUniqueId);
    for (var i = 0; i < keys.length; i++) {
      var ent = data.entitiesByUniqueId[keys[i]];
      if (ent && ent.isrc) {
        out.isrc = ent.isrc;
        break;
      }
    }
  }

  if (data.linksByPlatform) {
    var lp = data.linksByPlatform;
    out.external_links = {};

    if (lp.tidal && lp.tidal.url) {
      out.external_links.tidal = lp.tidal.url;
      var mt = lp.tidal.url.match(/\/track\/(\d+)/);
      if (mt) out.tidal_id = mt[1];
    }
    if (lp.qobuz && lp.qobuz.url) {
      out.external_links.qobuz = lp.qobuz.url;
      var mq = lp.qobuz.url.match(/\/track\/(\d+)/);
      if (mq) out.qobuz_id = mq[1];
    }
    if (lp.deezer && lp.deezer.url) {
      out.external_links.deezer = lp.deezer.url;
      var md = lp.deezer.url.match(/\/track\/(\d+)/);
      if (md) out.deezer_id = md[1];
    }
    if (lp.spotify && lp.spotify.url) {
      out.external_links.spotify = lp.spotify.url;
    }
  }

  dbg("enriched " + track.name, out.isrc);
  return out;
}

// ============================================================================
// DOWNLOAD PROVIDER
// ============================================================================

function resolveQuality(requested) {
  var q = String(requested || "").toUpperCase();
  if (QUALITY_MAP[q]) return QUALITY_MAP[q];
  if (GENERIC_QUALITY_MAP[q]) return GENERIC_QUALITY_MAP[q];
  // Someone passed "320kbps" straight through.
  if (/^\d+kbps$/i.test(String(requested || ""))) return String(requested).toLowerCase();
  return "320kbps";
}

function kbpsOf(q) {
  var m = String(q || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Exact match if present, otherwise the best available at or below the target,
 * otherwise whatever is highest.
 */
function pickDownloadUrl(downloadUrl, wanted) {
  if (!downloadUrl || !isArray(downloadUrl) || !downloadUrl.length) return null;

  var target = kbpsOf(wanted);
  var best = null;
  var bestRate = -1;
  var highest = null;
  var highestRate = -1;

  for (var i = 0; i < downloadUrl.length; i++) {
    var opt = downloadUrl[i];
    if (!opt || !opt.url) continue;
    var rate = kbpsOf(opt.quality);

    if (rate > highestRate) {
      highestRate = rate;
      highest = opt;
    }
    if (rate === target) return opt;
    if (rate < target && rate > bestRate) {
      bestRate = rate;
      best = opt;
    }
  }
  return best || highest;
}

function scoreCandidate(candidate, trackName, artistName, durationMs) {
  var score = 0;
  var cName = decodeEntities(candidate.name || "");
  var cArtists = artistNames(candidate.artists);

  var haveMatching = typeof matching !== "undefined" && matching && matching.compareStrings;

  if (haveMatching) {
    score += matching.compareStrings(cleanTitle(cName), cleanTitle(trackName)) * 2;
    if (artistName) score += matching.compareStrings(cArtists, artistName);
  } else {
    if (cleanTitle(cName).toLowerCase() === cleanTitle(trackName).toLowerCase()) score += 2;
    if (artistName && cArtists.toLowerCase().indexOf(String(artistName).toLowerCase()) >= 0) score += 1;
  }

  if (durationMs) {
    var diff = Math.abs((Number(candidate.duration) || 0) * 1000 - durationMs);
    if (diff <= 3000) score += 1;
    else if (diff <= 10000) score += 0.4;
    else score -= 0.5;
  }

  score += Math.min(Number(candidate.playCount) || 0, 5e8) / 5e9; // gentle tiebreak
  return score;
}

function findBestSong(trackName, artistName, durationMs) {
  if (!trackName) return null;

  var queries = [];
  var full = (trackName + " " + (artistName || "")).replace(/\s+/g, " ").trim();
  var cleaned = (cleanTitle(trackName) + " " + (artistName || "")).replace(/\s+/g, " ").trim();
  queries.push(full);
  if (cleaned && cleaned !== full) queries.push(cleaned);

  var best = null;
  var bestScore = -Infinity;

  for (var qi = 0; qi < queries.length; qi++) {
    var data = apiGet("/api/search/songs?query=" + enc(queries[qi]) + "&limit=10");
    if (!data || !data.results || !data.results.length) continue;

    for (var i = 0; i < data.results.length; i++) {
      var s = scoreCandidate(data.results[i], trackName, artistName, durationMs);
      if (s > bestScore) {
        bestScore = s;
        best = data.results[i];
      }
    }
    if (bestScore >= 2.5) break; // good enough, stop querying
  }

  dbg("findBestSong '" + trackName + "' -> " + (best ? best.name : "none") + " score=" + bestScore);
  return best;
}

function checkAvailability(isrc, trackName, artistName) {
  // JioSaavn exposes no ISRC, so name matching is the only route.
  var best = findBestSong(trackName, artistName, 0);
  if (!best || !best.id) return { available: false };
  return {
    available: true,
    track_id: String(best.id),
    quality: settings.quality || "AAC_320"
  };
}

function getDownloadUrl(trackId, quality) {
  var song = getSongRaw(trackId);
  if (!song) {
    return { success: false, error: "Song not found on JioSaavn", error_type: "not_found" };
  }

  var pick = pickDownloadUrl(song.downloadUrl, resolveQuality(quality));
  if (!pick) {
    return { success: false, error: "No stream URL available for this song", error_type: "stream_error" };
  }

  return {
    success: true,
    url: pick.url,
    format: AUDIO_FORMAT,
    quality: pick.quality,
    bit_depth: 16,
    sample_rate: 44100
  };
}

// ---------------------------------------------------------------------------
// download() - the app has shipped two different signatures over time, so
// accept both rather than guessing.
// ---------------------------------------------------------------------------

function normalizeDownloadArgs(a, b, c, d) {
  var req = {
    track_id: "",
    quality: "",
    output_path: "",
    track_name: "",
    artist_name: "",
    album_name: "",
    duration_ms: 0,
    progress: null
  };

  if (a && typeof a === "object") {
    req.track_id = String(a.track_id || a.id || a.trackId || "");
    req.quality = a.quality || "";
    req.track_name = a.track_name || a.name || "";
    req.artist_name = a.artist_name || a.artists || "";
    req.album_name = a.album_name || a.album || "";
    req.duration_ms = Number(a.duration_ms) || 0;
    req.output_path = a.output_path || a.outputPath || "";

    if (!req.output_path) {
      var dir = a.output_dir || a.outputDir || "";
      var stem = (req.track_name || "track") + (req.artist_name ? " - " + req.artist_name : "");
      var fname;
      try {
        fname = gobackend.sanitizeFilename(stem);
      } catch (e) {
        fname = stem.replace(/[\\/:*?"<>|]/g, "_");
      }
      req.output_path = joinPath(dir, fname + AUDIO_EXT);
    }

    req.progress = typeof b === "function" ? b : null;
  } else {
    req.track_id = String(a || "");
    req.quality = b || "";
    req.output_path = c || "";
    req.progress = typeof d === "function" ? d : null;
  }

  return req;
}

function makeProgress(cb) {
  if (typeof cb !== "function") return null;
  var scale = settings.progressScale === "percent" ? 100 : 1;
  return function (received, total) {
    var v = total > 0 ? (received / total) * scale : 0;
    try {
      cb(v);
    } catch (e) {
      /* never let a UI callback kill the download */
    }
  };
}

/**
 * ffmetadata escaping: '=', ';', '#' and '\' are escaped with a backslash, and
 * a literal newline inside a value is escaped as backslash + newline.
 */
function ffmetaEscape(v) {
  return String(v == null ? "" : v)
    .replace(/([=;#\\])/g, "\\$1")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\\n");
}

function buildMetadataFile(path, tags) {
  var lines = [";FFMETADATA1"];
  for (var k in tags) {
    if (!Object.prototype.hasOwnProperty.call(tags, k)) continue;
    var v = tags[k];
    if (v === null || v === undefined || v === "") continue;
    lines.push(k + "=" + ffmetaEscape(v));
  }
  try {
    file.write(path, lines.join("\n") + "\n");
    return true;
  } catch (e) {
    dbg("could not write metadata file", String(e));
    return false;
  }
}

function runFfmpeg(cmd) {
  if (typeof ffmpeg === "undefined" || !ffmpeg || !ffmpeg.execute) return null;
  try {
    return ffmpeg.execute(cmd);
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function q(p) {
  return '"' + String(p) + '"';
}

/**
 * Mux the raw stream, the cover art and an ffmetadata file into the final
 * output. Degrades step by step so a missing cover or a fussy FFmpeg build
 * never costs the user their download.
 */
function muxTaggedFile(rawPath, coverPath, metaPath, finalPath) {
  var attempts = [];

  if (coverPath && metaPath) {
    attempts.push(
      "-y -i " + q(rawPath) + " -i " + q(coverPath) + " -f ffmetadata -i " + q(metaPath) +
      " -map 0:a -map 1:v -map_metadata 2 -c copy -disposition:v:0 attached_pic" +
      " -movflags +faststart " + q(finalPath)
    );
  }
  if (metaPath) {
    attempts.push(
      "-y -i " + q(rawPath) + " -f ffmetadata -i " + q(metaPath) +
      " -map 0:a -map_metadata 1 -c copy -movflags +faststart " + q(finalPath)
    );
  }
  if (coverPath) {
    attempts.push(
      "-y -i " + q(rawPath) + " -i " + q(coverPath) +
      " -map 0:a -map 1:v -c copy -disposition:v:0 attached_pic" +
      " -movflags +faststart " + q(finalPath)
    );
  }
  attempts.push("-y -i " + q(rawPath) + " -c copy -movflags +faststart " + q(finalPath));

  for (var i = 0; i < attempts.length; i++) {
    var res = runFfmpeg(attempts[i]);
    if (res && res.success && file.exists(finalPath)) {
      dbg("mux succeeded on attempt " + (i + 1));
      return true;
    }
    dbg("mux attempt " + (i + 1) + " failed", res && res.error);
    safeDelete(finalPath);
  }
  return false;
}

function download(a, b, c, d) {
  var req = normalizeDownloadArgs(a, b, c, d);

  // ---- 1. Resolve the JioSaavn song id --------------------------------
  var song = null;
  if (req.track_id) {
    song = getSongRaw(req.track_id);
  }
  if (!song && req.track_name) {
    var found = findBestSong(req.track_name, req.artist_name, req.duration_ms);
    if (found && found.id) song = getSongRaw(found.id);
  }
  if (!song) {
    return {
      success: false,
      error: "Track not found on JioSaavn",
      error_type: "not_found"
    };
  }

  // ---- 2. Pick a stream ------------------------------------------------
  var wanted = resolveQuality(req.quality);
  var pick = pickDownloadUrl(song.downloadUrl, wanted);
  if (!pick || !pick.url) {
    return {
      success: false,
      error: "No downloadable stream for this song",
      error_type: "stream_error"
    };
  }
  if (pick.quality !== wanted) {
    log.info("[jiosaavn] " + wanted + " unavailable, using " + pick.quality);
  }

  // ---- 3. Work out paths ----------------------------------------------
  var finalPath = withExtension(req.output_path, AUDIO_EXT);
  var base = stripExt(finalPath);
  var embed = settings.embedTags !== false && typeof ffmpeg !== "undefined" && ffmpeg && ffmpeg.execute;
  var rawPath = embed ? base + ".src" + AUDIO_EXT : finalPath;

  safeDelete(rawPath);
  safeDelete(finalPath);

  // ---- 4. Download the audio ------------------------------------------
  var dl;
  try {
    dl = file.download(pick.url, rawPath, {
      headers: { "User-Agent": UA, Referer: "https://www.jiosaavn.com/" },
      onProgress: makeProgress(req.progress)
    });
  } catch (e) {
    return { success: false, error: "Download threw: " + String(e), error_type: "download_error" };
  }

  if (!dl || dl.success === false) {
    safeDelete(rawPath);
    return {
      success: false,
      error: "Download failed: " + ((dl && dl.error) || "unknown error"),
      error_type: "download_error"
    };
  }

  // ---- 5. Gather tag values -------------------------------------------
  var album = song.album || {};
  var title = decodeEntities(song.name || req.track_name || "Unknown");
  var artist = artistNames(song.artists) || decodeEntities(req.artist_name || "");
  var albumArtist = artistNames(song.artists, 1) || artist;
  var albumName = decodeEntities(album.name || req.album_name || title);
  var coverUrl = pickImage(song.image);
  var year = song.year ? String(song.year) : "";
  var releaseDate = song.releaseDate || year;

  var result = {
    success: true,
    file_path: finalPath,
    format: AUDIO_FORMAT,
    actual_bit_depth: 16,
    actual_sample_rate: 44100,
    title: title,
    artist: artist,
    album: albumName,
    album_artist: albumArtist,
    track_number: 1,
    disc_number: 1,
    release_date: releaseDate,
    cover_url: coverUrl
  };

  if (!embed) {
    return result;
  }

  // ---- 6. Fetch cover art ---------------------------------------------
  var coverPath = "";
  if (coverUrl) {
    var cp = base + ".cover.jpg";
    try {
      var cres = file.download(coverUrl, cp, { headers: { "User-Agent": UA } });
      if (cres && cres.success !== false && file.exists(cp)) coverPath = cp;
    } catch (e2) {
      dbg("cover download failed", String(e2));
    }
  }

  // ---- 7. Write the tag file ------------------------------------------
  var metaPath = base + ".ffmeta.txt";
  var tags = {
    title: title,
    artist: artist,
    album: albumName,
    album_artist: albumArtist,
    date: year,
    track: "1",
    language: song.language || "",
    publisher: decodeEntities(song.label || ""),
    copyright: decodeEntities(song.copyright || ""),
    comment: song.url ? "Source: " + song.url : "",
    encoded_by: "SpotiFLAC JioSaavn extension"
  };
  if (!buildMetadataFile(metaPath, tags)) metaPath = "";

  // ---- 8. Mux everything together --------------------------------------
  var ok = muxTaggedFile(rawPath, coverPath, metaPath, finalPath);

  safeDelete(coverPath);
  safeDelete(metaPath);

  if (ok) {
    safeDelete(rawPath);
    return result;
  }

  // FFmpeg is unavailable or refused every variant. Re-download straight to
  // the final path so the user still gets a playable, untagged file.
  log.warn("[jiosaavn] tagging failed, saving untagged audio");
  safeDelete(rawPath);
  try {
    var plain = file.download(pick.url, finalPath, {
      headers: { "User-Agent": UA, Referer: "https://www.jiosaavn.com/" },
      onProgress: makeProgress(req.progress)
    });
    if (!plain || plain.success === false) {
      return {
        success: false,
        error: "Could not save the audio file",
        error_type: "download_error"
      };
    }
  } catch (e3) {
    return { success: false, error: String(e3), error_type: "download_error" };
  }

  return result;
}

// ============================================================================
// POST-PROCESSING
// ============================================================================

function postProcess(filePath, metadata, hookId) {
  if (hookId !== "convert_mp3") {
    return { success: true, new_file_path: filePath };
  }
  if (!filePath) {
    return { success: false, error: "No input file" };
  }

  var outputPath = stripExt(filePath) + ".mp3";

  // -map 0 keeps the attached cover art, -c:v copy leaves the JPEG alone.
  var res = runFfmpeg(
    "-y -i " + q(filePath) + " -map 0 -c:v copy -c:a libmp3lame -b:a 320k" +
    " -id3v2_version 3 -write_id3v1 1 " + q(outputPath)
  );

  if (!res || !res.success || !file.exists(outputPath)) {
    // Retry without the cover stream in case the build dislikes mjpeg in MP3.
    res = runFfmpeg(
      "-y -i " + q(filePath) + " -map 0:a -c:a libmp3lame -b:a 320k" +
      " -id3v2_version 3 -write_id3v1 1 " + q(outputPath)
    );
  }

  if (!res || !res.success || !file.exists(outputPath)) {
    return { success: false, error: "MP3 conversion failed: " + ((res && res.error) || "unknown") };
  }

  safeDelete(filePath);
  return { success: true, new_file_path: outputPath };
}

function postProcessV2(input, metadata, hookId) {
  var p = input && input.path ? input.path : "";
  if (!p) {
    return { success: false, error: "No local path available for post-processing" };
  }
  return postProcess(p, metadata, hookId);
}

// ============================================================================
// REGISTER
// ============================================================================

registerExtension({
  initialize: initialize,
  cleanup: cleanup,

  // metadata provider
  searchTracks: searchTracks,
  customSearch: customSearch,
  getTrack: getTrack,
  getAlbum: getAlbum,
  getPlaylist: getPlaylist,
  getArtist: getArtist,
  handleURL: handleURL,
  enrichTrack: enrichTrack,

  // download provider
  checkAvailability: checkAvailability,
  getDownloadUrl: getDownloadUrl,
  download: download,

  // post-processing
  postProcess: postProcess,
  postProcessV2: postProcessV2,

  // settings buttons
  testConnection: testConnection,
  clearCache: clearCache
});

console.log("JioSaavn extension loaded");
