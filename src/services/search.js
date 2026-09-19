function customSearch(query, options) {
    log.debug('[customSearch] Query: ' + query + ', options: ' + JSON.stringify(options));

    var filter = (options && options.filter) || null;
    var limit = (options && options.limit) || 20; // default to 20 if not provided

    // Filtered mode – use the provided limit
    if (filter === 'tracks') {
        log.debug('[customSearch] Filter: tracks, limit: ' + limit);
        return searchSongsService(query, limit);
    }
    if (filter === 'albums') {
        log.debug('[customSearch] Filter: albums, limit: ' + limit);
        return searchCollectionsService('album', query, limit);
    }
    if (filter === 'playlists') {
        log.debug('[customSearch] Filter: playlists, limit: ' + limit);
        return searchCollectionsService('playlist', query, limit);
    }
    // Note: 'artist' is used when we click on artist name in a song card
    if (filter === 'artist' || filter === 'artists') {
        log.debug('[customSearch] Filter: artists, limit: ' + limit);
        return searchArtistsService(query, limit);
    }

    // "All" mode – use a small limit (2) per type to keep combined results manageable
    var smallLimit = 2;
    log.debug('[customSearch] No filter or "all" – combining all types with limit per type: ' + smallLimit);
    var tracks = searchSongsService(query, smallLimit);
    var albums = searchCollectionsService('album', query, smallLimit);
    var playlists = searchCollectionsService('playlist', query, smallLimit);
    var artists = searchArtistsService(query, smallLimit);
    var combined = tracks.concat(albums).concat(playlists).concat(artists);
    log.debug('[customSearch] Returning ' + combined.length + ' items (tracks: ' + tracks.length + ', albums: ' + albums.length + ', playlists: ' + playlists.length + ', artists: ' + artists.length + ')');
    return combined;
}
