# Conflictscape

Reported environmental conflicts in India, read from ten national news outlets
and sorted into six types — each keyed to the element of social practice the
conflict primarily disrupts.

The site is one page: a narrative that explains the inclusion rule and the
typology, ending in the working record. Everything the reader can click — a
type card, a state bar, an outlet row, the water tag — is the same filter, so
the argument and the browser never fall out of step.

**Live axes:** conflict type · state · news outlet.

---

## The typology

Six mutually exclusive types. The type is decided by what the conflict does to
practice, not by the sector of the actor involved — which is why a plantation
company and a state land bank land in the same type.

| # | Type | Practice element disrupted | Absorbs |
|---|------|---------------------------|---------|
| 1 | Extractive Resource Conflicts | Materials + Competences | Mining; extraction-driven energy and climate conflicts |
| 2 | Land-Use and Agrarian Conflicts | Materials + Meanings | Land-use; biomass and land-use conflicts |
| 3 | Infrastructure and Mobility Conflicts | Materials | — |
| 4 | Conservation and Biodiversity Conflicts | Meanings | Biodiversity; tourism-related conflicts |
| 5 | Industrial Pollution Conflicts | Materials | — |
| 6 | Waste and Disposal Conflicts | Materials + Meanings | Waste management conflicts |

**Water is a tag, not a seventh type.** Water conflicts in India are numerous
and distinct enough to defend as their own type, but they do not share a
practice disruption: a bottling plant drawing down an aquifer removes a
resource, a canal reallocating irrigation water breaks an agrarian practice,
and a reservoir submerging villages is built infrastructure. Water therefore
runs as a cross-cutting tag — every water conflict keeps its practice type and
is still countable as water, and the spread across types is a finding rather
than something the categories hide. `national_policy` is the second tag,
marking non-place-based protests against national environmental instruments.

Everything above lives in **`conflict_types.py`**, which is the lexicon of
record: the six keyword sets, the two gates, the tag definitions, the scoring
weights and the backfill queries. Change the typology there and the pipeline,
the JSON and the page all follow.

## Inclusion rule

An article becomes a record only if **both** are present:

1. an environmental object of contention, and
2. contestation by, or on behalf of, the affected population.

Excluded regardless of type score: labour and privatisation disputes at the
same sites; agricultural market policy, including the 2021 farm laws movement;
wildlife-crime enforcement; and disaster reporting where nobody is contesting
anything.

## Monitored outlets

NDTV · India.com · BBC News · Times of India · India Today · Republic ·
Hindustan Times · Mongabay India · The Hindu · Down To Earth

Two ingestion modes, because they do different jobs. The outlets' own RSS feeds
carry only the last few days, so a plain run keeps the site current but can
never reach backwards. `--backfill` queries Google News with a `site:` filter
per outlet and reaches back years.

---

## Running it

```bash
pip install -r requirements.txt

python build_gazetteer.py        # once — downloads GeoNames IN.zip, writes gazetteer.json
python build_map.py              # once — writes india.js from india_boundary.geojson

python fetch_news.py --backfill  # build the archive across all six types (~25 min)
python fetch_news.py             # keep it current; this is what CI runs
```

| Command | What it does |
|---|---|
| `python fetch_news.py` | Poll the ten outlets' own feeds |
| `python fetch_news.py --backfill` | Google News search across all six types |
| `python fetch_news.py --backfill --types waste,conservation` | Backfill selected types only |
| `python fetch_news.py --backfill --window 8y` | Widen the recency window (default `5y`) |
| `python fetch_news.py --reclassify` | Re-score stored records against the current lexicon |
| `python fetch_news.py --stats` | Distribution by type, tag, state and outlet |
| `python fetch_news.py --verify-links --dry-run` | Report dead links without changing anything |
| `python fetch_news.py --verify-links` | Drop the dead ones |
| `python fetch_news.py --purge` | Empty the dataset |
| `python conflict_types.py` | Self-test the classifier on built-in examples |

Serve the site with any static server — `python -m http.server` in this
directory is enough. `data.js` inlines the records so `file://` works too.

### After editing the lexicon

```bash
python conflict_types.py          # check the examples still classify as expected
python fetch_news.py --reclassify # re-score the archive, then read the stats
```

`--reclassify` skips the contestation gate and drops the evidence bar to a
single term, because stored records carry only a headline and already passed a
harvest-time filter. Every record keeps its `margin` — the gap to the
runner-up type — and a margin of 0 or 1 is the flag to read that record by
hand. The page marks those `thin margin`.

---

## Files

| File | Role |
|---|---|
| `conflict_types.py` | Typology, lexicon, gates, classifier, backfill queries |
| `fetch_news.py` | Ingestion, gazetteer matching, link verification, outputs |
| `build_gazetteer.py` | GeoNames India → `gazetteer.json` |
| `build_map.py` | `india_boundary.geojson` → `india.js` (SVG path, Web Mercator) |
| `index.html` · `style.css` · `app.js` | The page |
| `india.js` | Generated map outline |
| `news.json` | The record of the dataset |
| `data/stories.json` · `data.js` · `taxonomy.json` | Mirrors the page reads |
| `.github/workflows/update.yml` | Six-hourly feed poll, commits new records |

`conflict_detector.py` and `map.js` are superseded stubs kept so old imports and
bookmarks do not break; both can be deleted once nothing references them.

### The map

Conflictscape draws its own outline rather than pulling raster tiles: no tile
server, no third-party map library, no external stylesheet, the same picture
offline as online, and a map that follows the light and dark themes like the
rest of the page. `build_map.py` projects `india_boundary.geojson` to Web
Mercator, simplifies it with Ramer–Douglas–Peucker and writes a single SVG
path; `app.js` handles pan and zoom with one transform.

---

## What the numbers are not

- **Not a census of conflict.** A census of *reporting* on conflict, by ten
  English-language outlets. A state with an active bureau is over-represented
  against one without.
- **Not one row per conflict.** A long-running case generates many articles;
  each is a record.
- **Not adjudicated.** The classifier reads words, not merits.
- **Not exhaustive on place.** Articles naming no resolvable place are dropped
  rather than guessed at. Records whose only location is a state name are drawn
  with a dashed mark at that state's gazetteer point, which is not the conflict
  site.

## Sources and licences

Headlines, dates, outlet names and links only — article text remains the
property of the publishing outlet. Place names and coordinates from
[GeoNames](https://www.geonames.org/), CC BY 4.0; cite GeoNames if this
gazetteer underpins published work.

The typology is original to this project and grounded in social practice theory
(Shove, Pantzar & Watson, 2012).

Built for the doctoral project *Typology and Determinants of Environmental
Conflicts in India through Social Practice Theory*, Institute of Spatial
Management, Wrocław University of Environmental and Life Sciences, funded by
NCN PRELUDIUM 25.
