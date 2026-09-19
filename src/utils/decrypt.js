// DES key (32×32‑bit words)
var DES_KEY = new Uint32Array([
    36443656, 338827529, 170141697, 338826299, 170272797, 875566612, 170276616, 941097494,
    153487137, 941103620, 154281006, 940128288, 221380890, 688468270, 621941049, 688727305,
    622007300, 151861785, 890309646, 184882698, 874054925, 50799890, 874062625, 117842443,
    805908001, 119942188, 839720978, 102894652, 302780946, 103954180, 302782501, 338829583
]);

function base64ToBinaryString(str) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    str = str.replace(/=+$/, '');
    var binary = '';
    var len = str.length;
    for (var i = 0; i < len; i += 4) {
        var c1 = chars.indexOf(str.charAt(i));
        var c2 = chars.indexOf(str.charAt(i + 1));
        var c3 = chars.indexOf(str.charAt(i + 2));
        var c4 = chars.indexOf(str.charAt(i + 3));
        var byte1 = (c1 << 2) | (c2 >> 4);
        var byte2 = ((c2 & 15) << 4) | (c3 >> 2);
        var byte3 = ((c3 & 3) << 6) | c4;
        binary += String.fromCharCode(byte1);
        if (c3 !== -1 && i + 2 < len) binary += String.fromCharCode(byte2);
        if (c4 !== -1 && i + 3 < len) binary += String.fromCharCode(byte3);
    }
    return binary;
}

function decryptMediaUrl(encrypted) {
    var binary = base64ToBinaryString(encrypted);
    var plain = desDecrypt(binary, DES_KEY);
    // Remove PKCS#7 padding (last byte = pad length)
    var padLen = plain.charCodeAt(plain.length - 1);
    return plain.slice(0, plain.length - padLen);
}
