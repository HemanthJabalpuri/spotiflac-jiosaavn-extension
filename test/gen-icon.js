// Generates icon.png (128x128) - a teal disc with the JioSaavn-style sprout
// mark. Run with: node test/gen-icon.js
// Replace icon.png with your own artwork any time; nothing else depends on it.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 128;
const SS = 4; // supersampling factor for smooth edges
const TEAL = [0x2b, 0xd4, 0xb8];
const WHITE = [0xff, 0xff, 0xff];

/**
 * A leaf is the lens where two equal circles overlap: pointed at both tips,
 * widest in the middle. Solve the circle radius/offset from the half-length
 * and half-width we want.
 */
function leaf(cx, cy, halfLen, halfWid, angleDeg) {
  const R = (halfWid + (halfLen * halfLen) / halfWid) / 2;
  const c = R - halfWid;
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(-a);
  const sin = Math.sin(-a);
  return (px, py) => {
    const dx = px - cx;
    const dy = py - cy;
    const x = dx * cos - dy * sin;
    const y = dx * sin + dy * cos;
    return Math.hypot(x + c, y) <= R && Math.hypot(x - c, y) <= R;
  };
}

const not = (f) => (x, y) => !f(x, y);
const all = (...fs) => (x, y) => fs.every((f) => f(x, y));
const any = (...fs) => (x, y) => fs.some((f) => f(x, y));

// A wedge up the middle: nearly closed where the fronds meet at the bottom,
// opening out towards the top. Subtracting it splits one blob into two sails.
const gap = (x, y) => Math.abs(x - 64) < 3.5 + Math.max(0, 96 - y) * 0.13;

const shapes = [
  all(any(leaf(50, 60, 40, 21, -12), leaf(78, 60, 40, 21, 12)), not(gap)),
  leaf(36, 96, 17, 7, -45), // small lower-left leaf
  leaf(92, 98, 16, 6.5, 52), // small lower-right leaf
];

const inCircle = (x, y) => Math.hypot(x - SIZE / 2, y - SIZE / 2) <= SIZE / 2 - 1;

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let o = 0;
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    let disc = 0;
    let mark = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS;
        const py = y + (sy + 0.5) / SS;
        if (!inCircle(px, py)) continue;
        disc++;
        if (shapes.some((f) => f(px, py))) mark++;
      }
    }
    const total = SS * SS;
    const alpha = disc / total;
    if (alpha === 0) {
      o += 4;
      continue;
    }
    const m = mark / total / alpha; // fraction of the covered area that is white
    for (let ch = 0; ch < 3; ch++) {
      raw[o++] = Math.round(TEAL[ch] * (1 - m) + WHITE[ch] * m);
    }
    raw[o++] = Math.round(alpha * 255);
  }
}

// --- minimal PNG writer -----------------------------------------------------
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(__dirname, "..", "icon.png");
fs.writeFileSync(out, png);
console.log(`wrote ${out} (${SIZE}x${SIZE}, ${png.length} bytes)`);
