function enc(v) {
    return encodeURIComponent(String(v == null ? "" : v));
}

function decodeEntities(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(x[0-9a-f]+|\d+);/gi, function (m, d) {
            var value = d.charAt(0).toLowerCase() === 'x' ? parseInt(d.slice(1), 16) : parseInt(d, 10);
            return value <= 0x10ffff ? String.fromCodePoint(value) : m;
        })
        .replace(/&amp;/g, '&').trim();
}

function extractToken(permaUrl) {
    if (!permaUrl) return null;
    var parts = String(permaUrl).split(/[?#]/)[0].replace(/\/+$/, '').split("/");
    return parts[parts.length - 1] || null;
}

function catalogReference(value) {
    value = String(value == null ? '' : value).trim();
    if (/^https?:\/\//i.test(value)) value = extractToken(value) || '';
    return /^[A-Za-z0-9_,.-]{1,128}$/.test(value) ? value : '';
}

function mediaUrl(value) {
    var url = String(value || '').trim().replace(/^http:/, 'https:');
    return /^https:\/\/aac\.saavncdn\.com\//i.test(url) ? url : '';
}

function recordingIsrc(value) {
    var isrc = String(value || '').toUpperCase().replace(/[\s-]/g, '');
    return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc) ? isrc : '';
}

function getHighResImageUrl(url) {
    if (!url) return '';
    return String(url).replace(/^http:/, 'https:').replace(/(?:50|150)x(?:50|150)(\.[a-z]+)(?=[?#]|$)/i, '500x500$1');
}

function extractArtistNames(item) {
    if (!item) return '';
    var moreInfo = item.more_info || {};
    var artistMap = moreInfo.artistMap || {};
    var artists = (artistMap.primary_artists || []).concat(artistMap.featured_artists || []);
    var names = artists.map(function(artist) { return decodeEntities(artist.name); })
        .filter(function(name, index, values) { return name && values.indexOf(name) === index; });
    return names.join(', ') || decodeEntities(item.primary_artists || moreInfo.primary_artists ||
        String(item.subtitle || '').split(' - ')[0]);
}

function positiveInt(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function formatSong(song, album, index) {
    if (!song) return null;
    var token = extractToken(song.perma_url);
    var id = String(song.id || token || '');
    if (!id) return null;

    // log.debug("[formatSong] token: " + token);

    var more = song.more_info || {};
    var duration = Number(more.duration || song.duration || 0);

    var decryptedFull = decryptMediaUrl(more.encrypted_media_url);

    // Album artist
    var artistMap = more.artistMap || {};
    var primaryArtists = artistMap.primary_artists || [];
    var primary = primaryArtists[0] || {};
    var albumArtist = (album && album.artists) || primaryArtists.map(function(artist) {
        return decodeEntities(artist.name);
    }).filter(Boolean).join(', ') || extractArtistNames(song);
    var composers = (artistMap.artists || []).filter(function(artist) {
        return /^(music|composer)$/i.test(artist.role || '');
    }).map(function(artist) { return decodeEntities(artist.name); })
        .filter(function(name, position, values) { return name && values.indexOf(name) === position; });
    var trackNumber = positiveInt(more.track_number || song.track_number) ||
        (typeof index === 'number' ? index + 1 : 0);

    var formatted = {
        id: id,
        name: decodeEntities(song.title || song.song || ""),
        artists: extractArtistNames(song),
        album_name: decodeEntities(more.album || song.album || album && album.name || ""),
        album_id: String(more.album_id || song.albumid || album && album.id || extractToken(more.album_url) || ''),
        album_url: String(more.album_url || song.album_url || album && album.url || ''),
        album_artist: decodeEntities(albumArtist),
        artist_id: String(primary.id || String(song.primary_artists_id || '').split(',')[0] || ''),
        artist_url: String(primary.perma_url || ''),
        duration_ms: Number.isFinite(duration) ? Math.max(0, Math.round(duration * 1000)) : 0,
        cover_url: getHighResImageUrl(song.image || album && album.cover_url) || "",
        external_urls: String(song.perma_url || ''),
        preview_url: decryptedFull, // can play song for small duration
        release_date: String(more.release_date || song.release_date || song.year || album && album.release_date || ''),
        track_number: trackNumber,
        total_tracks: positiveInt(more.total_tracks || song.total_tracks || album && album.total_tracks),
        disc_number: positiveInt(more.disc_number || song.disc_number) || 1,
        total_discs: positiveInt(more.total_discs || song.total_discs),
        composer: composers.join(', ') || decodeEntities(more.music || song.music || ""),
        isrc: recordingIsrc(more.isrc || song.isrc),
        audio_quality: "AAC",
        item_type: "track",
        provider_id: EXT_ID,

        genre: decodeEntities(more.genre || song.genre || ""),
        label: decodeEntities(more.label || ""),
        copyright: decodeEntities(more.copyright_text || ""),
        explicit: song.explicit_content === '1' || song.explicit_content === 1 || song.explicit_content === true
    };

    return formatted;
}

// ----- Unified collection formatter ---------------------------------
function formatCollection(item, type, isDetail) {
    if (!item) {
        log.debug("[formatCollection] item is null/undefined");
        return null;
    }
    var token = String(item.id || item.albumid || extractToken(item.perma_url) || '');
    if (!token) {
        log.debug("[formatCollection] Failed to extract token for", type);
        return null;
    }
    // log.debug("[formatCollection] token: " + token + ", type: " + type + ", isDetail: " + isDetail);

    var songs = Array.isArray(item.list) ? item.list : Array.isArray(item.songs) ? item.songs : [];
    var more = item.more_info || {};
    var total = positiveInt(item.song_count || more.song_count || more.songs_count || item.list_count) || songs.length;

    var result = {
        id: token,
        name: decodeEntities(item.title || ""),
        cover_url: getHighResImageUrl(item.image) || "",
        total_tracks: total,
        item_type: type,
        url: String(item.perma_url || ''),
        provider_id: EXT_ID
    };

    if (type === 'album') {
        result.artists = extractArtistNames(item);
        result.artist_id = String((more.artistMap && more.artistMap.primary_artists && more.artistMap.primary_artists[0] || {}).id || '');
        result.album_type = item.type || "album";
        result.release_date = String(more.release_date || item.release_date || item.year || '');
    } else {
        result.album_type = "playlist";
    }

    if (isDetail) {
        result.tracks = songs.map(function(song, index) {
            // Playlist position is not an album track number or track total.
            return formatSong(song, type === 'album' ? result : null, type === 'album' ? index : undefined);
        }).filter(function(t) { return t !== null; });
        if (type === 'playlist') result.total_tracks = result.tracks.length;
        log.debug("[formatCollection] Mapped " + result.tracks.length + " tracks for " + type);
    }

    return result;
}

// Artist formatting helpers
function processArtistSongs(songs) {
    if (!songs || !songs.length) return [];
    return songs.map(function(song) {
        return formatSong(song);
    }).filter(function(t) { return t !== null; });
}

function processArtistAlbums(albums) {
    if (!albums || !albums.length) return [];
    return albums.map(function(album) {
        return formatCollection(album, 'album');
    }).filter(function(a) { return a !== null; });
}

function processArtistSingles(singles, result) {
    if (!singles || !singles.length) return;
    // log.debug("[formatArtist] Found " + singles.length + " single(s)");
    for (var i = 0; i < singles.length; i++) {
        var single = singles[i];
        var formatted = formatCollection(single, 'album');
        if (formatted) {
            formatted.album_type = 'single';
            result.albums.push(formatted);
            // log.debug("[formatArtist] Added single: " + formatted.name);
        }
    }
}

function processCompilations(playlists, result) {
    if (!playlists || !playlists.length) return;
    // log.debug("[formatArtist] Found " + playlists.length + " playlist(s)");
    for (var i = 0; i < playlists.length; i++) {
        var playlist = playlists[i];
        var compilation = formatCollection(playlist, 'playlist');
        if (compilation) {
            // log.debug("[formatArtist] Added compilation: " + compilation.name);
            compilation.id = "playlist_" + compilation.id;
            compilation.item_type = 'album';
            compilation.album_type = 'compilation';
            result.albums.push(compilation);
        }
    }
}

// ----- Main formatArtist (orchestrator) ------------------------
function formatArtist(artist, isDetail) {
    if (!artist) {
        log.debug("[formatArtist] artist is null/undefined");
        return null;
    }

    // Extract token – use overview URL for detail, perma_url for search
    var token = String(artist.artistId || artist.id || extractToken(artist.urls && artist.urls.overview || artist.perma_url) || '');
    if (!token) {
        log.debug("[formatArtist] Failed to extract token");
        return null;
    }

    var result = {
        id: token,
        name: decodeEntities(artist.title || artist.name || ""),
        cover_url: getHighResImageUrl(artist.image) || "",
        image_url: getHighResImageUrl(artist.image) || "",
        item_type: "artist",
        provider_id: EXT_ID
    };

    if (isDetail) {
        result.listeners = positiveInt(String(artist.fan_count || '').replace(/,/g, ''));
        result.image_url = getHighResImageUrl(artist.image) || "";
        result.top_tracks = processArtistSongs(artist.topSongs || []);
        result.albums = processArtistAlbums(artist.topAlbums || []);
        processArtistSingles(artist.singles || [], result);
        processCompilations(artist.dedicated_artist_playlist || [], result);
        processCompilations(artist.featured_artist_playlist || [], result);

        log.debug("[formatArtist] Mapped " + result.top_tracks.length + " top tracks and " + result.albums.length + " albums (including singles and compilations)");
    }

    return result;
}

// ----- Home feed item formatter --------------------------------
function formatHomeFeedItem(item, type) {
    if (!item) {
        log.debug("[formatHomeFeedItem] item is null/undefined");
        return null;
    }

    // Determine type from context or item.type
    var itemType = mapRawType(type || item.type);
    if (['track', 'album', 'playlist', 'artist'].indexOf(itemType) === -1) return null;
    var id = String(item.artistId || item.id || extractToken(item.perma_url) || '');
    if (!id) return null;

    var result = {
        id: id,
        type: itemType,
        name: decodeEntities(item.title || item.name || ''),
        cover_url: getHighResImageUrl(item.image) || '',
        provider_id: EXT_ID
    };

    // For tracks, include album info for "Go to Album"
    if (itemType === 'track') {
        var more = item.more_info || {};
        result.album_id = String(more.album_id || extractToken(more.album_url) || '');
        result.album_name = decodeEntities(more.album || item.album || '');
        result.duration_ms = positiveInt(Number(more.duration || item.duration || 0) * 1000);
    }

    if (itemType !== 'playlist') {
        result.artists = extractArtistNames(item);
    }

    // log.debug("[formatHomeFeedItem] Formatted " + itemType + ": " + result.name);
    return result;
}

// ----- Search item formatter (for autocomplete.get results) -----
function formatSearchItem(raw, type) {
    if (!raw) return null;

    var id;

    id = String(raw.artistId || raw.id || extractToken(raw.perma_url) || '');

    if (!id) return null;

    var artists = '';
    var more = raw.more_info || {};
    if (type === 'track') {
        artists = decodeEntities(more.primary_artists || more.singers || raw.subtitle || '');
    } else if (type === 'album') {
        artists = decodeEntities(more.music || raw.subtitle || '');
    }

    var item = {
        id: id,
        name: decodeEntities(raw.title || ""),
        artists: artists,
        cover_url: getHighResImageUrl(raw.image) || "",
        item_type: type,
        provider_id: EXT_ID
    };

    if (type === 'track') {
        if (more.album_id) {
            item.album_id = String(more.album_id);
        }
        if (more.album) {
            item.album_name = decodeEntities(more.album);
        }
    }

    return item;
}
