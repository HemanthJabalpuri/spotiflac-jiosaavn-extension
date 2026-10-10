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

    // "all" or no filter – use autocomplete.get
    log.debug('[customSearch] Filter: all – using autocomplete.get');
    var data = searchAll(query);
    if (!data) return [];

    var results = [];
    results = results.concat(parseSearchSection(data.songs, 'track'));
    results = results.concat(parseSearchSection(data.albums, 'album'));
    results = results.concat(parseSearchSection(data.playlists, 'playlist'));
    results = results.concat(parseSearchSection(data.artists, 'artist'));

    log.debug('[customSearch] Returning ' + results.length + ' total items');
    return results;
}

// ----- Helper: parse a section from autocomplete response -----
function parseSearchSection(section, type) {
    if (!section || !section.data || !section.data.length) return [];
    var out = [];
    for (var i = 0; i < section.data.length; i++) {
        var item = formatSearchItem(section.data[i], type);
        if (item) out.push(item);
    }
    return out;
}
