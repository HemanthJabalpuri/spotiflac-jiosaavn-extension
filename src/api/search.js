function searchAll(query) {
    log.debug('[searchAll] Query: ' + query);
    var result = callAPI('autocomplete.get', { query: query });
    if (!result) {
        log.debug('[searchAll] No results');
        return null;
    }
    return result;
}
