function enrichTrack(track) {
    if (!track || !track.id) {
        log.debug('[enrichTrack] No track or missing id');
        return track;
    }

    // Fetch full song details
    var song = getSongService(track.id);
    if (!song) {
        log.debug('[enrichTrack] Could not fetch song details');
        return track;
    }

    cacheDownloadTrack(song, track.id);

    return song;  // return the deep, formatted track
}

// ----- Quality mapping -----------------------------------------
function getBitrate(qualityId) {
    var map = { "AAC_12": "12", "AAC_48": "48", "AAC_96": "96", "AAC_160": "160", "AAC_320": "320" };
    var id = String(qualityId || 'AAC_320').toUpperCase();
    var bitrate = map[id] || null;
    log.debug('[getBitrate] qualityId: ' + qualityId + ' → bitrate: ' + bitrate);
    return bitrate;
}

function cacheDownloadTrack(track, reference) {
    if (!track || !mediaUrl(track.preview_url)) return;
    var ids = [reference, track.id, extractToken(track.external_urls)];
    ids.forEach(function(id, index) {
        if (!id || ids.indexOf(id) !== index) return;
        setCache('url_' + id, mediaUrl(track.preview_url));
        setCache('track_' + id, JSON.stringify(track));
    });
}

function getDownloadUrl(token, quality, options) {
    log.debug('[getDownloadUrl] Token: ' + token + ', quality: ' + quality);
    token = catalogReference(token);
    if (!token) return { success: false, error_message: 'Invalid JioSaavn track ID', error_type: 'not_found' };
    var baseUrl = '';
    var track = null;
    var prepared = options && options.preparedContext && options.preparedContext.track;
    if (prepared && (String(prepared.id) === token || extractToken(prepared.external_urls) === token)) {
        baseUrl = mediaUrl(prepared.preview_url);
        if (baseUrl) track = prepared;
    }
    try {
        if (!baseUrl) {
            baseUrl = mediaUrl(getCache('url_' + token));
            var cachedTrack = getCache('track_' + token);
            if (cachedTrack) track = JSON.parse(cachedTrack);
        }
    } catch (e) {}
    if (!baseUrl) {
        track = getSongService(token);
        baseUrl = track && mediaUrl(track.preview_url);
        cacheDownloadTrack(track, token);
    }
    if (!baseUrl) return { success: false, error_message: 'JioSaavn has no playable stream for this track', error_type: 'stream_error' };
    var bitrate = getBitrate(quality);
    if (!bitrate) return { success: false, error_message: 'Unsupported JioSaavn quality', error_type: 'quality_unavailable' };
    var finalUrl = baseUrl.replace(/_\d+\.mp4(?=[?#]|$)/, '_' + bitrate + '.mp4');
    log.debug('[getDownloadUrl] Final URL: ' + finalUrl);
    return {
        success: true,
        url: finalUrl,
        format: "m4a",
        actual_extension: 'm4a',
        audio_codec: 'aac',
        quality: bitrate + "kbps",
        track: track
    };
}

function download(token, quality, outputPath, onProgress, options) {
    log.debug('[download] Starting download for token: ' + token + ', quality: ' + quality);

    // Get the stream URL (reuse getDownloadUrl)
    var streamInfo;
    try { streamInfo = getDownloadUrl(token, quality, options); }
    catch (error) { return { success: false, error_message: error.message || String(error), error_type: 'stream_error' }; }
    if (!streamInfo.success) {
        return streamInfo; // forward the error
    }
    var plainUrl = streamInfo.url;

    // Require outputPath – if missing, log and exit
    if (!outputPath) {
        log.debug('[download] outputPath missing, cannot download');
        return { success: false, error_message: "Output path not provided", error_type: "invalid_path" };
    }

    // The host may supply a provisional .flac path. AAC stays in its MP4
    // container and must never be published with a lossless suffix.
    outputPath = String(outputPath);
    if (!/\.m4a$/i.test(outputPath)) {
        outputPath = outputPath.replace(/\.[^./\\]+$/, '') + '.m4a';
    }

    // Download the file
    var dl = file.download(plainUrl, outputPath, {
        headers: { "User-Agent": UA, "Referer": REFERER },
        onProgress: onProgress ? function(r, t) { onProgress(t > 0 ? r / t : 0); } : undefined
    });
    if (!dl || !dl.success) {
        return { success: false, error_message: dl && (dl.error_message || dl.error) || "Download failed", error_type: dl && dl.error_type || "download_error" };
    }
    if (onProgress) onProgress(1);
    var track = streamInfo.track || {};
    return {
        success: true,
        file_path: dl.path || outputPath,
        format: "m4a",
        actual_extension: 'm4a',
        audio_codec: 'aac',
        title: track.name || '',
        artist: track.artists || '',
        album: track.album_name || '',
        album_artist: track.album_artist || '',
        track_number: track.track_number || 0,
        total_tracks: track.total_tracks || 0,
        disc_number: track.disc_number || 0,
        total_discs: track.total_discs || 0,
        release_date: track.release_date || '',
        cover_url: track.cover_url || '',
        isrc: recordingIsrc(track.isrc),
        genre: track.genre || '',
        label: track.label || '',
        copyright: track.copyright || '',
        composer: track.composer || '',
        explicit: track.explicit === true
    };
}

function checkAvailability(isrc, trackName, artistName, options) {
    options = options || {};
    var track = options.track || {};
    if (track.provider_id === EXT_ID && track.id) {
        var song = getSongService(track.id);
        if (song && song.preview_url) {
            cacheDownloadTrack(song, track.id);
            return { available: true, track_id: song.id, prepared_context: { track: song } };
        }
    }
    if (!trackName || !artistName) return { available: false, reason: 'No recording metadata to match' };
    var candidates = searchSongsService(trackName + ' ' + artistName, 20);
    var requestedIsrc = recordingIsrc(isrc);
    var requestedDuration = positiveInt(options.duration_ms || track.duration_ms);
    for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];
        if (!candidate.preview_url) continue;
        if (requestedIsrc && candidate.isrc && requestedIsrc !== candidate.isrc) continue;
        var exactIsrc = requestedIsrc && requestedIsrc === candidate.isrc;
        if (!exactIsrc && (matchingName(trackName) !== matchingName(candidate.name) ||
            !matchingArtists(artistName, candidate.artists) ||
            !requestedDuration || !candidate.duration_ms ||
            Math.abs(requestedDuration - candidate.duration_ms) > 5000)) continue;
        cacheDownloadTrack(candidate, candidate.id);
        return { available: true, track_id: candidate.id, prepared_context: { track: candidate } };
    }
    return { available: false, reason: 'No matching JioSaavn recording' };
}

function matchingName(value) {
    return decodeEntities(value).toLowerCase().replace(/[^a-z0-9\u0080-\uffff]+/g, ' ').trim();
}

function matchingArtists(expected, actual) {
    function names(value) {
        return String(value || '').split(/[,;&]|\s+(?:feat\.?|ft\.?)\s+/i).map(matchingName).filter(Boolean);
    }
    var requested = names(expected);
    return names(actual).some(function(name) { return requested.indexOf(name) !== -1; });
}
