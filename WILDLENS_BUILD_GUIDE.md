# WildLens — Build the Whole Project From Scratch

A zero-cost, self-updating wildlife & environment news map for India.
No server, no paid API, no local installs required — everything runs on
GitHub's free infrastructure.

This document is self-contained: every file's full code is inline below.
You can build the entire project from this file alone.

**Time required:** 45–60 minutes, done entirely in a browser.

---

## Table of contents

1. [How it works](#1-how-it-works)
2. [How RSS reading actually works](#2-how-rss-reading-actually-works)
3. [Create a GitHub account](#3-create-a-github-account)
4. [Create the repository](#4-create-the-repository)
5. [All six project files](#5-all-six-project-files-full-code)
6. [Upload the files to GitHub](#6-upload-the-files-to-github)
7. [Turn on GitHub Pages (hosting)](#7-turn-on-github-pages-hosting)
8. [Give Actions write permission](#8-give-actions-write-permission)
9. [Run the pipeline for the first time](#9-run-the-pipeline-for-the-first-time)
10. [Confirm it worked](#10-confirm-it-worked)
11. [Customize it](#11-customize-it)
12. [Data sources — what's safe to use](#12-data-sources--whats-safe-to-use)
13. [Troubleshooting](#13-troubleshooting)
14. [What actually makes this good (vs. a toy demo)](#14-what-actually-makes-this-good)
15. [Optional: run it locally first](#15-optional-run-it-locally-first)

---

## 1. How it works

```
  RSS feeds          GitHub Actions (cron)            GitHub Pages
  (free, public  →   runs fetch_news.py every    →    serves index.html
   news feeds)        6 hours, writes a JSON           + the JSON file
                       file of geolocated stories       to any visitor
```

There is no server you rent or maintain. The "backend" is a script that
runs on a timer and rewrites one JSON file. The "website" is one HTML
file that reads that JSON file. Both are free because the GitHub repo
is public — public repos get unlimited free Actions minutes and free
Pages hosting.

**The six files you need**, all provided in full below:

| File | Job |
|---|---|
| `fetch_news.py` | Fetches news, extracts locations, geocodes them, writes `data/stories.json` |
| `gazetteer.json` | Lookup table of place name → lat/lon. Grows automatically over time. |
| `index.html` | The map page people visit |
| `requirements.txt` | Python libraries the pipeline needs |
| `.github/workflows/update.yml` | The every-6-hours schedule definition |
| `data/stories.json` | The data file the map reads (seeded with demo pins to start) |

---

## 2. How RSS reading actually works

Before building, it's worth understanding the core trick, because it's
what keeps this project both free and safe to run.

**RSS is a file a website publishes on purpose** so machines can read its
latest headlines in a clean, structured format — no login, no scraping,
no bypassing anything. It's the publisher propping the door open.

The project uses a Python library called **feedparser** to read these
files:

```python
import feedparser

parsed = feedparser.parse("https://india.mongabay.com/feed/")

# Metadata about the feed itself:
parsed.feed.title        # e.g. "Mongabay India"

# The actual stories, as a list:
for entry in parsed.entries:
    entry.title                        # headline
    entry.link                         # URL to the full article
    entry.get('summary', '')           # short description (may be missing)
    entry.get('published_parsed')      # publish date, already parsed
```

`feedparser.parse(url)` does three things for you: fetches the raw XML
over HTTP, parses that XML, and hands you back clean Python objects —
`parsed.feed` (info about the feed) and `parsed.entries` (a list of
story dictionaries). You never touch raw XML.

Practical quirks worth knowing:
- Not every field is guaranteed to exist on every entry — that's why
  the code uses `.get('summary', '')` instead of `entry.summary`, so a
  missing field doesn't crash the whole run.
- Feeds are usually truncated to the last 10–20 items, which is why the
  pipeline runs every 6 hours — to catch new stories before they scroll
  off the feed.
- RSS never gives you the full article body, only a short summary — the
  project reads just enough to extract a location, then links out to
  the original site for the rest. This is also what keeps it copyright-safe:
  you're indexing and linking, not republishing.

This project **never** logs in, solves a CAPTCHA, goes behind a
paywall, or stores full article text. It reads only what's already
being freely broadcast.

---

## 3. Create a GitHub account

1. Go to **https://github.com** → click **Sign up**.
2. Enter an email, create a password, choose a **username**. This
   becomes part of your live URL later (username `priya` →
   `priya.github.io`), so pick one you're happy to show publicly. It's
   annoying to change later.
3. Verify via the emailed code.
4. When asked about a plan, choose **Free**. Nothing in this guide
   requires a paid plan.

---

## 4. Create the repository

A "repository" (repo) is a project folder that lives on GitHub.

1. Click the **+** icon top-right → **New repository**.
2. **Repository name:** `wildlens`
3. **Visibility:** set to **Public**.
   *This matters* — public repos get unlimited free GitHub Actions
   minutes and free GitHub Pages hosting. Private repos have limits.
4. Tick **Add a README file**.
5. Click **Create repository**.

---

## 5. All six project files (full code)

Create these exactly as named, preserving the folder structure. You'll
upload them in Section 6.

### `fetch_news.py`

```python
"""
WildLens pipeline.
Fetch wildlife/environment news -> extract place names -> geocode -> data/stories.json

Runs entirely in CI. No backend, no paid APIs.
Geocoding strategy: gazetteer lookup first (free, instant), Nominatim fallback
for unknown places, then cache the result back into the gazetteer so each place
is only ever geocoded once.
"""

import json
import time
import hashlib
from pathlib import Path
from datetime import datetime, timezone, timedelta

import feedparser
import spacy
from geopy.geocoders import Nominatim

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# RSS feeds. No API key, no scraping. Verify any feed by opening the URL
# in a browser first -- you should see readable XML with real headlines.
FEEDS = [
    "https://india.mongabay.com/feed/",
    "https://www.downtoearth.org.in/rss/wildlife-biodiversity",
    "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss",
]

# Only keep stories that look on-topic. Cheap keyword gate before NLP.
TOPIC_KEYWORDS = {
    "wildlife", "forest", "tiger", "leopard", "elephant", "poaching", "poacher",
    "sanctuary", "reserve", "conservation", "species", "habitat", "biodiversity",
    "endangered", "nesting", "wetland", "deforestation", "mangrove", "rhino",
    "conflict", "park", "ecology", "river", "pollution", "climate",
}

GAZETTEER_PATH = Path("gazetteer.json")
OUTPUT_PATH = Path("data/stories.json")
MAX_AGE_DAYS = 30          # drop stories older than this so the map stays current
NOMINATIM_AGENT = "wildlens-demo"   # set to your project name; required by their TOS

# ---------------------------------------------------------------------------
# Load resources
# ---------------------------------------------------------------------------

nlp = spacy.load("en_core_web_sm")
gazetteer = json.loads(GAZETTEER_PATH.read_text()) if GAZETTEER_PATH.exists() else {}
geocoder = Nominatim(user_agent=NOMINATIM_AGENT)


def geocode(name: str):
    """Return (lat, lon) for a place name, or None. Gazetteer first, then
    Nominatim, caching any new hit back into the gazetteer."""
    key = name.strip().lower()
    if key in gazetteer:
        return gazetteer[key]
    try:
        # Bias to India; remove ', India' if you go global.
        loc = geocoder.geocode(f"{name}, India", timeout=10)
        time.sleep(1.1)  # Nominatim allows ~1 req/sec. Respect it or get blocked.
    except Exception:
        return None
    if loc is None:
        gazetteer[key] = None  # cache the miss too, so we don't retry every run
        return None
    coords = {"lat": loc.latitude, "lon": loc.longitude}
    gazetteer[key] = coords
    return coords


def extract_location(text: str):
    """First place entity (GPE/LOC) that we can geocode."""
    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ in ("GPE", "LOC"):
            coords = geocode(ent.text)
            if coords:
                return ent.text, coords
    return None, None


def is_on_topic(text: str) -> bool:
    low = text.lower()
    return any(k in low for k in TOPIC_KEYWORDS)


def story_id(link: str) -> str:
    return hashlib.sha1(link.encode()).hexdigest()[:12]


def parse_date(entry) -> str:
    if getattr(entry, "published_parsed", None):
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Load existing stories so each run accumulates rather than overwrites.
    existing = {}
    if OUTPUT_PATH.exists():
        for s in json.loads(OUTPUT_PATH.read_text()):
            existing[s["id"]] = s

    for feed_url in FEEDS:
        parsed = feedparser.parse(feed_url)
        source = parsed.feed.get("title", feed_url)
        for entry in parsed.entries:
            sid = story_id(entry.link)
            if sid in existing:
                continue  # already mapped
            text = f"{entry.title} {entry.get('summary', '')}"
            if not is_on_topic(text):
                continue
            name, coords = extract_location(text)
            if not coords:
                continue
            existing[sid] = {
                "id": sid,
                "title": entry.title,
                "link": entry.link,
                "date": parse_date(entry),
                "source": source,
                "location": name,
                "lat": coords["lat"],
                "lon": coords["lon"],
            }

    # Drop stale stories.
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)
    fresh = [
        s for s in existing.values()
        if datetime.fromisoformat(s["date"]) >= cutoff
    ]
    fresh.sort(key=lambda s: s["date"], reverse=True)

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(fresh, indent=2, ensure_ascii=False))
    GAZETTEER_PATH.write_text(json.dumps(gazetteer, indent=2, ensure_ascii=False))
    print(f"Wrote {len(fresh)} stories. Gazetteer has {len(gazetteer)} entries.")


if __name__ == "__main__":
    main()
```

### `gazetteer.json`

This is a seed set. It grows automatically every time the pipeline
geocodes a new place via Nominatim.

```json
{
  "uttarakhand": {"lat": 30.0668, "lon": 79.0193},
  "odisha": {"lat": 20.9517, "lon": 85.0985},
  "jim corbett national park": {"lat": 29.5300, "lon": 78.7747},
  "kaziranga national park": {"lat": 26.5775, "lon": 93.1711},
  "sundarbans": {"lat": 21.9497, "lon": 88.9000},
  "gir national park": {"lat": 21.1240, "lon": 70.8240},
  "ranthambore": {"lat": 26.0173, "lon": 76.5026},
  "bandipur": {"lat": 11.6543, "lon": 76.6320},
  "western ghats": {"lat": 13.0000, "lon": 75.5000},
  "wayanad": {"lat": 11.6854, "lon": 76.1320},
  "assam": {"lat": 26.2006, "lon": 92.9376},
  "kerala": {"lat": 10.8505, "lon": 76.2711},
  "tamil nadu": {"lat": 11.1271, "lon": 78.6569},
  "madhya pradesh": {"lat": 22.9734, "lon": 78.6569}
}
```

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WildLens — wildlife &amp; environment news map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    :root {
      --ink: #14271c;
      --paper: #f3f1e9;
      --moss: #3f6b3a;
      --bark: #6b5440;
      --alert: #b23b2e;
      --water: #2f6b8f;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; font-family: ui-sans-serif, system-ui, sans-serif; color: var(--ink); }
    #app { display: grid; grid-template-rows: auto 1fr; height: 100%; }
    header {
      background: var(--ink); color: var(--paper);
      padding: 12px 20px; display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;
    }
    header h1 { font-size: 1.1rem; margin: 0; letter-spacing: .02em; font-weight: 700; }
    header .tag { font-size: .8rem; opacity: .75; }
    header .count { margin-left: auto; font-size: .8rem; opacity: .85; }
    .legend { display: flex; gap: 14px; font-size: .75rem; flex-wrap: wrap; }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    #map { width: 100%; height: 100%; background: #dfe6df; }
    .leaflet-popup-content { font-size: .85rem; line-height: 1.45; }
    .leaflet-popup-content h3 { margin: 0 0 4px; font-size: .92rem; }
    .leaflet-popup-content .meta { color: #555; font-size: .75rem; margin-bottom: 6px; }
    .leaflet-popup-content a { color: var(--moss); font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div id="app">
    <header>
      <h1>WildLens</h1>
      <span class="tag">wildlife &amp; environment news across India</span>
      <div class="legend">
        <span><i class="dot" style="background:var(--alert)"></i>threat / conflict</span>
        <span><i class="dot" style="background:var(--moss)"></i>conservation</span>
        <span><i class="dot" style="background:var(--water)"></i>water / coast</span>
        <span><i class="dot" style="background:var(--bark)"></i>other</span>
      </div>
      <span class="count" id="count">loading…</span>
    </header>
    <div id="map"></div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([22.5, 80], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Category color derived client-side from the headline. No backend needed.
    function categoryColor(text) {
      const t = text.toLowerCase();
      if (/poach|conflict|kill|threat|deforest|encroach|illegal|seiz/.test(t)) return '#b23b2e';
      if (/conserv|rescue|nesting|sighting|reintroduc|protect|sanctuary|win/.test(t)) return '#3f6b3a';
      if (/turtle|river|wetland|mangrove|coast|marine|dolphin|fish/.test(t)) return '#2f6b8f';
      return '#6b5440';
    }

    function pin(color) {
      return L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};
               border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
    }

    fetch('data/stories.json')
      .then(r => r.json())
      .then(stories => {
        document.getElementById('count').textContent = `${stories.length} stories mapped`;
        stories.forEach(s => {
          const color = categoryColor(s.title);
          const date = new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          L.marker([s.lat, s.lon], { icon: pin(color) })
            .addTo(map)
            .bindPopup(`
              <h3>${s.title}</h3>
              <div class="meta">${s.location} · ${date} · ${s.source}</div>
              <a href="${s.link}" target="_blank" rel="noopener">Read full article →</a>
            `);
        });
      })
      .catch(() => {
        document.getElementById('count').textContent = 'no data yet — run the pipeline';
      });
  </script>
</body>
</html>
```

### `requirements.txt`

```
feedparser>=6.0
spacy>=3.7
geopy>=2.4
```

### `.github/workflows/update.yml`

The filename and folder path matter — GitHub only recognizes workflow
files at exactly `.github/workflows/*.yml`.

```yaml
name: Update WildLens

on:
  schedule:
    - cron: "0 */6 * * *"   # every 6 hours (UTC)
  workflow_dispatch:          # lets you trigger it manually from the Actions tab

permissions:
  contents: write             # needed so the job can commit data back

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          python -m spacy download en_core_web_sm

      - name: Run pipeline
        run: python fetch_news.py

      - name: Commit results
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/stories.json gazetteer.json
          git commit -m "Update stories $(date -u +'%Y-%m-%d %H:%M UTC')" || echo "No changes"
          git push
```

### `data/stories.json`

Seed this with demo pins so your map isn't blank before the first real
run.

```json
[
  {
    "id": "1ea73a27be2e",
    "title": "Leopard rescued from well in Uttarakhand",
    "link": "https://example.com/1ea73a27be2e",
    "date": "2026-09-01T10:00:00+00:00",
    "source": "Mongabay India",
    "location": "Uttarakhand",
    "lat": 30.0668,
    "lon": 79.0193
  },
  {
    "id": "2f9b1c4d5e6a",
    "title": "Olive ridley turtles begin mass nesting on Odisha coast",
    "link": "https://example.com/2f9b1c4d5e6a",
    "date": "2026-09-02T08:30:00+00:00",
    "source": "The Hindu",
    "location": "Odisha",
    "lat": 20.9517,
    "lon": 85.0985
  },
  {
    "id": "3a8c2e5f7b1d",
    "title": "Tiger numbers climb in Bandipur reserve",
    "link": "https://example.com/3a8c2e5f7b1d",
    "date": "2026-09-03T14:15:00+00:00",
    "source": "Down To Earth",
    "location": "Bandipur",
    "lat": 11.6543,
    "lon": 76.6320
  },
  {
    "id": "4b7d3f6a8c2e",
    "title": "Poaching ring busted near Kaziranga National Park",
    "link": "https://example.com/4b7d3f6a8c2e",
    "date": "2026-09-04T09:45:00+00:00",
    "source": "Mongabay India",
    "location": "Kaziranga National Park",
    "lat": 26.5775,
    "lon": 93.1711
  },
  {
    "id": "5c6e4a7b9d3f",
    "title": "Human-elephant conflict rises in Wayanad",
    "link": "https://example.com/5c6e4a7b9d3f",
    "date": "2026-09-05T11:20:00+00:00",
    "source": "The Hindu",
    "location": "Wayanad",
    "lat": 11.6854,
    "lon": 76.1320
  }
]
```

---

## 6. Upload the files to GitHub

### Option A — drag-and-drop upload (fastest for most files)

1. On your repo's main page, click **Add file** → **Upload files**.
2. Save the code blocks above into local files matching the names
   exactly, then drag `fetch_news.py`, `gazetteer.json`, `index.html`,
   `requirements.txt`, and the `data` folder (containing `stories.json`)
   into the upload box.
3. Commit with the default message.

Folders starting with a dot (like `.github`) are sometimes hidden by
file managers and may not drag-and-drop cleanly — use Option B for
that one.

### Option B — create files by hand in the browser

To create a file inside a folder that doesn't exist yet, type the full
path into the filename box — GitHub creates the folders automatically.

1. **Add file** → **Create new file**.
2. Filename box: type exactly `.github/workflows/update.yml`
3. Paste the workflow YAML content from Section 5.
4. **Commit changes**.

Repeat this pattern for any file that didn't upload correctly.

### Verify your file tree

Your repo should look like this:

```
wildlens/
├─ .github/
│  └─ workflows/
│     └─ update.yml
├─ data/
│  └─ stories.json
├─ fetch_news.py
├─ gazetteer.json
├─ index.html
├─ requirements.txt
└─ README.md
```

If `.github/workflows/update.yml` is missing, the scheduled job doesn't
exist yet — go back and add it.

---

## 7. Turn on GitHub Pages (hosting)

1. **Settings** (top menu of your repo) → **Pages** (left sidebar).
2. **Build and deployment** → **Source**: choose **Deploy from a branch**.
3. **Branch**: `main`, folder `/ (root)` → **Save**.
4. Wait ~1 minute, refresh. A banner shows your live URL:
   `https://yourname.github.io/wildlens`

Open it. You should see the map with the five demo pins. If the map
renders with pins, hosting works.

---

## 8. Give Actions write permission

The scheduled job needs permission to commit new data back into your repo.

1. **Settings** → **Actions** → **General**.
2. Scroll to **Workflow permissions**.
3. Select **Read and write permissions** → **Save**.

Skip this and the job will run but fail silently to save its output —
the map will never update.

---

## 9. Run the pipeline for the first time

Don't wait 6 hours for the first data.

1. **Actions** tab (top menu).
2. If prompted to enable workflows, click to enable them.
3. Left sidebar → **Update WildLens**.
4. **Run workflow** button → **Run workflow** in the dropdown.
5. Click into the run, then the **update** job, to watch live logs.

First run takes 2–4 minutes (installing Python packages and the spaCy
language model). Watch for each step going green: checkout → setup
Python → install dependencies → run pipeline → commit results.

The "Run pipeline" step logs a line like:
`Wrote 23 stories. Gazetteer has 31 entries.`

---

## 10. Confirm it worked

1. Repo main page → **commits** (clock icon). Look for a fresh commit
   by **github-actions[bot]** titled "Update stories …" — that's the
   robot saving real data.
2. Open `data/stories.json` in the repo — it should now contain real
   headlines, not the five demo entries.
3. Reload `https://yourname.github.io/wildlens` — real, current stories
   should appear as pins. Click one → headline, location, date, source,
   and a link to the full article.

From here it runs itself, every 6 hours, forever (with one caveat — see
Section 13 on inactivity pausing).

---

## 11. Customize it

Edit any file in the browser: open it in your repo, click the **pencil
icon**, edit, **Commit changes**. Changes apply on the next scheduled
run, or trigger a manual run (Section 9) to see them immediately.

**In `fetch_news.py`:**
- `FEEDS` — the list of RSS feed URLs. Add outlets you care about.
  Verify each one by opening it directly in a browser first — you
  should see readable XML with real, relevant headlines. A feed that
  looks valid but returns the wrong region's news (e.g. a *global*
  feed instead of an *India* feed) will fail silently and quietly
  pollute your map — this is the single most common mistake.
- `TOPIC_KEYWORDS` — words that decide relevance. Tighten to cut noise,
  widen to catch more.
- `geocode(...)` — appends `", India"` to bias searches; remove if you
  expand beyond India.

**In `index.html`:**
- `map.setView([22.5, 80], 5)` — starting center (lat, lon) and zoom.
- `categoryColor(...)` — the regex rules that color-code pins.

---

## 12. Data sources — what's safe to use

This project reads **only public RSS feeds** — files a publisher
deliberately makes available for machines to read. It never logs in,
solves a CAPTCHA, goes behind a paywall, or stores full article text —
only headline, short summary, date, source, and a link back to the
original site (which gets the traffic).

Verified starter feeds:

| Source | Feed URL |
|---|---|
| Mongabay India | `https://india.mongabay.com/feed/` |
| Down To Earth (wildlife & biodiversity) | `https://www.downtoearth.org.in/rss/wildlife-biodiversity` |
| The Hindu (energy & environment) | `https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss` |

Mongabay India also publishes **topic-** and **location-specific**
feeds, which are worth using for a tighter, less noisy stream:

```
https://india.mongabay.com/feed/?post_type=post&feedtype=bulletpoints&topic=animals
https://india.mongabay.com/feed/?post_type=post&feedtype=bulletpoints&location=karnataka
```

**A general safety rule if you ever add sources without RSS feeds:**
reading a public page anyone can view without logging in is generally
fine. You cross into unsafe/prohibited territory if you: bypass a
login or paywall, defeat anti-bot measures (CAPTCHAs, IP-block evasion),
ignore a site's `robots.txt` or Terms of Service, or hit a server with
so many requests you degrade it. This project avoids all of that by
design — feeds only.

---

## 13. Troubleshooting

**Actions run failed (red X).**
Click the run → the failed step → read the log.
- *Permission/push error* → you skipped Section 8. Fix workflow
  permissions.
- *A feed URL is dead* → feedparser skips bad feeds silently, but a
  typo'd URL returns nothing. Check by opening the URL directly.
- *spaCy model error* → confirm the `python -m spacy download
  en_core_web_sm` line is present in `update.yml`.

**Map is completely blank (no tiles).**
- Pages may still be building — wait a few minutes, hard-refresh.
- Confirm `index.html` is in the repo **root**, not a subfolder.

**Map loads but shows no pins.**
- Open `yourname.github.io/wildlens/data/stories.json` directly. If
  it's `[]`, the pipeline found no on-topic stories whose location was
  in the gazetteer, or your feeds returned nothing new this run.
- Paths and filenames are case-sensitive on the web — `data/stories.json`
  must match exactly.

**"Read full article" links are broken.**
- Comes straight from the source feed; occasionally a publisher's feed
  has malformed links. Not fixable from your side.

**The schedule silently stopped running.**
- GitHub auto-pauses scheduled workflows on public repos after 60 days
  with **no commits at all**. Since the bot commits new data on every
  successful run, an active pipeline keeps itself alive. This only
  bites if the pipeline stops finding stories for two straight months —
  a manual "Run workflow" click (Section 9) re-arms it instantly.
- Cron schedules on GitHub's free tier aren't exact — runs can start
  minutes to roughly an hour late under load. Fine for a news map, not
  for anything time-critical.

---

## 14. What actually makes this good

The GitHub plumbing above is the easy 80%. The remaining 20% is what
separates a working demo from a genuinely useful map:

- **The gazetteer is the real product.** spaCy's NER will happily tag
  "India" or "the Western Ghats" as a location and drop an imprecise
  pin. Hand-curated coordinates for every park, tiger reserve, wildlife
  sanctuary, and district headquarters beat a generic geocoder every
  time. Growing `gazetteer.json` deliberately — not just letting
  Nominatim fill it passively — is where the accuracy comes from.
- **Relevance filtering is never "done."** `tiger` also matches "Tiger
  Global" funding news. Expect to keep tuning `TOPIC_KEYWORDS` as junk
  appears.
- **Coverage is bounded by feed quality.** You can only reliably map
  outlets with clean, well-maintained RSS feeds. Accept gaps rather
  than reaching for fragile HTML scraping to fill them.

---

## 15. Optional: run it locally first

Not required, but useful if you want to iterate faster than committing
to GitHub each time.

1. Install Python 3.11+ from python.org.
2. In the project folder, in a terminal:
   ```
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   python fetch_news.py
   ```
3. Preview the map locally:
   ```
   python -m http.server 8000
   ```
   then open `http://localhost:8000` in a browser.

When satisfied, copy your changes back into the GitHub file editor (or
learn `git` to push directly from your machine).
