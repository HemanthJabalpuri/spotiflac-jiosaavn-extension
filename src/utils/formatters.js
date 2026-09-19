function enc(v) {
    return encodeURIComponent(String(v == null ? "" : v));
}

function decodeEntities(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); });
}

function extractToken(permaUrl) {
    if (!permaUrl) return null;
    var parts = permaUrl.split("/");
    return parts[parts.length - 1] || null;
}

function getHighResImageUrl(url) {
    if (!url) return '';
    return url.replace(/\d+x\d+\.jpg$/, '500x500.jpg');
}

function extractArtistNames(item) {
    if (!item) return '';

    // 1. Try subtitle (Artist1, Artist2 - AlbumName)
    var subtitle = item.subtitle || '';
    if (subtitle) {
        var parts = subtitle.split(' - ');
        var artistPart = parts[0].trim();
        if (artistPart) {
            return decodeEntities(artistPart);
        }
        if (subtitle.indexOf(',') >= 0) {
            return decodeEntities(subtitle.trim());
        }
    }

    // 2. Try more_info.artistMap
    var moreInfo = item.more_info || {};
    var artistMap = moreInfo.artistMap || {};
    var result = '';

    var primaryArtists = artistMap.primary_artists || [];
    if (primaryArtists.length) {
        var names = primaryArtists.map(function(a) {
            return decodeEntities(a.name || '');
        }).filter(function(n) { return n.length > 0; });
        if (names.length) {
            result = names.join(', ');
        }
    }

    if (!result) {
        var artists = artistMap.artists || [];
        if (artists.length) {
            var names = artists.map(function(a) {
                return decodeEntities(a.name || '');
            }).filter(function(n) { return n.length > 0; });
            if (names.length) {
                result = names.join(', ');
            }
        }
    }

    // Skip "Various Artists"
    if (result && result.trim().toLowerCase() === 'various artists') {
        return '';
    }

    return result || '';
}

function formatSong(song) {
    if (!song) return null;
    var token = extractToken(song.perma_url);
    if (!token) return null;

    // log.debug("[formatSong] token: " + token);

    var more = song.more_info || {};
    var duration = parseInt(more.duration, 10) || 0;

    var decryptedFull = decryptMediaUrl(more.encrypted_media_url);
    try {
        setCache("url_" + token, decryptedFull);
    } catch (e) {
        log.debug('[formatSong] Failed to store decrypted URL in storage');
    }

    // Album artist
    var primaryArtists = (more.artistMap && more.artistMap.primary_artists) || [];
    var albumArtist = primaryArtists.length ? primaryArtists[0].name : (song.subtitle ? song.subtitle.split("-")[0].trim() : "");

    var formatted = {
        id: token,
        name: decodeEntities(song.title || ""),
        artists: extractArtistNames(song),
        album_name: decodeEntities(more.album || ""),
        album_id: extractToken(more.album_url), // used by "Go to Album" -> getAlbum()
        album_artist: decodeEntities(albumArtist),
        duration_ms: duration * 1000,
        cover_url: getHighResImageUrl(song.image) || "",
        preview_url: decryptedFull, // can play song for small duration
        release_date: song.year || "",
        composer: decodeEntities(more.music || ""),
        isrc: token, // fake ISRC
        audio_quality: "AAC",
        item_type: "track",
        provider_id: EXT_ID,

        // Note: below one's seems not embedded in result file, if we download from album page
        // so, download the song from search result
        genre: song.language || "", // use language as genre fallback
        label: decodeEntities(more.label || ""),
        copyright: decodeEntities(more.copyright_text || ""),
        explicit: song.explicit_content === "1"
    };
    
    return formatted;
}

// ----- Unified collection formatter ---------------------------------
function formatCollection(item, type, isDetail) {
    if (!item) {
        log.debug("[formatCollection] item is null/undefined");
        return null;
    }
    var token = extractToken(item.perma_url);
    if (!token) {
        log.debug("[formatCollection] Failed to extract token for", type);
        return null;
    }
    // log.debug("[formatCollection] token: " + token + ", type: " + type + ", isDetail: " + isDetail);

    var songs = item.list || [];
    var total = parseInt(item.song_count || item.more_info?.songs_count, 10) || songs.length || 0;

    var result = {
        id: token,
        name: decodeEntities(item.title || ""),
        cover_url: getHighResImageUrl(item.image) || "",
        total_tracks: total,
        item_type: type,
        provider_id: EXT_ID
    };

    if (type === 'album') {
        result.artists = extractArtistNames(item);
        result.album_type = item.type || "album";
        result.release_date = item.year ? String(item.year) : "";
    } else {
        result.album_type = "playlist";
    }

    if (isDetail) {
        result.tracks = songs.map(function(song) {
            return formatSong(song);
        }).filter(function(t) { return t !== null; });
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
            compilation.item_type = 'album';
            compilation.album_type = 'compilation';
            addPlaylistToken(compilation.id);
            result.albums.push(compilation);
            // log.debug("[formatArtist] Added compilation: " + compilation.name);
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
    var token = isDetail ? extractToken(artist.urls?.overview) : extractToken(artist.perma_url);
    if (!token) {
        log.debug("[formatArtist] Failed to extract token");
        return null;
    }

    var result = {
        id: token,
        name: decodeEntities(artist.title || artist.name || ""),
        cover_url: getHighResImageUrl(artist.image) || "",
        item_type: "artist",
        provider_id: EXT_ID
    };

    if (isDetail) {
        result.listeners = artist.fan_count || "";
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
    var itemType = item.type;

    var result = {
        id: extractToken(item.perma_url),
        type: itemType,
        name: decodeEntities(item.title || item.name || ''),
        cover_url: getHighResImageUrl(item.image) || '',
        provider_id: EXT_ID
    };

    // For tracks, include album info for "Go to Album"
    if (itemType === 'song' && item.album) {
        result.album_id = extractToken(iteam.more_info.album_url);
        result.album_name = decodeEntities(item.album || '');
    }

    if (itemType !== 'playlist') {
        result.artists = extractArtistNames(item);
    }

    // log.debug("[formatHomeFeedItem] Formatted " + itemType + ": " + result.name);
    return result;
}
