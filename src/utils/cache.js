var TRACKING_KEY = "__cache_keys";

function getCache(key) {
    try {
        return storage.get(key);
    } catch (e) {
        log.debug("getCache error:", e.message);
        return null;
    }
}

function setCache(key, value) {
    try {
        storage.set(key, value);
        // Track the key
        var list = getCache(TRACKING_KEY);
        var keys = list ? JSON.parse(list) : [];
        if (keys.indexOf(key) === -1) {
            keys.push(key);
            storage.set(TRACKING_KEY, JSON.stringify(keys));
        }
        // log.debug("setCache: stored", key);
    } catch (e) {
        log.debug("setCache error:", e.message);
    }
}

function removeCache(key) {
    try {
        storage.remove(key);
        // Remove from tracking list
        var list = getCache(TRACKING_KEY);
        if (list) {
            var keys = JSON.parse(list);
            var idx = keys.indexOf(key);
            if (idx !== -1) {
                keys.splice(idx, 1);
                storage.set(TRACKING_KEY, JSON.stringify(keys));
            }
        }
        log.debug("removeCache: removed", key);
    } catch (e) {
        log.debug("removeCache error:", e.message);
    }
}

function clearCache() {
    try {
        var list = getCache(TRACKING_KEY);
        if (list) {
            var keys = JSON.parse(list);
            for (var i = 0; i < keys.length; i++) {
                storage.remove(keys[i]);
            }
            storage.remove(TRACKING_KEY);
            log.debug("clearCache: removed", keys.length, "keys");
        } else {
            log.debug("clearCache: no keys to clear");
        }
    } catch (e) {
        log.debug("clearCache error:", e.message);
    }
}

function cleanup(force) {
    try {
        var now = Date.now();
        var last = getCache("last_cleanup");
        var lastTime = last ? parseInt(last, 10) : 0;
        var age = now - lastTime;
        var threshold = 24 * 60 * 60 * 1000; // 24 hours

        if (force || lastTime === 0 || age > threshold) {
            clearCache();
            setCache("last_cleanup", String(now));
            var msg = force ? "forced" : ("last cleanup was " + (lastTime ? Math.round(age / 60000) : "never") + " min ago");
            log.info("[Extension] Cleanup: storage cache cleared (" + msg + ")");
             return { success: true, message: "Cache cleared!" };
        } else {
            var remaining = threshold - age;
            var remainingMinutes = Math.ceil(remaining / 60000);
            log.debug("[Extension] Cleanup skipped – next cleanup in " + remainingMinutes + " minute(s)");
            return false;
        }
    } catch (e) {
        log.error("[Extension] Cleanup error: " + e.message);
        return false;
    }
}

function initialize(config) {
    settings = config || {};
    log.info("Extension initialized with settings:", settings.lang);

    storage.set("lang", settings.lang);
    // Run cleanup on init
    cleanup();
    return true;
}

function forceCleanup() {
    log.debug("clearCache: force clearing the cache");
    cleanup(true);
    return { success: true, message: "Cache cleared!" };
}

// ----- Playlist token registry ---------------------------------
function addPlaylistToken(token) {
    if (!token) return;
    try {
        var list = getCache("playlist_tokens");
        var tokens = list ? JSON.parse(list) : [];
        if (tokens.indexOf(token) === -1) {
            tokens.push(token);
            setCache("playlist_tokens", JSON.stringify(tokens));
            // log.debug("[addPlaylistToken] Added token: " + token);
        }
    } catch (e) {
        log.debug("[addPlaylistToken] error: " + e.message);
    }
}

function isPlaylistToken(token) {
    if (!token) return false;
    try {
        var list = getCache("playlist_tokens");
        if (!list) return false;
        var tokens = JSON.parse(list);
        return tokens.indexOf(token) !== -1;
    } catch (e) {
        log.debug("[isPlaylistToken] error: " + e.message);
        return false;
    }
}
