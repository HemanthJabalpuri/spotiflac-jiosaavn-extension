var EXT_ID = "saavnsongs";

var API_HOST = 'https://www.jiosaavn.com';
var API_BASE = API_HOST + '/api.php';
var REFERER = API_HOST + '/';

var UA = 'Mozilla/5.0';
var COOKIE_BASE = 'DL=english; geo=19.0760%2C72.8777%2CIN%2CMaharashtra%2CMumbai%2C400001';

// Default headers for all requests
var DEFAULT_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': REFERER,
    'User-Agent': UA,
};

// Common API parameters (overridden per call)
var API_DEFAULTS = {
    _format: 'json',
    _marker: 0,
    api_version: 4,
    ctx: 'web6dot0'
};
