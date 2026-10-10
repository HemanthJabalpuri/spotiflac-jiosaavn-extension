<p align="center">
  <img src="icon.png" alt="JioSaavn for SpotiFLAC" width="128" height="128">
</p>

<h1 align="center">JioSaavn for SpotiFLAC</h1>

<p align="center">
  Download songs from <b>JioSaavn</b> at 320 kbps,<br>
  with the cover art and song details already inside the file.
</p>

---

## What is this?

[SpotiFLAC](https://github.com/spotiflacapp/SpotiFLAC-Mobile) is a music
downloader app. It normally pulls songs from Tidal, Qobuz and Deezer.

This **extension** teaches it a new source: **JioSaavn**. Once installed you get
a JioSaavn tab inside the app, and you can search and download from it like any
other service.

It is especially useful for **Indian music** — Hindi, Punjabi, Tamil, Telugu and
regional tracks that are often missing from Tidal and Qobuz.

---

## What you get

| | |
|---|---|
| **Search** | Songs, albums, artists and playlists, all in one list |
| **Paste a link** | Any `jiosaavn.com` link opens straight in the app |
| **Quality** | Up to 320 kbps AAC — the best JioSaavn offers |
| **Cover art** | 500×500 album picture embedded in the file |
| **Song details** | Title, artist, album, album artist, year, track number, language, record label, copyright |
| **No quality loss** | Details are added by *copying* the audio, never re-encoding it |
| **Safety net** | If anything goes wrong while tagging, you still get a playable file |

---

## Requirements

- **SpotiFLAC Mobile** version **3.0.1** or newer
- An internet connection

That's it. No account, no login, no API key.

---

## Installation

### Option 1 — Download the ready-made file (easiest)

1. Go to the [**Releases**](../../releases) page.
2. Download `jiosaavn.sflx`.
3. Open SpotiFLAC → **Settings** → **Extensions**.
4. Tap **+ Install Extension** and pick the file you just downloaded.
5. Done. A JioSaavn tab appears in search.

### Option 2 — Build it yourself

You need [Node.js](https://nodejs.org) only if you want to run the tests.
Building itself needs nothing but Linux Shell.

```bash
git clone https://github.com/HemanthJabalpuri/spotiflac-jiosaavn-extension.git
cd spotiflac-jiosaavn-extension
bash build.sh
```

This produces `jiosaavn.sflx`. Import it the same way as above.

> A `.sflx` file is just a ZIP with a different name. Rename it to
> `.zip` if you ever want to look inside.

### Updating later

Build a new version with a **higher** version number in `manifest.json`, then
import it. SpotiFLAC keeps your settings and replaces the code. Going *back* to
an older version is not allowed — uninstall first if you need to.

---

## How to use it

### Search for music

Open search, pick the **JioSaavn** tab, and type. You will see four kinds of
results mixed together:

- **Songs** — tap to download
- **Albums** — tap to see the full track list
- **Artists** — tap to see their albums
- **Playlists** — tap to see every song in it

### Paste a JioSaavn link

Copy any link from the JioSaavn app or website and paste it into SpotiFLAC.
These all work:

```
https://www.jiosaavn.com/song/tum-hi-ho/EToxUyFpcwQ
https://www.jiosaavn.com/album/aashiqui-2/-iNdCmFNV9o_
https://www.jiosaavn.com/artist/arijit-singh/LlRWpHzy3Hk_
https://www.jiosaavn.com/featured/hindi-1990s/dSYq41esdPJAI5VmDfZSSg__
```

### Pick a quality

When you download, you can choose:

| Option | Roughly |
|---|---|
| **AAC 320 kbps** | Best quality — about 10 MB per song |
| **AAC 160 kbps** | Good quality, half the size |
| **AAC 96 kbps** | Data saver |
| **AAC 48 kbps** | Low |
| **AAC 12 kbps** | Preview only |

If a song is not available in the quality you picked, the extension quietly
drops to the next best one instead of failing.

---

## Settings

Found under **Settings → Extensions → JioSaavn**.

| Setting | Default | What it does |
|---|---|---|
| **Languages** | english | Langauge for Homefeed content (can be multiple) |

One button is also there:

- **Clear Cache** — clears stored decrypted urls

---

## How it works, step by step

When you tap download, this happens:

```
1. Find the song on JioSaavn        →  gets every detail about it
2. Pick your chosen quality         →  falls back if unavailable
3. Download the audio               →  raw AAC stream
4. Download the album picture       →  500×500 JPEG
5. Write a small details file       →  title, artist, album, year, label...
6. Combine all three with FFmpeg    →  one finished .m4a file
7. Delete the leftover temp files   →  tidy
```

**Step 6 is the important one.** FFmpeg is told to *copy* the audio rather than
re-encode it. The sound data is moved across byte for byte, untouched. Only the
picture and the details card get added. So tagging is completely free — your
320 kbps stays exactly 320 kbps.

---

## What's in this repo

```
manifest.json     What the extension is, what it can do, its settings
src/              All the actual code
icon.png          The icon you see in the app
build.sh          Packages everything into a .sflx file
test/gen-icon.js  Draws icon.png
```

---

## Honest limitations

- **AAC, not FLAC.** 320 kbps is JioSaavn's ceiling. Anyone offering "JioSaavn
  FLAC" is upscaling, which adds no real quality. Use the Odesli option if you
  want genuine lossless.
- **No ISRC.** JioSaavn does not publish it, so songs are matched by title,
  artist and duration. This is very reliable but not perfect.
- **Unofficial API.** JioSaavn does not provide or endorse this. It works by
  reading their internal endpoints. If they change something, it breaks. That is
  the nature of it.
- **The `.m4a` extension is forced.** Even if the app suggests `.flac`, the file
  is saved as `.m4a`, because labelling AAC as FLAC breaks music players.

---

## Credits

This extension is a thin bridge. Almost all the hard work belongs to others.

| Project | What it does here |
|---|---|
| **[SpotiFLAC Mobile](https://github.com/spotiflacapp/SpotiFLAC-Mobile)** | The app itself, and the extension system that makes this possible |
| **[jiosaavn-api](https://github.com/sumitkolhe/jiosaavn-api)** by [Sumit Kolhe](https://github.com/sumitkolhe) | The unofficial API that provides all the song data. This extension is nothing without it. |
| **[JioSaavn](https://www.jiosaavn.com)** | The music service and the original source of everything |

Looking for more extensions? There is a community registry at
[**spotiflacapp/SpotiFLAC-Extension**](https://github.com/spotiflacapp/SpotiFLAC-Extension).

Icon drawn by `test/gen-icon.js` — an approximation of the JioSaavn mark, not
the official artwork. Swap in any 128×128 PNG to change it.

---

## Disclaimer

This project is **not affiliated with, endorsed by, or connected to JioSaavn**,
Saavn Media, Jio, or any streaming service.

The music you download through it is **copyrighted** and belongs to its rights
holders. This is a personal, educational tool. Keep it to private use, and
support artists by streaming and buying their music properly.

No copyrighted audio is stored in or distributed by this repository.

---

## License

[MIT](LICENSE) — do what you like with the extension code.

The license covers this extension only. It does not cover JioSaavn's music,
artwork, or the API this talks to.
