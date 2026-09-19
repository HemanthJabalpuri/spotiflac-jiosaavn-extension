function searchCollections(type, query, limit, page) {
    // log.debug('[searchCollections] type: ' + type + ', query: ' + query + ', limit: ' + limit + ', page: ' + page);
    var call = type === 'album' ? 'search.getAlbumResults' : 'search.getPlaylistResults';
    var result = callAPI(call, {
        q: query,
        p: page || 1,
        n: limit || 20
    });
    if (!result) log.debug('[searchCollections] No results for ' + type);
    return result;
}

function getCollection(type, token) {
    // log.debug('[getCollection] type: ' + type + ', token: ' + token);
    var extra = { token: token, type: type, includeMetaTags: 0 };
    if (type === 'playlist') {
        extra.p = 1;
        extra.n = 100;
        log.debug('[getCollection] Playlist – fetching up to 100 tracks');
    }
    var result = callAPI('webapi.get', extra);
    if (!result) {
        log.debug('[getCollection] No ' + type + ' found for token: ' + token);
        return null;
    }
    log.debug('[getCollection] Found ' + type + ': ' + (result.title || 'untitled'));
    return result;
}
