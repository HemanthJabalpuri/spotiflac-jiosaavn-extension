<p align="center">
  <img src="icon.png" alt="JioSaavn for SpotiFLAC" width="128" height="128">
</p>

<h1 align="center">JioSaavn for SpotiFLAC</h1>

<p align="center">
  Download songs from <b>JioSaavn</b> at 320 kbps,<br>
  with the cover art and song details already inside the file.
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.0.0-2bd4b8">
  <img alt="platform" src="https://img.shields.io/badge/for-SpotiFLAC%20Mobile-blue">
  <img alt="tests" src="https://img.shields.io/badge/tests-25%20passing-brightgreen">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-lightgrey">
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

### Why "with the details already inside the file"?

A downloaded music file is not just sound. It also carries a little card of
information — the song title, who sang it, which album it came from, and the
album picture. Music players read that card to show you a nice library instead
of a list of filenames.

This extension fills that card in for you, automatically, on every download.

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
| **Lossless upgrade** | Optional — can fetch true FLAC instead (see [below](#-optional-get-true-lossless-instead)) |
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
2. Download `jiosaavn-1.0.0.spotiflac-ext`.
3. Open SpotiFLAC → **Settings** → **Extensions**.
4. Tap **Import** (the **+** button) and pick the file you just downloaded.
5. Done. A JioSaavn tab appears in search.

### Option 2 — Build it yourself

You need [Node.js](https://nodejs.org) only if you want to run the tests.
Building itself needs nothing but PowerShell.

```powershell
git clone https://github.com/asmitsharma-alt/spotiflac-jiosaavn-extension.git
cd spotiflac-jiosaavn-extension
powershell -ExecutionPolicy Bypass -File build.ps1
```

This produces `jiosaavn-1.0.0.spotiflac-ext`. Import it the same way as above.

> A `.spotiflac-ext` file is just a ZIP with a different name. Rename it to
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
| **API Base URL** | public server | Where song information comes from. Change it if the default gets slow or stops working — see [Troubleshooting](#troubleshooting). |
| **Search Results** | everything | `everything` also searches albums, artists and playlists. `songs` is fastest. |
| **Song Results Per Search** | 25 | How many songs to show. 1–50. |
| **Embed Cover Art & Metadata** | on | Turn off to save the plain audio with no details attached. |
| **Cover Art Size** | 500×500 | Smaller sizes make smaller files. |
| **Look Up ISRC (Odesli)** | off | The lossless upgrade — explained below. |
| **Progress Reporting** | fraction | Only touch this if the download bar never moves. Then switch to `percent`. |
| **Debug Logging** | off | Extra detail in the logs when something misbehaves. |

Two buttons are also there:

- **Test Connection** — checks the server is reachable
- **Clear Cache** — clears stored lookups

---

## ✨ Optional: get true lossless instead

JioSaavn only offers AAC. It does not offer FLAC. But there is a clever way
around that.

Every commercial song has a worldwide ID code called an **ISRC** — think of it
as a barcode for a recording. If you know a song's ISRC, you can find that exact
same recording on other services.

JioSaavn does not tell you the ISRC. So when you switch **Look Up ISRC (Odesli)**
on, the extension asks a free service called [Odesli](https://odesli.co) to look
it up, along with matching Tidal and Qobuz IDs.

When it finds one, **SpotiFLAC downloads real lossless FLAC from Tidal or Qobuz
instead** — no searching, no guessing, no wrong-version mixups.

```
You search JioSaavn  →  Odesli finds the ISRC  →  SpotiFLAC grabs the FLAC
```

**Why is it off by default?** Two honest reasons:

1. It adds one extra internet request for every song, so downloads start slower.
2. Your audio then comes from Tidal or Qobuz, not JioSaavn. That is usually
   better, but you should know it is happening rather than be surprised by it.

Turn it on if you care about quality. Leave it off if you want speed and
predictability.

---

## Optional: convert to MP3

Some older cars, speakers and MP3 players cannot play `.m4a` files. For those,
there is a **Convert to MP3 320** option under post-processing (off by default).
It keeps the cover art and all the song details.

> ⚠️ This converts one compressed format into another, which always loses a
> little quality. Only use it if a device genuinely refuses `.m4a`.

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

**If FFmpeg is missing or refuses**, the extension does not give up and does not
hand you a broken file. It tries four progressively simpler versions of the
command, and if all of them fail it simply re-downloads the plain audio. You
always end up with something you can play.

---

## What's in this repo

```
manifest.json     What the extension is, what it can do, its settings
index.js          All the actual code
icon.png          The icon you see in the app
build.ps1         Packages everything into a .spotiflac-ext file
test/harness.js   Tests (not shipped inside the extension)
test/gen-icon.js  Draws icon.png
```

---

## Development

```bash
node test/harness.js            # run the 25 tests
VERBOSE=1 node test/harness.js  # with debug output
node test/gen-icon.js           # redraw the icon
```

The test harness fakes the parts of the app that the extension talks to
(`http`, `file`, `ffmpeg`, `storage`, `matching`, `gobackend`) and then runs the
**real** `index.js` against the **live** JioSaavn API. So it checks genuine
behaviour, not a mock-up:

- search, albums, playlists, artists
- HTML symbols like `&quot;` being cleaned out of song titles
- quality picking and falling back
- all four kinds of JioSaavn link
- both shapes of the app's `download()` call
- the exact FFmpeg commands produced
- special characters escaped safely in the details file
- temporary files being deleted afterwards

The one thing it cannot check is FFmpeg genuinely running inside the app — that
part is faked, so the first real download is the true test.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **No search results** | Tap **Test Connection** in settings. If it fails, the free public server is down or rate limited — see the next row. |
| **Server is slow or rate limited** | Deploy your own copy of [jiosaavn-api](https://github.com/sumitkolhe/jiosaavn-api) to Vercel (free), then paste your URL into **API Base URL**. |
| **Progress bar never moves** | Change **Progress Reporting** to `percent`. The download itself was fine either way. |
| **No cover art in the file** | Check **Embed Cover Art & Metadata** is on. If it is, your app build may not include FFmpeg. |
| **Search feels slow** | Set **Search Results** to `songs`. That is one request instead of four. |
| **File will not play on my device** | Enable the **Convert to MP3 320** post-processing option. |
| **Wrong song downloaded** | Search by song *and* artist name together. Without an ISRC, matching is by name and length. |

---

## Honest limitations

- **AAC, not FLAC.** 320 kbps is JioSaavn's ceiling. Anyone offering "JioSaavn
  FLAC" is upscaling, which adds no real quality. Use the Odesli option if you
  want genuine lossless.
- **No lyrics.** JioSaavn's lyrics endpoint returns *404* on the public server,
  and the `lyricsId` field is empty on every song tested. Rather than ship
  something that silently never works, lyrics were left out.
- **No ISRC.** JioSaavn does not publish it, so songs are matched by title,
  artist and duration. This is very reliable but not perfect.
- **Unofficial API.** JioSaavn does not provide or endorse this. It works by
  reading their internal endpoints. If they change something, it breaks. That is
  the nature of it.
- **Free public server.** The default API runs on someone else's free Vercel
  account. Heavy use will hit limits. Self-host if you rely on it.
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
| **[Odesli / song.link](https://odesli.co)** | Free ISRC and cross-service lookups for the lossless upgrade |
| **[FFmpeg](https://ffmpeg.org)** | Combining the audio, artwork and details into one file |

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
