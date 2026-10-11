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
    token = catalogReference(token);
    if (!token) return null;
    // Version 1.0.1 used catalog IDs; PR #36 used permalink tokens. Keep both.
    var byIdFirst = /^[A-Za-z0-9_-]{8}$/.test(token);
    for (var attempt = 0; attempt < 2; attempt++) {
        var byId = attempt === 0 ? byIdFirst : !byIdFirst;
        var result = byId
            ? callAPI('song.getDetails', { pids: token })
            : callAPI('webapi.get', { token: token, type: 'song', includeMetaTags: 0 });
        var songs = result && Array.isArray(result.songs) ? result.songs : [];
        for (var i = 0; i < songs.length; i++) {
            if (String(songs[i].id) === token || extractToken(songs[i].perma_url) === token) {
                return songs[i];
            }
        }
    }
    return null;
}
