function searchSongsService(query, limit) {
    var data = searchSongs(query, limit);
    if (!data || !data.results) return [];
    var songs = data.results.filter(function (item) { return item.type === "song"; });
    var out = [];
    for (var i = 0; i < songs.length; i++) {
        var t = formatSong(songs[i]);
        if (t && t.id) out.push(t);
    }
    return out;
}

function getSongService(token) {
    log.debug('[getSongService] Token: ' + token);

    var song = getSong(token);
    return song ? formatSong(song) : null;
}
