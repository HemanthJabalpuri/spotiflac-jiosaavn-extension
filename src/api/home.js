function getLaunchData() {
    log.debug('[getLaunchData] Fetching home feed data');
    var result = callAPI('webapi.getLaunchData');
    if (!result) {
        log.debug('[getLaunchData] No launch data received');
        return null;
    }
    log.debug('[getLaunchData] Received launch data with modules: ' + Object.keys(result.modules || {}).join(', '));
    return result;
}
