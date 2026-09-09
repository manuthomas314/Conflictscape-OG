"""
Conflictscape — environmental conflict monitor for India (2018–present).
Pipeline: RSS → conflict gate → six-type classification → gazetteer → news.json

Ten monitored outlets: NDTV, India.com, BBC News, Times of India, India Today,
Republic, Hindustan Times, Mongabay India, The Hindu, Down To Earth.

The typology, the keyword lexicon and the classifier all live in
conflict_types.py — this file is ingestion, location resolution and output.

Locations come from gazetteer.json, built by build_gazetteer.py from the
GeoNames India dataset. No NER model and no geocoding API: the same article
always yields the same coordinates, and Indian villages and natural features
an English NER model has never heard of are covered.

Usage:
    python fetch_news.py                          # poll the ten outlets' feeds
    python fetch_news.py --backfill               # search Google News, all six types
    python fetch_news.py --backfill --types waste,conservation
    python fetch_news.py --backfill --window 8y   # widen the window (default 5y)
    python fetch_news.py --reclassify             # re-score stored records in place
    python fetch_news.py --verify-links           # check stored URLs, drop dead ones
    python fetch_news.py --verify-links --dry-run # report only
    python fetch_news.py --stats                  # distribution by type, state, source
    python fetch_news.py --purge                  # empty the dataset

Two ingestion modes, because they do different jobs. The outlets' own feeds
carry only the last few days, so a plain run keeps the dashboard current but
can never reach backwards. --backfill queries Google News with a `site:` filter
per outlet and reaches back years; run it once to build the archive, then let
the scheduled plain runs keep it fresh.
"""

import argparse
import json
import time
import re
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse, quote_plus

import conflict_types as ct

# feedparser is the one optional dependency left. Caught with a bare
# `except Exception` rather than `except ImportError` so an import that raises
# rather than fails degrades instead of taking the whole script down.
_OPTIONAL_NOTES = []

try:
    import feedparser
except Exception as e:
    feedparser = None
    _OPTIONAL_NOTES.append(f"feedparser unavailable ({type(e).__name__}) — cannot fetch new articles")


# ---------------------------------------------------------------------------
# Outlets
# ---------------------------------------------------------------------------
# Each outlet lists candidate feed URLs, tried in order; every URL that yields
# entries is consumed, so a retired section feed does not silently kill the
# outlet. `source` is the label written into news.json — it drives the Source
# axis in the UI, so it stays a clean outlet name, not the raw feed title.

OUTLETS = [
    {"source": "NDTV", "urls": [
        "https://feeds.feedburner.com/ndtvnews-india-news",
        "https://feeds.feedburner.com/ndtvnews-latest",
        "https://feeds.feedburner.com/ndtvnews-top-stories",
    ]},
    {"source": "India.com", "urls": [
        "https://www.india.com/news/feed/",
        "https://www.india.com/feed/",
    ]},
    {"source": "BBC News", "urls": [
        "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml",
        "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    ]},
    {"source": "Times of India", "urls": [
        "https://timesofindia.indiatimes.com/rssfeeds/2647163.cms",       # Environment
        "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",   # India
        "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    ]},
    {"source": "India Today", "urls": [
        "https://www.indiatoday.in/rss/1206578",   # India
        "https://www.indiatoday.in/rss/1206584",   # Environment / Science
        "https://www.indiatoday.in/rss/home",
    ]},
    {"source": "Republic", "urls": [
        "https://www.republicworld.com/rss/all-news.xml",
        "https://www.republicworld.com/stories.rss",
        "https://www.republicworld.com/rss/india-news.xml",
    ]},
    {"source": "Hindustan Times", "urls": [
        "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
        "https://www.hindustantimes.com/feeds/rss/environment/rssfeed.xml",
        "https://www.hindustantimes.com/feeds/rss/latest/rssfeed.xml",
    ]},
    {"source": "Mongabay India", "urls": [
        "https://india.mongabay.com/feed/",
    ]},
    {"source": "The Hindu", "urls": [
        "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss",
        "https://www.thehindu.com/news/national/feeder/default.rss",
    ]},
    {"source": "Down To Earth", "urls": [
        "https://www.downtoearth.org.in/rss/mining",
        "https://www.downtoearth.org.in/rss/environment",
        "https://www.downtoearth.org.in/rss/waste",
        "https://www.downtoearth.org.in/rss/water",
        "https://www.downtoearth.org.in/rss/wildlife-biodiversity",
        "https://www.downtoearth.org.in/rss/agriculture",
    ]},
]

USER_AGENT = "Mozilla/5.0 (compatible; Conflictscape/2.0; +https://github.com/)"

GAZETTEER_PATH = Path("gazetteer.json")
NEWS_JSON_PATH = Path("news.json")
MIN_DATE = "2018-01-01"


# ---------------------------------------------------------------------------
# States and union territories
# ---------------------------------------------------------------------------
# Used when the gazetteer entry carries no state, and to disambiguate places
# that share a name. Landmark conflict sites are listed alongside the state
# name because headlines name the site far more often than the state.

STATE_KEYWORDS = {
    "Andhra Pradesh": [r"\bandhra pradesh\b", r"\bandhra\b", r"\bvisakhapatnam\b", r"\bvizag\b", r"\bamaravati\b", r"\bkakinada\b", r"\bpolavaram\b", r"\bnellore\b"],
    "Arunachal Pradesh": [r"\barunachal\b", r"\bsubansiri\b", r"\bdibang\b", r"\bsiang\b", r"\bitanagar\b"],
    "Assam": [r"\bassam\b", r"\bdehing patkai\b", r"\bkaziranga\b", r"\bguwahati\b", r"\bdibrugarh\b", r"\btinsukia\b", r"\bbaghjan\b"],
    "Bihar": [r"\bbihar\b", r"\bpatna\b", r"\bgaya\b", r"\bmuzaffarpur\b", r"\bbhagalpur\b", r"\brohtas\b"],
    "Chhattisgarh": [r"\bchhattisgarh\b", r"\bhasdeo\b", r"\bkorba\b", r"\bbastar\b", r"\braigarh\b", r"\bdantewada\b", r"\bbailadila\b", r"\bsurguja\b", r"\braipur\b", r"\bsarguja\b"],
    "Goa": [r"\bgoa\b", r"\bsanguem\b", r"\bchandor\b", r"\bsonshi\b", r"\bbicholim\b", r"\bmollem\b", r"\bpanaji\b"],
    "Gujarat": [r"\bgujarat\b", r"\bkutch\b", r"\bkachchh\b", r"\bmundra\b", r"\bvapi\b", r"\bankleshwar\b", r"\bbhavnagar\b", r"\bahmedabad\b", r"\bsurat\b", r"\bnarmada\b"],
    "Haryana": [r"\bharyana\b", r"\baravalli\b", r"\bgurugram\b", r"\bgurgaon\b", r"\bfaridabad\b", r"\bkhori\b", r"\bpanipat\b"],
    "Himachal Pradesh": [r"\bhimachal\b", r"\bkinnaur\b", r"\blahaul\b", r"\bspiti\b", r"\bshimla\b", r"\bkullu\b", r"\bmandi\b", r"\bsutlej\b"],
    "Jharkhand": [r"\bjharkhand\b", r"\bdhanbad\b", r"\bjharia\b", r"\blatehar\b", r"\bchaibasa\b", r"\bwest singhbhum\b", r"\bpakur\b", r"\bbokaro\b", r"\bnetarhat\b", r"\branchi\b"],
    "Karnataka": [r"\bkarnataka\b", r"\bballari\b", r"\bbellary\b", r"\bsandur\b", r"\bkudremukh\b", r"\bbengaluru\b", r"\bbangalore\b", r"\bnagarhole\b", r"\bkodagu\b", r"\bsharavathi\b", r"\bmandur\b"],
    "Kerala": [r"\bkerala\b", r"\bwayanad\b", r"\bplachimada\b", r"\bbrahmapuram\b", r"\bkochi\b", r"\beloor\b", r"\bperiyar\b", r"\bidukki\b", r"\bathirappilly\b", r"\bvizhinjam\b", r"\bmullaperiyar\b"],
    "Madhya Pradesh": [r"\bmadhya pradesh\b", r"\bsingrauli\b", r"\bbuxwaha\b", r"\bchhatarpur\b", r"\bshahdol\b", r"\bbhopal\b", r"\bindore\b", r"\bken betwa\b", r"\bomkareshwar\b"],
    "Maharashtra": [r"\bmaharashtra\b", r"\bgadchiroli\b", r"\bsurjagarh\b", r"\bchandrapur\b", r"\bmumbai\b", r"\baarey\b", r"\bdeonar\b", r"\bratnagiri\b", r"\bnanar\b", r"\bjaitapur\b", r"\bmelghat\b", r"\bvidarbha\b"],
    "Manipur": [r"\bmanipur\b", r"\bimphal\b", r"\bloktak\b", r"\btamenglong\b"],
    "Meghalaya": [r"\bmeghalaya\b", r"\bjaintia hills\b", r"\bshillong\b", r"\bgaro hills\b"],
    "Mizoram": [r"\bmizoram\b", r"\baizawl\b"],
    "Nagaland": [r"\bnagaland\b", r"\bkohima\b", r"\bdimapur\b"],
    "Odisha": [r"\bodisha\b", r"\borissa\b", r"\bniyamgiri\b", r"\bkoraput\b", r"\brayagada\b", r"\bkeonjhar\b", r"\btalcher\b", r"\bsukinda\b", r"\bdhinkia\b", r"\bjagatsinghpur\b", r"\bbhubaneswar\b", r"\bsijimali\b", r"\bpuri\b"],
    "Punjab": [r"\bpunjab\b", r"\bludhiana\b", r"\bamritsar\b", r"\bbuddha nullah\b", r"\bmalwa\b", r"\bmattewara\b"],
    "Rajasthan": [r"\brajasthan\b", r"\baravalli\b", r"\balwar\b", r"\bbharatpur\b", r"\bbansi paharpur\b", r"\bjaipur\b", r"\bjaisalmer\b", r"\bbarmer\b"],
    "Sikkim": [r"\bsikkim\b", r"\bteesta\b", r"\bgangtok\b", r"\bdzongu\b"],
    "Tamil Nadu": [r"\btamil nadu\b", r"\bthoothukudi\b", r"\btuticorin\b", r"\bchennai\b", r"\bennore\b", r"\bkodungaiyur\b", r"\bkudankulam\b", r"\bnilgiris\b", r"\bcauvery delta\b", r"\bneduvasal\b", r"\bsterlite\b", r"\btirupattur\b"],
    "Telangana": [r"\btelangana\b", r"\bnallamala\b", r"\bhyderabad\b", r"\bpatancheru\b", r"\bsingareni\b", r"\bkaleshwaram\b"],
    "Tripura": [r"\btripura\b", r"\bagartala\b"],
    "Uttar Pradesh": [r"\buttar pradesh\b", r"\bsonbhadra\b", r"\bvaranasi\b", r"\blucknow\b", r"\bnoida\b", r"\bbundelkhand\b", r"\bhindon\b"],
    "Uttarakhand": [r"\buttarakhand\b", r"\bjoshimath\b", r"\bchar dham\b", r"\bchamoli\b", r"\btehri\b", r"\bdehradun\b", r"\bnainital\b", r"\bcorbett\b", r"\bsilkyara\b"],
    "West Bengal": [r"\bwest bengal\b", r"\bbengal\b", r"\bdeucha\b", r"\bbirbhum\b", r"\braniganj\b", r"\basansol\b", r"\bkolkata\b", r"\bsundarbans\b", r"\bnandigram\b", r"\bsingur\b"],
    "Andaman & Nicobar": [r"\bandaman\b", r"\bnicobar\b", r"\bport blair\b", r"\bgreat nicobar\b"],
    "Delhi": [r"\bdelhi\b", r"\bghazipur\b", r"\bbhalswa\b", r"\bokhla\b", r"\byamuna floodplain\b", r"\bridge forest\b"],
    "Jammu & Kashmir": [r"\bjammu\b", r"\bkashmir\b", r"\bsrinagar\b", r"\bchenab\b", r"\bdal lake\b"],
    "Ladakh": [r"\bladakh\b", r"\bleh\b", r"\bkargil\b", r"\bchangthang\b"],
    "Puducherry": [r"\bpuducherry\b", r"\bpondicherry\b", r"\bkaraikal\b"],
    "Chandigarh": [r"\bchandigarh\b"],
    "Dadra & Nagar Haveli and Daman & Diu": [r"\bdadra\b", r"\bnagar haveli\b", r"\bdaman\b", r"\bdiu\b", r"\bsilvassa\b"],
    "Lakshadweep": [r"\blakshadweep\b", r"\bkavaratti\b"],
}

STATE_PATTERNS = {s: [re.compile(p) for p in pats] for s, pats in STATE_KEYWORDS.items()}


# ---------------------------------------------------------------------------
# Gazetteer
# ---------------------------------------------------------------------------
# name -> [ {lat, lon, state, pop}, ... ]. Ambiguous names keep every
# candidate; the article text decides which is meant.

try:
    gazetteer = json.loads(GAZETTEER_PATH.read_text(encoding="utf-8")) if GAZETTEER_PATH.exists() else {}
except Exception as e:
    gazetteer = {}
    _OPTIONAL_NOTES.append(f"gazetteer.json unreadable ({type(e).__name__}) — no places can be resolved")

# Matching is by n-gram lookup, not by scanning every gazetteer name: a full
# GeoNames build carries ~375k names, and compiling a regex per name costs
# seconds of startup and hundreds of MB. Tokenising and looking up 4-, 3-, 2-
# and 1-word windows is linear in the text and prefers the longest match, so
# "west singhbhum" beats "singhbhum".
_MAX_NGRAM = 4
_TOKEN_RE = re.compile(r"[a-z][a-z'\-]*")


def _ngrams(text: str):
    tokens = _TOKEN_RE.findall(text.lower())
    for size in range(_MAX_NGRAM, 0, -1):
        for i in range(len(tokens) - size + 1):
            yield " ".join(tokens[i:i + size])


# Google News appends " - Publisher" to every headline. Left in place it shows
# up in popups and, worse, gets matched as a location: GeoNames has a populated
# place called "Hindustan", so every "- Hindustan Times" headline was pinned there.
_PUBLISHER_SUFFIXES = sorted(
    set(list(ct.SOURCE_DOMAINS) + list(ct.SOURCE_DOMAINS.values()) + [
        "The Times of India", "The Hindu", "The Indian Express", "Hindustan Times",
        "India Today", "NDTV", "Down To Earth", "Mongabay-India", "Mongabay India",
        "Republic World", "BBC", "BBC News", "India.com", "thehindu.com",
    ]),
    key=len, reverse=True,
)
_SUFFIX_RE = re.compile(
    r"\s*[-–—|]\s*(?:" + "|".join(re.escape(s) for s in _PUBLISHER_SUFFIXES) + r")\s*$",
    re.IGNORECASE,
)

# Gazetteer names that are never a location in a news headline. "Hindustan" and
# "Magazine" are real GeoNames entries; matching them produces confidently wrong
# coordinates, which is worse than no match at all.
PLACE_STOPWORDS = {
    "hindustan", "magazine", "india", "bharat", "republic", "chronicle", "tribune",
    "express", "pioneer", "herald", "sentinel", "telegraph", "standard", "mirror",
    "observer", "gazette", "bulletin", "record", "journal", "times", "hindu",
    "national", "federal", "union", "centre", "center", "capital", "college",
    "university", "hospital", "temple", "church", "mosque", "school", "library",
    "airport", "junction", "railway", "cantonment", "secretariat", "assembly",
    "mine", "mines", "quarry", "dam", "canal", "landfill", "plant", "forest",
    "reserve", "sanctuary", "park", "port", "highway", "corridor", "waste",
    # Institutional and procedural words that GeoNames also lists as places.
    # "Gram Sabha consent fabricated…" was being pinned to a village called Sabha.
    "sabha", "lok", "rajya", "gram", "panchayat", "bill", "act", "court",
    "supreme", "high", "tribunal", "ministry", "minister", "congress", "party",
    "special", "report", "state", "centre", "chalo", "andolan", "samiti",
    "protest", "public", "hearing", "clearance", "project", "survey", "police",
}


def clean_title(title: str) -> str:
    """Removes the ' - Publisher' tail Google News appends to every headline."""
    return _SUFFIX_RE.sub("", (title or "").strip()).strip()


def strip_html(text: str) -> str:
    """RSS summaries frequently carry markup; keyword rules work on plain text."""
    return re.sub(r"<[^>]+>", " ", text or "")


def resolve_state(text: str) -> str:
    """Fallback when the gazetteer entry carries no state: infer from context."""
    for state, patterns in STATE_PATTERNS.items():
        if any(p.search(text.lower()) for p in patterns):
            return state
    return "Other States"


def disambiguate(candidates, text: str):
    """Several places share a name. Prefer the one whose state the article names."""
    if len(candidates) == 1:
        return candidates[0]
    lowered = text.lower()
    for cand in candidates:
        for p in STATE_PATTERNS.get(cand.get("state"), []):
            if p.search(lowered):
                return cand
    return candidates[0]  # ordered by population, so this is the best prior


def extract_location(text: str):
    """Returns (place_name, {lat, lon, state}) or (None, None). Longest match wins."""
    for gram in _ngrams(text):
        if gram in PLACE_STOPWORDS:
            continue
        candidates = gazetteer.get(gram)
        if candidates:
            cand = disambiguate(candidates, text)
            return gram.title(), {"lat": cand["lat"], "lon": cand["lon"], "state": cand.get("state")}
    return None, None


def parse_date(entry) -> str:
    for attr in ("published_parsed", "updated_parsed"):
        parsed = getattr(entry, attr, None)
        if parsed:
            return datetime(*parsed[:6], tzinfo=timezone.utc).strftime("%Y-%m-%d")
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

def fetch_outlet(outlet: dict):
    """Yields (entry, source_label) for every reachable feed of one outlet."""
    source = outlet["source"]
    reached = False
    for feed_url in outlet["urls"]:
        try:
            parsed = feedparser.parse(feed_url, agent=USER_AGENT)
        except Exception as e:
            print(f"  ! {source}: error on {feed_url} — {e}")
            continue
        entries = getattr(parsed, "entries", []) or []
        if not entries:
            print(f"  ~ {source}: no entries from {feed_url} (status {getattr(parsed, 'status', 'no response')})")
            continue
        reached = True
        print(f"  + {source}: {len(entries)} entries from {feed_url}")
        for entry in entries:
            yield entry, source
    if not reached:
        print(f"  ! {source}: no reachable feed — outlet skipped this run")


def google_news_feed(query: str, window: str) -> str:
    q = f"{query} when:{window}" if window else query
    return f"https://news.google.com/rss/search?q={quote_plus(q)}&hl=en-IN&gl=IN&ceid=IN:en"


def build_queries(type_ids):
    """Per-type seed queries plus the landmark named cases."""
    queries = []
    for tid in type_ids:
        queries.extend(ct.QUERY_SEEDS.get(tid, []))
    if set(type_ids) >= set(ct.TYPE_IDS):
        queries.extend(ct.QUERY_SEEDS.get("water", []))
        queries.extend(ct.NAMED_CONFLICTS)
    return list(dict.fromkeys(queries))


def harvest_google_news(type_ids, window: str, delay: float = 1.5):
    """Yields (entry, source_label) across every (outlet × query) combination."""
    queries = build_queries(type_ids)
    sites = ct.SOURCE_DOMAINS
    total = len(sites) * len(queries)
    print(f"Google News backfill: {len(sites)} outlets × {len(queries)} queries "
          f"= {total} searches, window '{window}'.")
    print(f"Types: {', '.join(type_ids)}\n")

    done = 0
    for source, domain in sites.items():
        outlet_hits = 0
        for query in queries:
            done += 1
            url = google_news_feed(f"{query} site:{domain}", window)
            try:
                parsed = feedparser.parse(url, agent=USER_AGENT)
            except Exception as e:
                print(f"  ! [{done}/{total}] {source} · {query} — {type(e).__name__}: {e}")
                continue
            entries = getattr(parsed, "entries", []) or []
            outlet_hits += len(entries)
            for entry in entries:
                yield entry, source
            time.sleep(delay)  # Google News throttles aggressively without this
        print(f"  = {source}: {outlet_hits} raw results across {len(queries)} queries")


# ---------------------------------------------------------------------------
# Record construction
# ---------------------------------------------------------------------------

def build_record(headline: str, url: str, source: str, published: str, text: str):
    """Applies the conflict gate, the typology and the gazetteer. None if rejected."""
    verdict = ct.classify(text)
    if not verdict["type"]:
        return None

    name, coords = extract_location(text)
    if not coords:
        return None

    return {
        "headline": headline,
        "url": url,
        "source": source,
        "published": published,
        "place_name": name,
        "state": coords.get("state") or resolve_state(f"{name} {text}"),
        "lat": coords["lat"],
        "lon": coords["lon"],
        "type": verdict["type"],
        "type_name": verdict["type_name"],
        "tags": verdict["tags"],
        "score": verdict["score"],
        "margin": verdict["margin"],
    }


def admit(entry, source: str, existing: dict) -> bool:
    link = getattr(entry, "link", None)
    if not link or link in existing:
        return False
    pub_date = parse_date(entry)
    if pub_date < MIN_DATE:
        return False

    title = clean_title(getattr(entry, "title", "") or "")
    text = strip_html(f"{title} {entry.get('summary', '')}")

    record = build_record(title, link, source, pub_date, text)
    if record is None:
        return False
    existing[link] = record
    return True


def reclassify(stories):
    """
    Re-score stored records against the current lexicon, in place.

    Records harvested before the typology existed carry only a headline, and
    they already passed a harvest-time filter, so the contestation gate is
    skipped here and the evidence bar is dropped to a single term — re-applying
    the full test to a bare headline would discard genuine records for want of
    words the headline never had room for. Every such record keeps its `margin`,
    and a margin of 0 or 1 is the flag to read it by hand.
    """
    changed, unresolved = 0, []
    for s in stories:
        text = f"{s.get('headline', '')} {s.get('place_name', '')} {s.get('state', '')}"
        verdict = ct.classify(text, gate=False, min_score=1)
        if not verdict["type"]:
            unresolved.append(s)
            # Legacy mining records: the old pipeline only ever admitted
            # extraction stories, so that is a safe floor for them.
            if s.get("mineral"):
                verdict = {"type": "extractive",
                           "type_name": ct.TYPES_BY_ID["extractive"]["name"],
                           "tags": [], "score": 0, "margin": 0}
            else:
                continue
        before = s.get("type")
        s["type"] = verdict["type"]
        s["type_name"] = verdict["type_name"]
        s["tags"] = verdict["tags"]
        s["score"] = verdict["score"]
        s["margin"] = verdict["margin"]
        s.pop("mineral", None)
        if before != s["type"]:
            changed += 1
    return changed, unresolved


# ---------------------------------------------------------------------------
# Link verification
# ---------------------------------------------------------------------------
# Every story points at a published article. A URL that 404s, or silently
# redirects to the outlet's homepage, is a dead pin.

def check_url(url: str):
    """Returns ('ok' | 'dead' | 'unknown', detail). 'unknown' means keep it."""
    req_headers = {"User-Agent": USER_AGENT, "Accept": "text/html,*/*"}
    original_path = (urlparse(url).path or "/").rstrip("/")

    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                final = resp.geturl()
                final_path = (urlparse(final).path or "/").rstrip("/")
                if original_path and not final_path:
                    return "dead", f"redirects to homepage ({final})"
                return "ok", f"{resp.status} {final_path or '/'}"
        except urllib.error.HTTPError as e:
            if e.code in (403, 405, 501) and method == "HEAD":
                continue  # some outlets refuse HEAD; retry as GET
            if e.code == 429:
                return "unknown", "rate limited (429)"
            if e.code >= 400:
                return "dead", f"HTTP {e.code}"
            return "ok", f"HTTP {e.code}"
        except Exception as e:
            return "unknown", f"{type(e).__name__}: {e}"
    return "unknown", "no response"


def verify_links(stories, dry_run: bool = False):
    if not stories:
        print("No stories to verify.")
        return stories

    print(f"Verifying {len(stories)} stored links…\n")
    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(lambda s: check_url(s.get("url", "")), stories))

    kept, dead, unknown = [], [], []
    for story, (verdict, detail) in zip(stories, results):
        label = f"{story.get('source', '?')} — {story.get('headline', '')[:60]}"
        if verdict == "dead":
            dead.append((label, story.get("url"), detail))
        else:
            if verdict == "unknown":
                unknown.append((label, story.get("url"), detail))
            kept.append(story)

    for label, url, detail in dead:
        print(f"  DEAD     {label}\n           {url}\n           {detail}")
    for label, url, detail in unknown:
        print(f"  UNSURE   {label}\n           {url}\n           {detail} (kept)")

    print(f"\n{len(kept) - len(unknown)} live, {len(unknown)} unverifiable (kept), {len(dead)} dead.")
    if dry_run:
        print("Dry run — no files changed.")
        return stories
    return kept


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_outputs(all_stories):
    """news.json is the record; data/stories.json and data.js are its mirrors.
    taxonomy.json carries the typology the front end renders."""
    all_stories.sort(key=lambda s: s.get("published", ""), reverse=True)

    payload = json.dumps(all_stories, indent=2, ensure_ascii=False)
    NEWS_JSON_PATH.write_text(payload, encoding="utf-8")

    stories_path = Path("data/stories.json")
    stories_path.parent.mkdir(exist_ok=True)
    stories_path.write_text(payload, encoding="utf-8")

    taxonomy = ct.taxonomy_payload()
    Path("taxonomy.json").write_text(
        json.dumps(taxonomy, indent=2, ensure_ascii=False), encoding="utf-8")

    Path("data.js").write_text(
        "window.CONFLICTSCAPE = {\n"
        f'  "generated": "{datetime.now(timezone.utc).strftime("%Y-%m-%d")}",\n'
        f'  "taxonomy": {json.dumps(taxonomy, ensure_ascii=False)},\n'
        f'  "records": {payload}\n'
        "};\n",
        encoding="utf-8",
    )


def load_stories():
    if not NEWS_JSON_PATH.exists():
        return {}
    try:
        return {
            s["url"]: s
            for s in json.loads(NEWS_JSON_PATH.read_text(encoding="utf-8"))
            if s.get("url") and (s.get("published") or "") >= MIN_DATE
        }
    except Exception as e:
        print(f"Warning parsing {NEWS_JSON_PATH}: {e}")
        return {}


def print_stats(stories):
    if not stories:
        print("Dataset is empty.")
        return
    print(f"{len(stories)} records, {min(s['published'] for s in stories)} to "
          f"{max(s['published'] for s in stories)}\n")

    by_type = Counter(s.get("type") or "unclassified" for s in stories)
    print("By conflict type")
    for t in ct.CONFLICT_TYPES:
        print(f"  {t['name']:38s} {by_type.get(t['id'], 0):>5}")
    if by_type.get("unclassified"):
        print(f"  {'unclassified':38s} {by_type['unclassified']:>5}")

    tags = Counter(tag for s in stories for tag in s.get("tags", []))
    print("\nCross-cutting tags")
    for t in ct.CROSS_CUTTING_TAGS:
        print(f"  {t['name']:38s} {tags.get(t['id'], 0):>5}")

    print("\nBy state (top 15)")
    for state, n in Counter(s.get("state") for s in stories).most_common(15):
        print(f"  {state:38s} {n:>5}")

    print("\nBy source")
    for source, n in Counter(s.get("source") for s in stories).most_common():
        print(f"  {source:38s} {n:>5}")

    thin = [s for s in stories if s.get("margin", 99) <= 1 and s.get("type")]
    if thin:
        print(f"\n{len(thin)} records assigned on a margin of 1 or less — "
              f"these are the ones to read by hand.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Conflictscape ingestion pipeline")
    parser.add_argument("--backfill", action="store_true",
                        help="search Google News across the ten outlets for historical articles")
    parser.add_argument("--types", default="",
                        help="comma-separated type ids to backfill (default: all six)")
    parser.add_argument("--window", default="5y",
                        help="Google News recency window for --backfill (e.g. 1y, 5y, 30d)")
    parser.add_argument("--reclassify", action="store_true",
                        help="re-score stored records against the current lexicon")
    parser.add_argument("--verify-links", action="store_true",
                        help="check every stored URL and drop the dead ones")
    parser.add_argument("--dry-run", action="store_true",
                        help="with --verify-links, report only and leave files untouched")
    parser.add_argument("--stats", action="store_true",
                        help="print the distribution by type, state and source")
    parser.add_argument("--purge", action="store_true",
                        help="delete every stored story and write empty data files")
    args = parser.parse_args()

    if args.purge:
        existing = load_stories()
        write_outputs([])
        print(f"Purged {len(existing)} stories.")
        return

    if args.stats:
        print_stats(list(load_stories().values()))
        return

    if args.reclassify:
        stories = list(load_stories().values())
        changed, unresolved = reclassify(stories)
        write_outputs(stories)
        print(f"Reclassified {len(stories)} records — {changed} changed type, "
              f"{len(unresolved)} could not be typed from the headline alone.")
        for s in unresolved[:15]:
            print(f"    ? {s.get('source', '?'):16s} {s.get('headline', '')[:70]}")
        if len(unresolved) > 15:
            print(f"    … and {len(unresolved) - 15} more")
        print()
        print_stats(stories)
        return

    if args.verify_links:
        stories = list(load_stories().values())
        survivors = verify_links(stories, dry_run=args.dry_run)
        if not args.dry_run:
            write_outputs(survivors)
            print(f"Wrote {len(survivors)} stories.")
        return

    for note in _OPTIONAL_NOTES:
        print(f"Notice: {note}")
    if _OPTIONAL_NOTES:
        print()

    if not gazetteer:
        print("WARNING: gazetteer.json is empty or missing — every article will be dropped\n"
              "         for want of a resolvable location. Run: python build_gazetteer.py\n")
    else:
        print(f"Gazetteer: {len(gazetteer)} place names loaded.\n")

    existing = load_stories()
    new_count = 0

    if feedparser is None:
        print("feedparser is unavailable — no feeds were polled. Dataset left unchanged.")
    elif args.backfill:
        type_ids = [t.strip() for t in args.types.split(",") if t.strip()] or ct.TYPE_IDS
        unknown = [t for t in type_ids if t not in ct.TYPE_IDS]
        if unknown:
            parser.error(f"unknown type id(s): {', '.join(unknown)}. "
                         f"Choose from: {', '.join(ct.TYPE_IDS)}")
        for entry, source in harvest_google_news(type_ids, args.window):
            if admit(entry, source, existing):
                new_count += 1
    else:
        for outlet in OUTLETS:
            for entry, source in fetch_outlet(outlet):
                if admit(entry, source, existing):
                    new_count += 1

    all_stories = [s for s in existing.values() if (s.get("published") or "") >= MIN_DATE]
    write_outputs(all_stories)

    mode = "backfill" if args.backfill else "feed poll"
    print(f"\n{mode}: {len(all_stories)} stories stored (+{new_count} new).\n")
    print_stats(all_stories)
    if args.backfill and new_count:
        print("\nNext: python fetch_news.py --verify-links --dry-run")


if __name__ == "__main__":
    main()
