function searchSongs(query, limit, page) {
    log.debug('[searchSongs] Query: ' + query + ', limit: ' + limit + ', page: ' + page);
    var result = callAPI('search.getResults', {
        q: query,
        p: page || 1,
        n: limit || 20
    });
    if (!result) log.debug('[searchSongs] No results');
    return result;
}

function getSong(token) {
    log.debug('[getSong] Token: ' + token);
    var result = callAPI('webapi.get', {
        token: token,
        type: 'song',
        includeMetaTags: 0
    });
    if (!result || !result.songs || !result.songs.length) {
        log.debug('[getSong] No song found for token: ' + token);
        return null;
    }
    log.debug('[getSong] Found song: ' + (result.songs[0].title || 'untitled'));
    return result.songs[0];
}
