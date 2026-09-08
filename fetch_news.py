"""
Deciphering Conflicts — Mining Conflicts & Protests Monitor (India, 2018–Present)
Pipeline: RSS Feeds -> Filter Mining Protests (>= 2018) -> Match Place & State -> news.json

Locations come from gazetteer.json, built by build_gazetteer.py from the GeoNames
India dataset. No NER model and no geocoding API: the same article always yields
the same coordinates, and Indian villages and natural features that a general
English NER model does not know are covered.

Usage:
    python fetch_news.py                          # poll the ten outlets' own feeds (last few days)
    python fetch_news.py --backfill               # search Google News across the same ten outlets
    python fetch_news.py --backfill --window 8y   # widen the backfill window (default 5y)
    python fetch_news.py --verify-links           # check every stored URL, drop the dead ones
    python fetch_news.py --verify-links --dry-run # report dead links, change nothing
    python fetch_news.py --purge                  # empty the dataset

Two ingestion modes, because they do different jobs. The outlets' own RSS feeds
carry only the last few days, so a plain run keeps the dashboard current but can
never reach backwards. --backfill queries Google News with a `site:` filter per
outlet, which reaches back years; run it once to build the archive, then let the
scheduled plain runs keep it fresh.
"""

import argparse
import json
import time
import hashlib
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse

# feedparser is the one optional dependency left. It is caught with a bare
# `except Exception` rather than `except ImportError` so that an import that
# raises rather than fails (spaCy's pydantic ConfigError on Python 3.14 was the
# original case) degrades instead of taking the whole script down.
_OPTIONAL_NOTES = []

try:
    import feedparser
except Exception as e:
    feedparser = None
    _OPTIONAL_NOTES.append(f"feedparser unavailable ({type(e).__name__}) — cannot fetch new articles")

# ---------------------------------------------------------------------------
# Config & Keyword Rules
# ---------------------------------------------------------------------------

# Ten monitored outlets. Each outlet lists one or more candidate feed URLs;
# they are tried in order and every URL that yields entries is consumed, so a
# section feed that is retired upstream does not silently kill the outlet.
# `source` is the label written into news.json — it drives the Source filter in
# the UI, so it stays a clean outlet name rather than the raw feed title.
OUTLETS = [
    {
        "source": "NDTV",
        "urls": [
            "https://feeds.feedburner.com/ndtvnews-india-news",
            "https://feeds.feedburner.com/ndtvnews-latest",
            "https://feeds.feedburner.com/ndtvnews-top-stories",
        ],
    },
    {
        "source": "India.com",
        "urls": [
            "https://www.india.com/news/feed/",
            "https://www.india.com/feed/",
        ],
    },
    {
        "source": "BBC News",
        "urls": [
            "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml",
            "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        ],
    },
    {
        "source": "Times of India",
        "urls": [
            "https://timesofindia.indiatimes.com/rssfeeds/2647163.cms",       # Environment
            "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",   # India
            "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
        ],
    },
    {
        "source": "India Today",
        "urls": [
            "https://www.indiatoday.in/rss/1206578",   # India
            "https://www.indiatoday.in/rss/1206584",   # Environment / Science
            "https://www.indiatoday.in/rss/home",
        ],
    },
    {
        "source": "Republic",
        "urls": [
            "https://www.republicworld.com/rss/all-news.xml",
            "https://www.republicworld.com/stories.rss",
            "https://www.republicworld.com/rss/india-news.xml",
        ],
    },
    {
        "source": "Hindustan Times",
        "urls": [
            "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
            "https://www.hindustantimes.com/feeds/rss/environment/rssfeed.xml",
            "https://www.hindustantimes.com/feeds/rss/latest/rssfeed.xml",
        ],
    },
    {
        "source": "Mongabay India",
        "urls": [
            "https://india.mongabay.com/feed/",
        ],
    },
    {
        "source": "The Hindu",
        "urls": [
            "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss",
            "https://www.thehindu.com/news/national/feeder/default.rss",
        ],
    },
    {
        "source": "Down To Earth",
        "urls": [
            "https://www.downtoearth.org.in/rss/mining",
            "https://www.downtoearth.org.in/rss/environment",
            "https://www.downtoearth.org.in/rss/wildlife-biodiversity",
        ],
    },
]

USER_AGENT = "Mozilla/5.0 (compatible; DecipheringConflicts/1.0; +https://github.com/)"

# ---------------------------------------------------------------------------
# Google News backfill
# ---------------------------------------------------------------------------
# The direct outlet feeds above only expose the last few days, so they can never
# build a 2018-onward archive — they only accumulate forward. Google News RSS
# accepts a search query with a `site:` filter and reaches back years, so the
# same ten outlets can be searched historically. One query per (outlet × topic).

GOOGLE_NEWS_SITES = {
    "NDTV":            "ndtv.com",
    "India.com":       "india.com",
    "BBC News":        "bbc.com",
    "Times of India":  "timesofindia.indiatimes.com",
    "India Today":     "indiatoday.in",
    "Republic":        "republicworld.com",
    "Hindustan Times": "hindustantimes.com",
    "Mongabay India":  "india.mongabay.com",
    "The Hindu":       "thehindu.com",
    "Down To Earth":   "downtoearth.org.in",
}

# Generic topic queries, run against every outlet.
QUERY_CORES = [
    "mining protest",
    "coal mine protest villagers",
    "bauxite mining protest tribals",
    "iron ore mining protest",
    "sand mining protest",
    "stone quarry protest",
    "gram sabha mining rejected",
    "mining displacement land acquisition protest",
    "anti-mining agitation Adivasi",
    "coal block public hearing opposition",
]

# High-signal named conflicts, run against every outlet — these recover the
# landmark cases that generic queries rank too low to surface.
NAMED_CONFLICTS = [
    "Hasdeo Aranya coal protest",
    "Niyamgiri Dongria Kondh bauxite",
    "Deucha Pachami coal protest",
    "Buxwaha diamond mining protest",
    "Surjagarh Gadchiroli mining protest",
    "Nallamala uranium mining protest",
    "Dehing Patkai coal mining protest",
    "Sijimali bauxite protest",
    "Bailadila Dantewada mining protest",
    "Singrauli coal displacement protest",
]


def google_news_feed(query: str, window: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} when:{window}" if window else query
    return f"https://news.google.com/rss/search?q={quote_plus(q)}&hl=en-IN&gl=IN&ceid=IN:en"

MINING_PATTERNS = [
    r"\bmining\b", r"\bmine(s)?\b", r"\bminer(s)?\b", r"\bcoal mine(s)?\b",
    r"\bcoal block(s)?\b", r"\bcoalfield(s)?\b", r"\bcolliery\b", r"\bcollieries\b",
    r"\bmineral(s)?\b", r"\b(mining|mine) lease\b", r"\boverburden\b", r"\btailings\b",
    r"\bbauxite\b", r"\biron ore\b", r"\bopen cast\b", r"\bopencast\b",
    r"\bextraction\b", r"\bquarry(ing)?\b", r"\bstone crusher\b", r"\bsand mining\b"
]

PROTEST_PATTERNS = [
    r"\bprotest(s|ed|ing|ers?)?\b", r"\boppos(e|ed|ing|ition)\b", r"\bagitat(ion|ed|ing)\b",
    r"\bmarch(es|ed|ing)?\b", r"\brall(y|ies)\b", r"\bblockad(e|ed|ing)\b",
    r"\bdharna\b", r"\bresist(ance|ed|ing)?\b", r"\bgram sabha\b", r"\bclash(es)?\b",
    r"\bdisplace(ment|d)\b", r"\beviction(s)?\b", r"\bland acquisition\b",
    r"\bhunger strike\b", r"\bgherao\b", r"\brasta roko\b", r"\bsit-in\b"
]

STATE_KEYWORDS = {
    "Chhattisgarh": [r"\bchhattisgarh\b", r"\bhasdeo\b", r"\bkorba\b", r"\bbastar\b", r"\braigarh\b", r"\bdantewada\b", r"\bbailadila\b", r"\bsurguja\b"],
    "Jharkhand": [r"\bjharkhand\b", r"\bdhanbad\b", r"\bjharia\b", r"\blatehar\b", r"\bchaibasa\b", r"\bwest singhbhum\b", r"\bpakur\b", r"\bbokaro\b", r"\bnetarhat\b"],
    "Odisha": [r"\bodisha\b", r"\borissa\b", r"\bniyamgiri\b", r"\bkoraput\b", r"\brayagada\b", r"\bkeonjhar\b", r"\btalcher\b", r"\bsukinda\b", r"\bdhinkia\b"],
    "West Bengal": [r"\bwest bengal\b", r"\bbengal\b", r"\bdeucha\b", r"\bbirbhum\b", r"\braniganj\b", r"\basansol\b"],
    "Madhya Pradesh": [r"\bmadhya pradesh\b", r"\bsingrauli\b", r"\bbuxwaha\b", r"\bchhatarpur\b", r"\bshahdol\b"],
    "Goa": [r"\bgoa\b", r"\bsanguem\b", r"\bchandor\b", r"\bsonshi\b", r"\bbicholim\b"],
    "Rajasthan": [r"\brajasthan\b", r"\baravalli\b", r"\balwar\b", r"\bbharatpur\b", r"\bbansi paharpur\b"],
    "Maharashtra": [r"\bmaharashtra\b", r"\bgadchiroli\b", r"\bsurjagarh\b", r"\bchandrapur\b"],
    "Karnataka": [r"\bkarnataka\b", r"\bballari\b", r"\bbellary\b", r"\bsandur\b", r"\bkudremukh\b"],
    "Assam": [r"\bassam\b", r"\bdehing patkai\b"],
    "Meghalaya": [r"\bmeghalaya\b", r"\bjaintia hills\b"],
    "Telangana": [r"\btelangana\b", r"\bnallamala\b"],
    "Andhra Pradesh": [r"\bandhra pradesh\b", r"\bandhra\b", r"\bvisakhapatnam\b"],
}

MINERAL_KEYWORDS = {
    "Coal": [r"\bcoal\b", r"\blignite\b"],
    "Bauxite": [r"\bbauxite\b", r"\balumina\b"],
    "Iron Ore": [r"\biron ore\b", r"\biron\b"],
    "Sandstone": [r"\bsandstone\b", r"\bstone quarry\b", r"\bstone crusher\b"],
    "Diamond": [r"\bdiamond\b"],
    "Chromite": [r"\bchromite\b", r"\bchromium\b"],
    "Uranium": [r"\buranium\b"],
    "Sand": [r"\bsand mining\b", r"\bsand\b"],
}

GAZETTEER_PATH = Path("gazetteer.json")
NEWS_JSON_PATH = Path("news.json")
MIN_DATE = "2018-01-01"

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

# Gazetteer: name -> [ {lat, lon, state, pop}, ... ], built from the GeoNames
# India dataset by build_gazetteer.py. Ambiguous names keep every candidate;
# the article text decides which is meant. No network calls, no NER model, and
# the same input always yields the same output.
try:
    gazetteer = json.loads(GAZETTEER_PATH.read_text(encoding="utf-8")) if GAZETTEER_PATH.exists() else {}
except Exception as e:
    gazetteer = {}
    _OPTIONAL_NOTES.append(f"gazetteer.json unreadable ({type(e).__name__}) — no places can be resolved")

# Matching is by n-gram lookup, not by scanning every gazetteer name: a full
# GeoNames build carries ~375k names, and compiling a regex per name costs
# seconds of startup and hundreds of MB. Tokenising the headline and looking up
# 3-, 2- and 1-word windows is O(length of text) and prefers the longest match,
# so "west singhbhum" beats "singhbhum".
_MAX_NGRAM = 4
_TOKEN_RE = re.compile(r"[a-z][a-z'\-]*")


def _ngrams(text: str):
    tokens = _TOKEN_RE.findall(text.lower())
    for size in range(_MAX_NGRAM, 0, -1):
        for i in range(len(tokens) - size + 1):
            yield " ".join(tokens[i:i + size])


# Google News appends " - Publisher" to every headline. Left in place it shows up
# in popups and, worse, gets matched as a location: GeoNames has a populated place
# called "Hindustan", so every "- Hindustan Times" headline was being pinned there.
_PUBLISHER_SUFFIXES = sorted(
    set(list(GOOGLE_NEWS_SITES) + list(GOOGLE_NEWS_SITES.values()) + [
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
}


def clean_title(title: str) -> str:
    """Removes the ' - Publisher' tail Google News appends to every headline."""
    return _SUFFIX_RE.sub("", (title or "").strip()).strip()


def strip_html(text: str) -> str:
    """RSS summaries frequently carry markup; keyword rules work on plain text."""
    return re.sub(r"<[^>]+>", " ", text or "")


def is_mining_protest(text: str) -> bool:
    """Verifies that the article specifically describes people protesting against mining."""
    lowered = text.lower()
    has_mining = any(re.search(p, lowered) for p in MINING_PATTERNS)
    has_protest = any(re.search(p, lowered) for p in PROTEST_PATTERNS)
    return has_mining and has_protest


def resolve_state(text: str) -> str:
    """Fallback when the gazetteer entry carries no state: infer it from context."""
    lowered = text.lower()
    for state, patterns in STATE_KEYWORDS.items():
        if any(re.search(p, lowered) for p in patterns):
            return state
    return "Other States"


def detect_mineral(text: str) -> str:
    lowered = text.lower()
    for mineral, patterns in MINERAL_KEYWORDS.items():
        if any(re.search(p, lowered) for p in patterns):
            return mineral
    return "Mineral / Extraction"


def disambiguate(candidates, text: str):
    """Several places share a name. Prefer the one whose state the article names."""
    if len(candidates) == 1:
        return candidates[0]
    lowered = text.lower()
    for cand in candidates:
        patterns = STATE_KEYWORDS.get(cand.get("state"), [])
        if any(re.search(p, lowered) for p in patterns):
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
            status = getattr(parsed, "status", "no response")
            print(f"  ~ {source}: no entries from {feed_url} (status {status})")
            continue
        reached = True
        print(f"  + {source}: {len(entries)} entries from {feed_url}")
        for entry in entries:
            yield entry, source
    if not reached:
        print(f"  ! {source}: no reachable feed — outlet skipped this run")


def harvest_google_news(window: str, delay: float = 1.5):
    """Yields (entry, source_label) across every (outlet × query) combination."""
    queries = QUERY_CORES + NAMED_CONFLICTS
    total = len(GOOGLE_NEWS_SITES) * len(queries)
    print(f"Google News backfill: {len(GOOGLE_NEWS_SITES)} outlets × {len(queries)} queries "
          f"= {total} searches, window '{window}'.\n")

    done = 0
    for source, domain in GOOGLE_NEWS_SITES.items():
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
# Link verification
# ---------------------------------------------------------------------------
# Every story in news.json points at a published article. A URL that 404s, or
# that silently redirects to the outlet's homepage, is a dead pin: the popup
# link takes the reader nowhere. This check removes them.

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
                # Article gone: outlet bounced us to the homepage or a section root.
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
    """Checks every stored URL concurrently and returns the surviving stories."""
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


def write_outputs(all_stories):
    """news.json is the record; data/stories.json and data.js are its mirrors."""
    all_stories.sort(key=lambda s: s.get("published", ""), reverse=True)

    NEWS_JSON_PATH.write_text(json.dumps(all_stories, indent=2, ensure_ascii=False), encoding="utf-8")

    stories_path = Path("data/stories.json")
    stories_path.parent.mkdir(exist_ok=True)
    stories_path.write_text(json.dumps(all_stories, indent=2, ensure_ascii=False), encoding="utf-8")

    data_js_path = Path("data.js")
    data_js_path.write_text(
        f"window.DECIPHER_DATA = {json.dumps(all_stories, indent=2, ensure_ascii=False)};\n",
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


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------

def admit(entry, source: str, existing: dict) -> bool:
    """Applies the mining+protest filter to one entry; stores it and returns True if kept."""
    link = getattr(entry, "link", None)
    if not link or link in existing:
        return False
    pub_date = parse_date(entry)
    if pub_date < MIN_DATE:
        return False

    title = clean_title(getattr(entry, "title", "") or "")
    text = strip_html(f"{title} {entry.get('summary', '')}")
    if not is_mining_protest(text):
        return False

    name, coords = extract_location(text)
    if not coords:
        return False

    existing[link] = {
        "headline": title,
        "url": link,
        "source": source,
        "published": pub_date,
        "place_name": name,
        "state": coords.get("state") or resolve_state(f"{name} {text}"),
        "lat": coords["lat"],
        "lon": coords["lon"],
        "mineral": detect_mineral(text),
    }
    return True


def main():
    parser = argparse.ArgumentParser(description="Deciphering Conflicts ingestion pipeline")
    parser.add_argument("--verify-links", action="store_true",
                        help="check every stored URL and drop the dead ones instead of fetching")
    parser.add_argument("--dry-run", action="store_true",
                        help="with --verify-links, report only and leave files untouched")
    parser.add_argument("--backfill", action="store_true",
                        help="search Google News across the ten outlets for historical articles")
    parser.add_argument("--window", default="5y",
                        help="Google News recency window for --backfill (e.g. 1y, 5y, 30d). Default 5y.")
    parser.add_argument("--purge", action="store_true",
                        help="delete every stored story and write empty data files")
    args = parser.parse_args()

    if args.purge:
        existing = load_stories()
        write_outputs([])
        print(f"Purged {len(existing)} stories. news.json, data/stories.json and data.js are now empty.")
        return

    if args.verify_links:
        # Link checking uses only the standard library — optional deps are irrelevant here.
        stories = list(load_stories().values())
        survivors = verify_links(stories, dry_run=args.dry_run)
        if not args.dry_run:
            write_outputs(survivors)
            print(f"Wrote {len(survivors)} stories to {NEWS_JSON_PATH}, data/stories.json and data.js.")
        return

    for note in _OPTIONAL_NOTES:
        print(f"Notice: {note}")
    if _OPTIONAL_NOTES:
        print()

    if not gazetteer:
        print("WARNING: gazetteer.json is empty or missing — every article will be dropped for\n"
              "         want of a resolvable location. Run: python build_gazetteer.py\n")
    else:
        print(f"Gazetteer: {len(gazetteer)} place names loaded.\n")

    existing = load_stories()
    new_count = 0

    if feedparser is None:
        print("feedparser is unavailable — no feeds were polled. Existing dataset left unchanged.")
    elif args.backfill:
        for entry, source in harvest_google_news(args.window):
            if admit(entry, source, existing):
                new_count += 1
    else:
        for outlet in OUTLETS:
            for entry, source in fetch_outlet(outlet):
                if admit(entry, source, existing):
                    new_count += 1

    # Keep only 2018+ stories sorted by date descending
    all_stories = [s for s in existing.values() if (s.get("published") or "") >= MIN_DATE]
    write_outputs(all_stories)

    mode = "backfill" if args.backfill else "feed poll"
    print(f"\n{mode}: saved {len(all_stories)} mining protest stories (2018-Present) "
          f"into {NEWS_JSON_PATH}, data/stories.json and data.js (+{new_count} new).")
    if args.backfill and new_count:
        print("Next: python fetch_news.py --verify-links --dry-run")


if __name__ == "__main__":
    main()
