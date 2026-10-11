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

function getAlbumById(albumId) {
    log.debug('[getAlbumById] albumId: ' + albumId);
    var result = callAPI('content.getAlbumDetails', { albumid: albumId });
    if (!result) {
        log.debug('[getAlbumById] No album found for id: ' + albumId);
        return null;
    }
    return result;
}

function getCollection(type, token) {
    // log.debug('[getCollection] type: ' + type + ', token: ' + token);

    // Album ID prefix detected
    token = catalogReference(token);
    if (!token) return null;
    var id = token.replace(/^(albumid_|playlist_)/, '');
    if (type === 'album' && /^\d+$/.test(id)) {
        return getAlbumById(id);
    }

    // Playlist or album token path
    var extra = { token: token, type: type, includeMetaTags: 0 };
    if (type === 'playlist') {
        extra.p = 1;
        extra.n = 100;
        log.debug('[getCollection] Playlist – fetching up to 100 tracks');
    }
    var byId = type === 'playlist' && /^\d+$/.test(id);
    var result = byId
        ? callAPI('playlist.getDetails', { listid: id, p: 1, n: 100 })
        : callAPI('webapi.get', extra);
    if (!result) {
        log.debug('[getCollection] No ' + type + ' found for token: ' + token);
        return null;
    }
    if (type === 'playlist' && Array.isArray(result.list)) {
        var rows = result.list.slice();
        var seen = {};
        rows.forEach(function(row) { seen[String(row.id)] = true; });
        var batchSize = rows.length;
        for (var page = 2; batchSize >= 100; page++) {
            if (page > 100) throw new Error('JioSaavn playlist exceeds the paging limit');
            var next = byId
                ? callAPI('playlist.getDetails', { listid: id, p: page, n: 100 })
                : callAPI('webapi.get', { token: token, type: type, includeMetaTags: 0, p: page, n: 100 });
            if (!next || !Array.isArray(next.list)) throw new Error('Could not load JioSaavn playlist page ' + page);
            batchSize = next.list.length;
            var added = 0;
            next.list.forEach(function(row) {
                if (!seen[String(row.id)]) {
                    seen[String(row.id)] = true;
                    rows.push(row);
                    added++;
                }
            });
            if (batchSize && !added) throw new Error('JioSaavn returned a repeated playlist page');
        }
        result.list = rows;
    }
    log.debug('[getCollection] Found ' + type + ': ' + (result.title || 'untitled'));
    return result;
}
