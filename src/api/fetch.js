// ----- Low-level fetch (returns null on failure) -----
function fetchAPI(url, options) {
    options = options || {};
    var headers = options.headers || {};

    // Build dynamic cookie
    var lang = storage.get("lang") || 'english';
    var cookie = COOKIE_BASE + '; L=' + lang;

    // Add cookie to headers
    headers['Cookie'] = cookie;

    var response;
    // log.debug('[fetchAPI] Request URL: ' + url);

    response = http.get(url, headers);
    if (!response) {
        log.debug('[fetchAPI] No response from server');
        return null;
    }
    // log.debug('[fetchAPI] Status: ' + response.statusCode + ', OK: ' + response.ok);
    if (!response.ok) {
        log.debug('[fetchAPI] Response body: ' + (response.body || '').substring(0, 200));
        return null;
    }

    try {
        var parsed = JSON.parse(response.body);
        // log.debug('[fetchAPI] Parsed JSON successfully (keys: ' + Object.keys(parsed).join(', ') + ')');
        return parsed;
    } catch (e) {
        log.debug('[fetchAPI] JSON parse error: ' + e.message);
        log.debug('[fetchAPI] Raw body: ' + (response.body || '').substring(0, 200));
        return null;
    }
}

// ----- API call builder -----
function callAPI(call, extraParams) {
    // Start with defaults
    var params = { __call: call };
    for (var key in API_DEFAULTS) {
        params[key] = API_DEFAULTS[key];
    }
    if (extraParams) {
        for (var key in extraParams) {
            params[key] = extraParams[key];
        }
    }

    // Build query string
    var qParts = [];
    for (var key in params) {
        qParts.push(enc(key) + '=' + enc(params[key]));
    }
    var endpoint = '?' + qParts.join('&');
    var url = API_BASE + endpoint;
    log.debug('[callAPI] Call: ' + call + ', URL: ' + url);

    // Pass DEFAULT_HEADERS (without Cookie) – fetchAPI will add it dynamically
    var result = fetchAPI(url, { headers: DEFAULT_HEADERS });
    if (!result) {
        log.debug('[callAPI] fetchAPI returned null for ' + call);
    }

    log.debug('[callAPI] fetchAPI succeeded for ' + call);
    return result;
}
