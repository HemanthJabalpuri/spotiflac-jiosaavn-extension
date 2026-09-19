function enrichTrack(track) {
    log.debug('[enrichTrack] Skipping enrich since track already have the metadata');
    return track;
}

// ----- Quality mapping -----------------------------------------
function getBitrate(qualityId) {
    var map = { "AAC_12": "12", "AAC_48": "48", "AAC_96": "96", "AAC_160": "160", "AAC_320": "320" };
    var bitrate = map[qualityId] || "96";
    log.debug('[getBitrate] qualityId: ' + qualityId + ' → bitrate: ' + bitrate);
    return bitrate;
}

function getDownloadUrl(token, quality) {
    log.debug('[getDownloadUrl] Token: ' + token + ', quality: ' + quality);
    // Check cache – no API call
    var baseUrl = null;
    try {
        baseUrl = getCache("url_" + token);
    } catch (e) {}
    if (!baseUrl) {
        return { success: false, error: "No decrypted URL available", error_type: "stream_error" };
    }
    var bitrate = getBitrate(quality);
    var finalUrl = baseUrl.replace(/_(\d+)\.mp4/, '_' + bitrate + '.mp4');
    log.debug('[getDownloadUrl] Final URL: ' + finalUrl);
    return {
        success: true,
        url: finalUrl,
        format: "m4a",
        quality: bitrate + "kbps",
        bit_depth: 16,
        sample_rate: 44100
    };
}

function download(token, quality, outputPath, onProgress) {
    log.debug('[download] Starting download for token: ' + token + ', quality: ' + quality);

    // Get the stream URL (reuse getDownloadUrl)
    var streamInfo = getDownloadUrl(token, quality);
    if (!streamInfo.success) {
        return streamInfo; // forward the error
    }
    var plainUrl = streamInfo.url;

    // Require outputPath – if missing, log and exit
    if (!outputPath) {
        log.debug('[download] outputPath missing, cannot download');
        return { success: false, error: "Output path not provided", error_type: "invalid_path" };
    }

    // Download the file
    var dl = file.download(plainUrl, outputPath, {
        headers: { "User-Agent": UA, "Referer": REFERER },
        onProgress: onProgress ? function(r, t) { onProgress(t > 0 ? r / t : 0); } : undefined
    });
    if (!dl || dl.success === false) {
        return { success: false, error: "Download failed", error_type: "download_error" };
    }

    return {
        success: true,
        file_path: outputPath,
        format: "m4a",
        actual_bit_depth: 16,
        actual_sample_rate: 44100,
        comment: "Token: " + token
    };
}

function checkAvailability(isrc, trackName, artistName) {
    var token = isrc; // in formatSong, we are using token as ISRC
    log.debug('[checkAvailability] Token: ' + token);
    // Use cache – no API call
    var baseUrl = null;
    try {
        baseUrl = getCache("url_" + token);
    } catch (e) {}
    if (baseUrl) {
        return { available: true, track_id: token, quality: "AAC_96" };
    }
    return { available: false };
}
