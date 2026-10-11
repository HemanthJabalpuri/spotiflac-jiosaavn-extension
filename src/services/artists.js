function searchArtistsService(query, limit) {
    log.debug('[searchArtistsService] Query: ' + query + ', limit: ' + limit);
    var data = searchArtists(query, limit);
    if (!data || !data.results) return [];
    var artists = data.results.filter(function(item) {
        return item.type === "artist";
    });
    var out = [];
    for (var i = 0; i < artists.length; i++) {
        var a = formatArtist(artists[i], false);
        if (a && a.id) out.push(a);
    }
    return out;
}

function getArtistService(token) {
    log.debug('[getArtistService] Artist ID: ' + token);

    // 1. Fetch main artist details
    var artist = getArtist(token);
    if (!artist) {
        log.debug('[getArtistService] No artist found');
        return null;
    }

/*
    // 2. Fetch extra songs (pages 2 and 3)
    var extraSongs = [];
    for (var page = 2; page <= 3; page++) {
        var more = getMoreSongs(artist.artistId, page);
        if (more && more.topSongs.songs && more.topSongs.songs.length) {
            extraSongs = extraSongs.concat(more.topSongs.songs);
        }
    }
    if (extraSongs.length) {
        if (!artist.topSongs) artist.topSongs = [];
        artist.topSongs = artist.topSongs.concat(extraSongs);
        log.debug('[getArtistService] Added ' + extraSongs.length + ' extra songs');
    }

    // 3. Fetch extra albums (pages 2 and 3)
    var extraAlbums = [];
    for (var page = 2; page <= 3; page++) {
        var more = getMoreAlbums(artist.artistId, page);
        if (more && more.topAlbums.albums && more.topAlbums.albums.length) {
            extraAlbums = extraAlbums.concat(more.topAlbums.albums);
        }
    }
    if (extraAlbums.length) {
        if (!artist.topAlbums) artist.topAlbums = [];
        artist.topAlbums = artist.topAlbums.concat(extraAlbums);
        log.debug('[getArtistService] Added ' + extraAlbums.length + ' extra albums');
    }
*/

    // 4. Format and return
    return formatArtist(artist, true);
}
