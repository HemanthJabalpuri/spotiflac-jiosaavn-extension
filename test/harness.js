// Local test harness. Stubs the SpotiFLAC sandbox globals and runs index.js
// against the live JioSaavn API. Not shipped in the .spotiflac-ext package.
//
//   node test/harness.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const SRC = path.join(__dirname, "..", "index.js");

// --- synchronous HTTP via curl (the sandbox's http.* is synchronous) --------
function curl(url, headers) {
  const args = ["-s", "-L", "--max-time", "30", "-w", "\n__STATUS__%{http_code}"];
  for (const k of Object.keys(headers || {})) args.push("-H", `${k}: ${headers[k]}`);
  args.push(url);
  let out;
  try {
    out = execFileSync("curl", args, { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  } catch (e) {
    return { statusCode: 0, ok: false, body: "" };
  }
  const i = out.lastIndexOf("\n__STATUS__");
  const body = i >= 0 ? out.slice(0, i) : out;
  const code = i >= 0 ? parseInt(out.slice(i + 11), 10) : 0;
  return { statusCode: code, status: code, ok: code >= 200 && code < 300, body, headers: {} };
}

// --- recorded side effects --------------------------------------------------
const recorded = { downloads: [], ffmpeg: [], writes: {}, deletes: [] };
const fakeFs = new Set();

const sandbox = {
  console,
  JSON,
  Math,
  Object,
  Array,
  String,
  Number,
  parseInt,
  parseFloat,
  isNaN,
  Infinity,
  encodeURIComponent,
  decodeURIComponent,
  Date,
  RegExp,
  Error,

  log: {
    debug: (...a) => process.env.VERBOSE && console.log("  [debug]", ...a),
    info: (...a) => console.log("  [info]", ...a),
    warn: (...a) => console.log("  [warn]", ...a),
    error: (...a) => console.log("  [error]", ...a),
  },

  http: {
    get: (url, headers) => curl(url, headers),
  },

  fetch: (url, opts) => {
    const r = curl(url, (opts && opts.headers) || {});
    return {
      ok: r.ok,
      status: r.statusCode,
      text: () => r.body,
      json: () => JSON.parse(r.body),
    };
  },

  storage: {
    _d: {},
    get(k) { return this._d[k]; },
    set(k, v) { this._d[k] = v; },
    remove(k) { delete this._d[k]; },
  },

  file: {
    download(url, out, opts) {
      recorded.downloads.push({ url, out });
      if (opts && opts.onProgress) { opts.onProgress(50, 100); opts.onProgress(100, 100); }
      fakeFs.add(out);
      return { success: true };
    },
    exists: (p) => fakeFs.has(p),
    read: (p) => recorded.writes[p] || "",
    write(p, c) { recorded.writes[p] = c; fakeFs.add(p); return { success: true }; },
    delete(p) { recorded.deletes.push(p); fakeFs.delete(p); return { success: true }; },
  },

  ffmpeg: {
    execute(cmd) {
      recorded.ffmpeg.push(cmd);
      // Simulate the first (richest) variant succeeding.
      const m = cmd.match(/"([^"]+)"\s*$/);
      if (m) fakeFs.add(m[1]);
      return { success: true, output: "" };
    },
    getInfo: () => ({ success: true, bit_depth: 16, sample_rate: 44100 }),
  },

  matching: {
    normalizeString: (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, "").trim(),
    compareStrings(a, b) {
      a = this.normalizeString(a); b = this.normalizeString(b);
      if (!a || !b) return 0;
      if (a === b) return 1;
      if (a.includes(b) || b.includes(a)) return 0.8;
      const A = new Set(a.split(" ")), B = new Set(b.split(" "));
      let hit = 0; for (const w of A) if (B.has(w)) hit++;
      return hit / Math.max(A.size, B.size);
    },
    compareDuration: (a, b, tol) => Math.abs(a - b) <= tol,
  },

  gobackend: {
    sanitizeFilename: (s) => String(s).replace(/[\\/:*?"<>|]/g, "_").trim(),
  },
};

let EXT = null;
sandbox.registerExtension = (obj) => { EXT = obj; };

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(SRC, "utf8"), sandbox, { filename: "index.js" });

// --- tiny assertion runner --------------------------------------------------
let pass = 0, fail = 0;
function check(name, fn) {
  try {
    const msg = fn();
    console.log(`  PASS  ${name}${msg ? "  -> " + msg : ""}`);
    pass++;
  } catch (e) {
    console.log(`  FAIL  ${name}\n        ${e.message}`);
    fail++;
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }

// ============================================================================
console.log("\n== lifecycle ==");
check("initialize()", () => {
  assert(EXT, "registerExtension was never called");
  assert(EXT.initialize({ debug: !!process.env.VERBOSE, searchLimit: 5 }) === true);
  return "ok";
});
check("testConnection()", () => {
  const r = EXT.testConnection();
  assert(r.success, r.error);
  return r.message;
});

console.log("\n== metadata ==");
check("searchTracks()", () => {
  const r = EXT.searchTracks("tum hi ho", 5);
  assert(r.length > 0, "no results");
  const t = r[0];
  assert(t.id && t.name && t.artists, "missing core fields");
  assert(t.duration_ms > 0, "duration not converted to ms");
  assert(/^https?:/.test(t.images), "no cover url");
  assert(t.item_type === "track");
  return `${r.length} tracks, first = "${t.name}" / ${t.artists} / ${t.duration_ms}ms`;
});

check("HTML entities decoded", () => {
  const r = EXT.searchTracks("kesariya brahmastra", 10);
  const bad = r.find((t) => /&(quot|amp|#\d+);/.test(t.name + t.album_name + t.artists));
  assert(!bad, `undecoded entity in: ${bad && bad.name}`);
  return "no raw entities in any field";
});

check("customSearch() returns mixed item types", () => {
  const r = EXT.customSearch("arijit singh", { limit: 5 });
  const types = [...new Set(r.map((x) => x.item_type))].sort();
  assert(types.includes("track"), "no tracks");
  assert(types.includes("album"), "no albums");
  assert(types.includes("artist"), "no artists");
  return `${r.length} items, types = ${types.join(", ")}`;
});

check("getTrack()", () => {
  const t = EXT.getTrack("aRZbUYD7");
  assert(t && t.name === "Tum Hi Ho", "wrong track");
  assert(t.album_name === "Aashiqui 2", `album = ${t.album_name}`);
  return `${t.name} / ${t.artists}`;
});

check("getAlbum() with numbered tracks", () => {
  const a = EXT.getAlbum("1139549");
  assert(a && a.tracks.length > 0, "no tracks");
  assert(a.tracks[0].track_number === 1, "track_number not set");
  assert(a.tracks.every((t) => t.album_name === a.name), "album name not propagated");
  assert(a.tracks.every((t) => t.provider_id === "jiosaavn"), "provider_id missing");
  return `"${a.name}" -> ${a.tracks.length} tracks`;
});

check("getPlaylist()", () => {
  const p = EXT.getPlaylist("1167751266");
  assert(p && p.tracks.length > 0, "no tracks");
  return `"${p.name}" -> ${p.tracks.length} tracks`;
});

check("getArtist()", () => {
  const a = EXT.getArtist("459320");
  assert(a && a.name === "Arijit Singh", "wrong artist");
  assert(a.albums.length > 0, "no albums");
  return `${a.name} -> ${a.albums.length} albums`;
});

console.log("\n== url handling ==");
check("handleURL() song", () => {
  const r = EXT.handleURL("https://www.jiosaavn.com/song/tum-hi-ho/EToxUyFpcwQ");
  assert(r.success, r.error);
  assert(r.type === "track" && r.track.name === "Tum Hi Ho", "wrong payload");
  return r.track.name;
});
check("handleURL() album", () => {
  const r = EXT.handleURL("https://www.jiosaavn.com/album/aashiqui-2/-iNdCmFNV9o_");
  assert(r.success && r.type === "album" && r.album.tracks.length > 0, r.error || "no tracks");
  return `${r.album.name} (${r.album.tracks.length} tracks)`;
});
check("handleURL() playlist", () => {
  const r = EXT.handleURL("https://www.jiosaavn.com/featured/hindi-1990s/dSYq41esdPJAI5VmDfZSSg__");
  assert(r.success && r.album.tracks.length > 0, r.error || "no tracks");
  return `${r.album.name} (${r.album.tracks.length} tracks)`;
});
check("handleURL() rejects unknown", () => {
  const r = EXT.handleURL("https://example.com/foo");
  assert(r.success === false, "should have failed");
  return r.error;
});

console.log("\n== download provider ==");
check("getDownloadUrl() honours requested quality", () => {
  const r = EXT.getDownloadUrl("aRZbUYD7", "AAC_320");
  assert(r.success, r.error);
  assert(r.quality === "320kbps", `got ${r.quality}`);
  assert(/_320\.mp4$/.test(r.url), `unexpected url ${r.url}`);
  return r.quality;
});
check("getDownloadUrl() maps generic quality ids", () => {
  const r = EXT.getDownloadUrl("aRZbUYD7", "LOSSLESS");
  assert(r.success && r.quality === "320kbps", `got ${r.quality}`);
  const lo = EXT.getDownloadUrl("aRZbUYD7", "AAC_96");
  assert(lo.quality === "96kbps", `got ${lo.quality}`);
  return "LOSSLESS->320kbps, AAC_96->96kbps";
});
check("checkAvailability() by name", () => {
  const r = EXT.checkAvailability("", "Tum Hi Ho", "Arijit Singh");
  assert(r.available && r.track_id, "not found");
  return `track_id = ${r.track_id}`;
});

console.log("\n== download() end to end (mocked fs/ffmpeg) ==");
check("object-style signature", () => {
  recorded.downloads.length = 0; recorded.ffmpeg.length = 0;
  const seen = [];
  const r = EXT.download(
    { track_id: "aRZbUYD7", quality: "AAC_320", output_path: "/music/Tum Hi Ho.flac" },
    (p) => seen.push(p)
  );
  assert(r.success, r.error);
  assert(r.file_path === "/music/Tum Hi Ho.m4a", `extension not corrected: ${r.file_path}`);
  assert(r.format === "m4a");
  assert(r.title === "Tum Hi Ho" && r.album === "Aashiqui 2", "tags wrong");
  assert(/^https?:/.test(r.cover_url), "no cover_url returned");
  assert(seen.length > 0 && seen[seen.length - 1] === 1, `progress = ${seen}`);
  assert(recorded.downloads.length === 2, "expected audio + cover download");
  return `${r.file_path} | ${r.title} - ${r.artist}`;
});

check("positional signature", () => {
  const r = EXT.download("aRZbUYD7", "AAC_160", "/music/x.m4a", () => {});
  assert(r.success, r.error);
  assert(r.file_path === "/music/x.m4a");
  return "ok";
});

check("output_dir fallback builds a safe filename", () => {
  const r = EXT.download(
    { track_id: "aRZbUYD7", quality: "AAC_320", output_dir: "/music", track_name: 'A/B:C?', artist_name: "X" },
    () => {}
  );
  assert(r.success, r.error);
  assert(!/[\\/:*?"<>|]/.test(r.file_path.replace("/music/", "")), `unsafe: ${r.file_path}`);
  return r.file_path;
});

check("ffmpeg mux command is well formed", () => {
  recorded.ffmpeg.length = 0;
  EXT.download({ track_id: "aRZbUYD7", quality: "AAC_320", output_path: "/music/t.m4a" }, () => {});
  const cmd = recorded.ffmpeg[0];
  assert(cmd, "ffmpeg never invoked");
  assert(cmd.includes("-f ffmetadata"), "no metadata input");
  assert(cmd.includes("attached_pic"), "cover not attached");
  assert(cmd.includes("-c copy"), "not stream copying");
  assert((cmd.match(/"/g) || []).length % 2 === 0, "unbalanced quotes");
  return cmd.slice(0, 90) + "...";
});

check("ffmetadata file escapes correctly", () => {
  const metaKey = Object.keys(recorded.writes).find((k) => k.endsWith(".ffmeta.txt"));
  assert(metaKey, "no metadata file written");
  const body = recorded.writes[metaKey];
  assert(body.startsWith(";FFMETADATA1\n"), "missing header");
  assert(/\ntitle=Tum Hi Ho\n/.test(body), "title missing");
  assert(/\nalbum=Aashiqui 2\n/.test(body), "album missing");
  // (P) 2013 T-Series... copyright contains no '=' but publisher/comment may
  for (const line of body.split("\n").slice(1)) {
    if (!line) continue;
    const val = line.slice(line.indexOf("=") + 1);
    assert(!/(?:^|[^\\])[=;#]/.test(val), `unescaped special char: ${line}`);
  }
  return `${body.split("\n").length - 2} tags written`;
});

check("cover + metadata temp files are cleaned up", () => {
  assert(recorded.deletes.some((p) => p.endsWith(".cover.jpg")), "cover not deleted");
  assert(recorded.deletes.some((p) => p.endsWith(".ffmeta.txt")), "metadata not deleted");
  assert(recorded.deletes.some((p) => p.endsWith(".src.m4a")), "raw stream not deleted");
  return "temp files removed";
});

check("unknown track id fails cleanly", () => {
  const r = EXT.download({ track_id: "zzzznotreal", output_path: "/music/z.m4a" }, () => {});
  assert(r.success === false && r.error_type === "not_found", JSON.stringify(r));
  return r.error_type;
});

console.log("\n== post-processing ==");
check("convert_mp3 hook", () => {
  recorded.ffmpeg.length = 0;
  fakeFs.add("/music/t.m4a");
  const r = EXT.postProcess("/music/t.m4a", {}, "convert_mp3");
  assert(r.success, r.error);
  assert(r.new_file_path === "/music/t.mp3", r.new_file_path);
  assert(recorded.ffmpeg[0].includes("libmp3lame"), "not encoding mp3");
  return r.new_file_path;
});
check("unknown hook is a no-op", () => {
  const r = EXT.postProcess("/music/t.m4a", {}, "nope");
  assert(r.success && r.new_file_path === "/music/t.m4a");
  return "passthrough";
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
