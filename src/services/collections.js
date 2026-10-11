function searchCollectionsService(type, query, limit) {
    log.debug('[searchCollectionsService] type: ' + type + ', query: ' + query + ', limit: ' + limit);
    var data = searchCollections(type, query, limit);
    if (!data || !data.results) {
        log.debug('[searchCollectionsService] No results for ' + type);
        return [];
    }
    var filtered = data.results.filter(function(item) {
        return item.type === type;
    });
    var out = filtered.map(function(item) {
        return formatCollection(item, type, false);
    }).filter(function(item) { return item && item.id; });
    log.debug('[searchCollectionsService] Returning ' + out.length + ' ' + type + '(s)');
    return out;
}

function getCollectionService(type, token) {
    log.debug('[getCollectionService] type: ' + type + ', token: ' + token);

    // Album ID prefix detected
    if (type === 'album' && token && token.indexOf('albumid_') === 0) {
        var albumId = token.substring('albumid_'.length);
        var raw = getAlbumById(albumId);
    } else {
        var raw = getCollectionByToken(type, token);
    }

    if (!raw) {
        log.debug('[getCollectionService] No raw data for ' + type);
        return null;
    }
    var formatted = formatCollection(raw, type, true);
    log.debug('[getCollectionService] Formatted ' + type + ': ' + (formatted ? formatted.name : 'null'));
    return formatted;
}
