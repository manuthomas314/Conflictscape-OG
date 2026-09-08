"""
build_gazetteer.py — build gazetteer.json from the GeoNames India dataset.

The pipeline resolves article locations by matching place names against
gazetteer.json. A gazetteer built from GeoNames is deterministic (the same
article always yields the same coordinates), covers Indian villages and natural
features that a general-purpose NER model does not know, and is citable.

    python build_gazetteer.py                 # download and build
    python build_gazetteer.py --keep-archive  # keep IN.zip for offline rebuilds
    python build_gazetteer.py --from IN.zip   # build from an already-downloaded archive

Source:  https://download.geonames.org/export/dump/IN.zip
Licence: Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/)
         Cite GeoNames if this gazetteer underpins published work.

Standard library only — no third-party dependencies, works on any Python 3.9+.
"""

import argparse
import json
import re
import unicodedata
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

GEONAMES_URL = "https://download.geonames.org/export/dump/IN.zip"
GAZETTEER_PATH = Path("gazetteer.json")
PROVENANCE_PATH = Path("gazetteer_source.json")

# GeoNames admin1 codes for India, verified against each code's largest settlement.
STATES = {
    "01": "Andaman & Nicobar", "02": "Andhra Pradesh", "03": "Assam", "05": "Chandigarh",
    "07": "Delhi", "09": "Gujarat", "10": "Haryana", "11": "Himachal Pradesh",
    "12": "Jammu & Kashmir", "13": "Kerala", "16": "Maharashtra", "17": "Manipur",
    "18": "Meghalaya", "19": "Karnataka", "20": "Nagaland", "21": "Odisha",
    "22": "Puducherry", "23": "Punjab", "24": "Rajasthan", "25": "Tamil Nadu",
    "26": "Tripura", "28": "West Bengal", "29": "Sikkim", "30": "Arunachal Pradesh",
    "31": "Mizoram", "33": "Goa", "34": "Bihar", "35": "Madhya Pradesh",
    "36": "Uttar Pradesh", "37": "Chhattisgarh", "38": "Jharkhand", "39": "Uttarakhand",
    "40": "Telangana", "41": "Ladakh", "52": "Dadra & Nagar Haveli and Daman & Diu",
}

# Which GeoNames feature classes to keep.
#   P — populated places (villages upward: Dhinkia, Sonshi, Sijimali)
#   A — administrative divisions, restricted to ADM1/ADM2 (states and districts)
#   T — mountains and ranges (Niyamgiri, Bailadila)
#   L — parks and areas (Hasdeo Arand, Nallamala, Dehing Patkai)
#   V — forests
KEEP_CLASSES = {"P", "T", "L", "V"}
KEEP_ADMIN_CODES = {"ADM1", "ADM2"}

# Ordinary English words and generic Indian place suffixes that would match
# constantly in headlines without identifying anywhere.
STOP = {
    "india", "union", "district", "city", "state", "mine", "mines", "forest", "hill",
    "hills", "river", "park", "fort", "new", "old", "north", "south", "east", "west",
    "central", "port", "bank", "gold", "coal", "iron", "sand", "stone", "rock", "well",
    "deep", "long", "best", "high", "low", "power", "water", "green", "field", "fields",
    "plant", "court", "block", "centre", "center", "model", "nagar", "pura", "ganj",
    "garh", "police", "market", "colony", "station", "village", "road", "range", "valley",
    "island", "islands", "lake", "hill top", "reserve", "sanctuary", "national park",
}

MIN_NAME_LEN = 5
NAME_RE = re.compile(r"[a-z][a-z '\-]+")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().strip()
    return re.sub(r"\s+", " ", s)


def download(dest: Path) -> Path:
    print(f"Downloading {GEONAMES_URL} …")
    req = urllib.request.Request(GEONAMES_URL, headers={"User-Agent": "DecipheringConflicts/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, dest.open("wb") as fh:
        total = 0
        while chunk := resp.read(1 << 20):
            fh.write(chunk)
            total += len(chunk)
            print(f"\r  {total/1e6:.1f} MB", end="", flush=True)
    print(f"\n  saved to {dest}")
    return dest


def build(archive: Path):
    gaz = {}
    kept = skipped = 0

    def add(name: str, lat: float, lon: float, state: str, pop: int):
        key = norm(name)
        if len(key) < MIN_NAME_LEN or key in STOP or not NAME_RE.fullmatch(key):
            return
        entry = {"lat": round(lat, 4), "lon": round(lon, 4), "state": state, "pop": pop}
        bucket = gaz.setdefault(key, [])
        if any(b["lat"] == entry["lat"] and b["lon"] == entry["lon"] for b in bucket):
            return
        bucket.append(entry)

    with zipfile.ZipFile(archive) as zf:
        with zf.open("IN.txt") as fh:
            for raw in fh:
                cols = raw.decode("utf-8").rstrip("\n").split("\t")
                if len(cols) < 15:
                    continue
                name, alt = cols[1], cols[3]
                fclass, fcode = cols[6], cols[7]
                admin1, population = cols[10], cols[14]

                if fclass == "A":
                    if fcode not in KEEP_ADMIN_CODES:
                        skipped += 1
                        continue
                elif fclass not in KEEP_CLASSES:
                    skipped += 1
                    continue

                try:
                    lat, lon = float(cols[4]), float(cols[5])
                    pop = int(population or 0)
                except ValueError:
                    continue

                state = STATES.get(admin1, "Other States")
                add(name, lat, lon, state, pop)
                for a in alt.split(",") if alt else []:
                    if NAME_RE.fullmatch(norm(a)):
                        add(a, lat, lon, state, pop)
                kept += 1

    # Ambiguous names keep every candidate, ordered by population. The article
    # text picks between them at match time; population is only the prior.
    for key in gaz:
        gaz[key].sort(key=lambda e: -e["pop"])

    GAZETTEER_PATH.write_text(
        json.dumps(gaz, indent=1, ensure_ascii=False, sort_keys=True), encoding="utf-8"
    )

    ambiguous = sum(1 for v in gaz.values() if len(v) > 1)
    records = sum(len(v) for v in gaz.values())
    PROVENANCE_PATH.write_text(json.dumps({
        "source": GEONAMES_URL,
        "licence": "CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/",
        "attribution": "Place names and coordinates from the GeoNames geographical database.",
        "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "feature_classes": sorted(KEEP_CLASSES) + sorted(KEEP_ADMIN_CODES),
        "geonames_rows_used": kept,
        "geonames_rows_skipped": skipped,
        "names": len(gaz),
        "ambiguous_names": ambiguous,
        "coordinate_records": records,
    }, indent=2), encoding="utf-8")

    print(f"\ngazetteer.json: {len(gaz)} names, {ambiguous} ambiguous, {records} coordinate records")
    print(f"  from {kept} GeoNames rows ({skipped} skipped by feature class)")
    print(f"gazetteer_source.json: provenance written")


def main():
    ap = argparse.ArgumentParser(description="Build gazetteer.json from GeoNames India")
    ap.add_argument("--from", dest="archive", help="use an already-downloaded IN.zip")
    ap.add_argument("--keep-archive", action="store_true", help="keep IN.zip after building")
    args = ap.parse_args()

    if args.archive:
        archive = Path(args.archive)
        if not archive.exists():
            raise SystemExit(f"{archive} not found")
    else:
        archive = download(Path("IN.zip"))

    build(archive)

    if not args.archive and not args.keep_archive:
        archive.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
