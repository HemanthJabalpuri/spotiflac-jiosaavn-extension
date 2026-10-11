function customSearch(query, options) {
    log.debug('[customSearch] Query: ' + query + ', options: ' + JSON.stringify(options));

    options = typeof options === 'string' ? { filter: options } : options || {};
    var aliases = { song: 'tracks', songs: 'tracks', track: 'tracks', album: 'albums', playlist: 'playlists', artist: 'artists' };
    var filter = String(options.filter || '').toLowerCase();
    filter = aliases[filter] || filter;
    var limit = (options && options.limit) || 20; // default to 20 if not provided

    // Filtered mode – use the provided limit
    if (filter === 'tracks') {
        log.debug('[customSearch] Filter: tracks, limit: ' + limit);
        return searchSongsService(query, limit);
    }
    if (filter === 'albums') {
        log.debug('[customSearch] Filter: albums, limit: ' + limit);
        return searchCollectionsService('album', query, limit);
    }
    if (filter === 'playlists') {
        log.debug('[customSearch] Filter: playlists, limit: ' + limit);
        return searchCollectionsService('playlist', query, limit);
    }
    // Note: 'artist' is used when we click on artist name in a song card
    if (filter === 'artist' || filter === 'artists') {
        log.debug('[customSearch] Filter: artists, limit: ' + limit);
        return searchArtistsService(query, limit);
    }

    // "all" or no filter – use autocomplete.get
    log.debug('[customSearch] Filter: all – using autocomplete.get');
    var data = searchAll(query);
    if (!data) return [];

    var results = [];
    var skipId = null;

    // 1. Extract topquery item
    if (data.topquery && data.topquery.data && data.topquery.data.length) {
        var rawTop = data.topquery.data[0];
        var topItem = formatSearchItem(rawTop, mapRawType(rawTop.type));
        if (topItem) {
            results.push(topItem);
            skipId = rawTop.id;
            log.debug('[customSearch] Added topquery item: ' + topItem.name + ' (' + rawTop.type + ')');
        }
    }

    // 2. Add all sections (skip the topquery item by id)
    var sections = [
        { data: data.songs,     type: 'track' },
        { data: data.albums,    type: 'album' },
        { data: data.playlists, type: 'playlist' },
        { data: data.artists,   type: 'artist' }
    ];

    for (var i = 0; i < sections.length; i++) {
        results = results.concat(parseSearchSection(sections[i].data, sections[i].type, skipId));
    }

    log.debug('[customSearch] Returning ' + results.length + ' total items');
    return results;
}

function mapRawType(rawType) {
    return rawType === 'song' ? 'track' : rawType;
}

// ----- Helper: parse a section from autocomplete response -----
function parseSearchSection(section, type, skipId) {
    if (!section || !section.data || !section.data.length) return [];
    var out = [];
    for (var i = 0; i < section.data.length; i++) {
        var raw = section.data[i];
        // Skip by raw.id (works for all types, including artists without perma_url)
        if (skipId && raw.id === skipId) {
            log.debug('[parseSearchSection] Skipping topquery item in ' + type + ' section');
            continue;
        }
        var item = formatSearchItem(raw, type);
        if (item) out.push(item);
    }
    return out;
}
