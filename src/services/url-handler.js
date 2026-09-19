// ----- URL type detection -----
function getUrlType(url) {
    if (url.indexOf('/song/') >= 0) return 'song';
    if (url.indexOf('/album/') >= 0) return 'album';
    if (url.indexOf('/playlist/') >= 0 || url.indexOf('/featured/') >= 0) return 'playlist';
    if (url.indexOf('/artist/') >= 0) return 'artist';
    return null;
}

// ----- Handlers (now called with token) -----
function handleSongUrl(token) {
    var track = getSongService(token);
    if (!track) return null;
    return {
        success: true,
        type: "track",
        track: track
    };
}

function handleAlbumUrl(token) {
    var album = getCollectionService('album', token);
    if (!album) return null;
    return {
        success: true,
        type: "album",
        album: album,
        name: album.name,
        tracks: album.tracks,
        cover_url: album.cover_url
    };
}

function handlePlaylistUrl(token) {
    var playlist = getCollectionService('playlist', token);
    if (!playlist) return null;
    return {
        success: true,
        type: "playlist",
        playlist: playlist,
        name: playlist.name,
        tracks: playlist.tracks,
        cover_url: playlist.cover_url
    };
}

function handleArtistUrl(token) {
    var artist = getArtistService(token);
    if (!artist) return null;
    return {
        success: true,
        type: "artist",
        artist: artist,
        image_url: artist.image_url
    };
}

function handleUrl(url) {
    log.info("[handleURL] Called with URL: " + url);
    if (!url) return { success: false, error: "Empty URL" };

    // Detect URL type first (no API calls)
    var type = getUrlType(url);
    if (!type) {
        log.info("[handleURL] Not a JioSaavn link: ");
        return { success: false, error: "Not a JioSaavn song, album, playlist, or artist link" };
    }

    // Extract token
    var token = extractToken(url);
    if (!token) {
        return { success: false, error: "Invalid URL – could not extract token" };
    }

    // Dispatch to the correct handler based on type
    var result = null;
    switch (type) {
        case 'song': result = handleSongUrl(token); break;
        case 'album': result = handleAlbumUrl(token); break;
        case 'playlist': result = handlePlaylistUrl(token); break;
        case 'artist': result = handleArtistUrl(token); break;
        default: break;
    }

    if (result) {
        return result;
    }

    return { success: false, error: "Could not resolve the URL" };
}
