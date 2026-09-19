// ============================================================
// Register extension with SpotiFLAC
// ============================================================

registerExtension({
    initialize: initialize,
    cleanup: cleanup,
    forceCleanup: forceCleanup,
    searchTracks: searchSongsService,
    customSearch: customSearch,
    getTrack: getSongService,

    // ----- Collection detection: album or playlist? -----
    getAlbum: function(token) {
        if (isPlaylistToken(token)) {
            log.debug('[getAlbum] Token "' + token + '" is a known playlist – routing to getPlaylist');
            return getCollectionService('playlist', token);
        }
        log.debug('[getAlbum] Token "' + token + '" treated as album');
        return getCollectionService('album', token);
    },

    getPlaylist: function(token) {
        return getCollectionService('playlist', token);
    },

    getArtist: getArtistService,
    getHomeFeed: getHomeFeed,
    enrichTrack: enrichTrack,
    checkAvailability: checkAvailability,
    getDownloadUrl: getDownloadUrl,
    download: download,
    handleUrl: handleUrl // note that handleUrl is "rl" in lowercase as opposed to the official docs
});

log.debug("JioSaavn Songs extension loaded");
