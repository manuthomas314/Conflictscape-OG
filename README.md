# Deciphering Conflicts — India Mining Conflicts & Protests Monitor (2018–Present)

An interactive intelligence map tracking **community opposition, farmer agitations, and Adivasi resistance against mining activities across Indian states** from **2018 to the present**.

---

## 🗺️ Project Scope & Focus

- **Specific Incident Criteria**: Documented public rallies, road/rail blockades, Gram Sabha rejections, sit-ins, and legal resistance specifically where **people and local communities protest against mining operations** (coal, bauxite, iron ore, sandstone, diamond, chromite, and uranium).
- **Segmented by Geographical State**: State-level intelligence and multi-select filtering across key mining belts:
  - **Chhattisgarh**: Hasdeo Arand tree felling opposition, Bailadila Deposit 13 tribal resistance, Raigarh coal block public hearing boycotts.
  - **Jharkhand**: Latehar coal auction dharnas, Netarhat anti-displacement assemblies, Chaibasa iron ore resistance, Jharia fire-zone rehabilitation protests.
  - **Odisha**: Niyamgiri Dongria Kondh defense, Sijimali & Mali Parbat bauxite protests, Dhinkia resistance, Keonjhar mineral corridor blockades.
  - **West Bengal**: Deucha Pachami massive indigenous rallies and torchlight marches.
  - **Goa**: Village protests against iron ore transport dust, water table depletion, and mining renewals.
  - **Madhya Pradesh**: #SaveBuxwaha diamond mining opposition, Singrauli fly ash and coal displacement water sit-ins.
  - **Rajasthan**: Aravalli stone crusher blockades, Bansi Paharpur sanctuary protection protests.
  - **Maharashtra**: Gadchiroli 70-Gram Sabha coalition opposing Surjagarh iron ore expansion, Chandrapur coal farmer strikes.
  - **Karnataka**: Ballari & Sandur farmers' road blockades against iron ore trucks.
  - **Northeast (Assam & Meghalaya)**: #SaveDehingPatkai movement, Jaintia Hills illegal rat-hole mining outcries.
  - **Telangana / Andhra Pradesh**: Save Nallamala tribal movement halting uranium mining.
- **Temporal Bound**: Strictly articles and reports published **from 2018 onwards** (`published >= 2018-01-01`).

---

## 📰 Monitored News Sources

Ten outlets are polled every six hours. Each outlet carries a list of candidate feed URLs that are tried in order, so a retired section feed does not silently drop the outlet; the run log prints which URL each outlet was reached on.

| Outlet | Feeds polled |
| --- | --- |
| NDTV | India News, Latest, Top Stories |
| India.com | News, Main |
| BBC News | India (World/Asia), Science & Environment |
| Times of India | Environment, India, Top Stories |
| India Today | India, Environment/Science, Home |
| Republic | All News, Stories, India News |
| Hindustan Times | India News, Environment, Latest |
| Mongabay India | Main feed |
| The Hindu | Energy & Environment, National |
| Down To Earth | Mining, Environment, Wildlife & Biodiversity |

Every article is stamped with a clean outlet label (`NDTV`, `Times of India`, …) rather than the raw feed title, so the in-app **Source** filter stays readable. Articles are admitted only if they match both a mining pattern *and* a protest pattern, and only if a location can be resolved and geocoded.

---

## 🚀 Key Features

1. **State-Segmented Leaflet Map**:
   - Color-coded pins per Indian state with custom clustering (`leaflet.markercluster`).
   - Official India boundary overlay (`india_boundary.geojson`).
   - Popups showing **State**, **Mineral/Resource**, Headline, Location, Date, and direct link to source reports.
2. **Dynamic State Filters**:
   - Real-time state chips with incident counters (e.g., `Chhattisgarh (8)`, `Jharkhand (7)`, `Odisha (8)`).
   - "All States" and "Clear" quick selection buttons.
3. **Keyword Search**:
   - Filter across headlines, Adivasi groups, mines, companies, districts, and minerals.
4. **Timeline & Date Selector**:
   - Bounded from 2018-01-01 to present.
5. **Top Protest Epicenter Widget**:
   - Dynamically calculates the district and state with the highest concentration of documented community protests.
6. **Ask Deciphering Conflicts Assistant**:
   - Client-side NLP assistant answering natural-language queries (e.g., *"Which state has the most mining protests?"*, *"Hasdeo Arand"*, *"Bauxite resistance in Odisha"*).

---

## 💻 Running & Previewing Locally

Start the local server:
```powershell
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

To run the automated ingestion pipeline locally:

```powershell
python fetch_news.py                          # poll the ten outlets' own feeds (last few days)
python fetch_news.py --backfill               # search Google News across the same ten outlets
python fetch_news.py --backfill --window 8y   # widen the backfill window (default 5y)
python fetch_news.py --verify-links           # check every stored URL, drop the dead ones
python fetch_news.py --purge                  # empty the dataset
```

### Two ingestion modes, and why

The outlets' own RSS feeds carry only the last few days of articles. They keep the dashboard current but **cannot reach backwards** — a plain run will never recover 2018–2024, no matter how often it runs.

`--backfill` queries Google News RSS with a `site:` filter per outlet, which does reach back years. Ten outlets × twenty queries (ten generic topics, ten named conflicts such as Hasdeo, Niyamgiri, Deucha Pachami, Nallamala) = 200 searches, about five minutes with the built-in 1.5s throttle. Run it once to build the archive, then let the scheduled six-hourly runs keep it fresh.

Backfilled articles arrive as `news.google.com/rss/articles/...` redirect URLs that resolve to the publisher — the same form the Regional Edition uses, and they work. The outlet label is taken from the `site:` filter, so `source` is reliable regardless of the wrapper.

### ⚠️ Seed data and link verification

The dataset shipped with the prototype was **seeded demonstration data**: the headlines, places and dates are plausible but the article URLs do not resolve, so every popup link is a dead end. Before treating anything in `news.json` as evidence, verify it:

```powershell
python fetch_news.py --verify-links --dry-run   # report only
python fetch_news.py --verify-links             # drop the dead ones
```

A story is dropped if its URL returns 4xx/5xx or silently redirects to the outlet's homepage. Network errors and rate limits are reported as `UNSURE` and kept, so a flaky connection never deletes good data. Run this periodically — link rot removes real articles too.

`--verify-links` uses only the Python standard library, so it runs regardless of whether spaCy, geopy or feedparser are importable.

### Location resolution

Places are resolved by matching article text against `gazetteer.json`, built from the [GeoNames India dataset](https://download.geonames.org/export/dump/IN.zip) (CC BY 4.0):

```powershell
python build_gazetteer.py
```

This replaces the earlier spaCy NER approach. Three reasons it is better here:

- **Deterministic.** The same article always yields the same coordinates. A general NER model's output shifts between model versions, which is awkward to defend methodologically.
- **Better coverage.** `en_core_web_sm` is trained on general English news; it does not reliably recognise Keonjhar, Bailadila or Hasdeo. GeoNames carries Indian villages and natural features — mountains, forests, protected areas — so the named conflict sites resolve.
- **No dependency stack.** spaCy does not support Python 3.13+, and on 3.14 it raises a pydantic `ConfigError` at import. Dropping it removes that constraint, and `geopy`/Nominatim with it — no per-request rate limit, no network calls during extraction.

`build_gazetteer.py` also writes `gazetteer_source.json` recording the source URL, licence, build timestamp and row counts, so the geographic layer is citable.

**Ambiguous names keep every candidate.** There is a Raniganj in West Bengal (the coal town) and another in Telangana. Both are stored; the article text decides — if it names a state, that candidate wins, otherwise the larger settlement is the prior. `gazetteer_source.json` reports how many names are ambiguous.

**Requirements:** `feedparser` only. Any Python 3.9+, including your 3.14.
