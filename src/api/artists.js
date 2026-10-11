function searchArtists(query, limit, page) {
    // log.debug('[searchArtists] Query: ' + query + ', limit: ' + limit + ', page: ' + page);
    var result = callAPI('search.getArtistResults', {
        q: query,
        p: page || 1,
        n: limit || 20
    });
    if (!result) log.debug('[searchArtists] No results');
    return result;
}

function getArtistById(artistId, category) {
    // log.debug('[getArtistById] artistId: ' + artistId);
    var params = {
        artistId: artistId,
        page: 0, // artist uses page starting from 0
        n_song: 50,
        n_album: 50,
        sub_type: '',
        category: category || 'popular',
        sort_order: category === 'latest' ? 'desc' : 'asc'
    };
    var result = callAPI('artist.getArtistPageDetails', params);
    if (!result) {
        log.debug('[getArtistById] No artist found for id: ' + artistId);
        return null;
    }
    log.debug('[getArtistById] Found artist: ' + (result.name || result.title || 'untitled'));
    return result;
}

function getArtist(token, category) {
    // Artist ID prefix detected
    token = catalogReference(token);
    if (!token) return null;
    var artistId = token.replace(/^artistid_/, '');
    if (/^\d+$/.test(artistId)) {
        return getArtistById(artistId, category);
    }

    // log.debug('[getArtist] Token: ' + token + ', category: ' + category);

    var params = {
        token: token,
        type: 'artist',
        p: 0, // artist uses page starting from 0
        n_song: 50,
        n_album: 50,
        sub_type: '',
        category: category || 'popular',
        sort_order: category === 'latest' ? 'desc' : 'asc'
    };
    var result = callAPI('webapi.get', params);
    if (!result) {
        log.debug('[getArtist] No artist found for token: ' + token);
        return null;
    }
    log.debug('[getArtist] Found artist: ' + (result.name || result.title || 'untitled'));
    return result;
}

function getMoreSongs(artistId, page, category) {
    // log.debug('[getMoreSongs] artistId: ' + artistId + ', page: ' + page);
    return callAPI('artist.getArtistMoreSong', {
        artistId: artistId,
        page: page || 1,
        category: category || 'popular',
        sort_order: category === 'latest' ? 'desc' : 'asc'
    });
}

function getMoreAlbums(artistId, page, category) {
    // log.debug('[getMoreAlbums] artistId: ' + artistId + ', page: ' + page);
    return callAPI('artist.getArtistMoreAlbum', {
        artistId: artistId,
        page: page || 1,
        category: category || 'popular',
        sort_order: category === 'latest' ? 'desc' : 'asc'
    });
}
