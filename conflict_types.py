"""
Conflictscape — conflict typology, lexicon and classifier.

Six mutually exclusive conflict types, each keyed to the element of social
practice (Shove, Pantzar & Watson 2012) that the conflict primarily disrupts:
materials, competences, meanings. Type is decided by the dominant practice
disruption, not by the sector of the actor involved.

Water is deliberately NOT a seventh type. River diversion, irrigation rights,
dam displacement and groundwater depletion run through extraction, agrarian,
infrastructure and pollution practices alike; forcing them into one bucket
would destroy that spread. Water is a cross-cutting tag instead, so the
dashboard can count water conflicts across all six types.

Every classified story carries exactly one `type`, zero or more `tags`, one
`state` and one `source`. Imported by fetch_news.py; standard library only.

    python conflict_types.py            # self-test on built-in examples
"""

from __future__ import annotations

import re

# --------------------------------------------------------------------------
# Monitored outlets
# --------------------------------------------------------------------------
# `domain` scopes the Google News `site:` backfill. `source` is the label
# written into news.json and shown in the Source axis — keep it stable.

SOURCES = [
    {"source": "NDTV",            "domain": "ndtv.com"},
    {"source": "India.com",       "domain": "india.com"},
    {"source": "BBC News",        "domain": "bbc.com"},
    {"source": "Times of India",  "domain": "timesofindia.indiatimes.com"},
    {"source": "India Today",     "domain": "indiatoday.in"},
    {"source": "Republic",        "domain": "republicworld.com"},
    {"source": "Hindustan Times", "domain": "hindustantimes.com"},
    {"source": "Mongabay India",  "domain": "india.mongabay.com"},
    {"source": "The Hindu",       "domain": "thehindu.com"},
    {"source": "Down To Earth",   "domain": "downtoearth.org.in"},
]

SOURCE_DOMAINS = {s["source"]: s["domain"] for s in SOURCES}


# --------------------------------------------------------------------------
# Gate 1 — is anyone contesting anything?
# --------------------------------------------------------------------------
# A story qualifies only with BOTH an environmental object of contention and
# contestation by, or on behalf of, the affected population. A clearance
# granted, a pollution reading published, a policy announced — none of these
# is a conflict until somebody contests it.

CONTESTATION_TERMS = [
    "protest", "protests", "protested", "protesting", "protesters", "protestors",
    "agitation", "agitating", "andolan", "dharna", "hunger strike", "relay fast",
    "morcha", "gherao", "rasta roko", "bandh", "hartal", "sit-in", "sit in",
    "blockade", "blockaded", "human chain", "demonstration", "rally against",
    "march against", "padayatra", "oppose", "opposed", "opposing", "opposition",
    "object to", "objected", "resist", "resistance", "outcry", "uproar",
    "public hearing", "gram sabha rejected", "gram sabha resolution",
    "no objection", "petition", "pil", "moved the ngt", "green tribunal",
    "writ petition", "stay order", "lathi charge", "lathicharge",
    "detained", "clash", "clashes", "firing on protesters", "police case",
    "samiti", "sangharsh", "bachao", "virodh", "action committee",
    "struggle committee", "joint action", "memorandum", "boycott",
    "demand withdrawal", "scrap the project", "cancel the project",
]

AFFECTED_ACTORS = [
    "villagers", "residents", "locals", "farmers", "fisherfolk", "fishermen",
    "fisherwomen", "adivasi", "adivasis", "tribal", "tribals", "scheduled tribe",
    "forest dwellers", "gram sabha", "panchayat", "gram panchayat", "sarpanch",
    "pastoralists", "graziers", "van gujjars", "displaced families",
    "project affected", "project-affected", "oustees", "land losers",
    "slum dwellers", "settlers", "women", "self-help group", "community",
    "activists", "environmentalists", "civil society", "ngo", "collective",
    "people of", "public", "citizens", "association", "union of farmers",
]

# --------------------------------------------------------------------------
# Gate 2 — exclusions
# --------------------------------------------------------------------------
# Fired on the whole document; drops the story regardless of type score.
# Encodes the inclusion rule: place-based environmental conflicts plus
# national environmental policy protests. Not labour or market-policy
# disputes, not wildlife-crime enforcement, not disaster reporting.

EXCLUSION_TERMS = [
    # labour, privatisation, agricultural market policy
    "wage revision", "wage hike", "bonus demand", "gratuity", "pay commission",
    "trade union strike", "workers strike", "employees strike", "retrenchment",
    "disinvestment", "privatisation of the plant", "privatization of the plant",
    "contract workers", "minimum wages act", "recruitment scam",
    "farm laws", "three farm laws", "mandi", "msp", "minimum support price",
    "apmc", "procurement price", "fertiliser subsidy", "loan waiver",
    # wildlife-crime enforcement — a policing story, not a community conflict
    "poacher arrested", "poaching racket", "ivory seized", "tiger skin seized",
    "pangolin scales", "wildlife smuggling", "smuggler held", "seized ivory",
    # disaster and accident reporting with no contestation
    "death toll", "rescue operation", "relief camp", "cloudburst",
    "cyclone warning", "imd forecast", "earthquake of magnitude",
    # shared vocabulary in unrelated senses
    "box office", "film shooting", "web series", "cricket", "ipl match",
    "share price", "stock market", "quarterly results", "ipo",
]


# --------------------------------------------------------------------------
# The six types
# --------------------------------------------------------------------------
#   strong  — near-decisive for the type; weighted 3
#   include — corroborating evidence; weighted 1
#   block   — vetoes this type; weighted -4, to keep neighbours apart
#             (a coal plant's ash pond is pollution, not extraction)

CONFLICT_TYPES = [
    {
        "id": "extractive",
        "order": 1,
        "name": "Extractive Resource Conflicts",
        "short": "Extractive",
        "letter": "E",
        "colour": "#8C5A2B",
        "spt": ["materials", "competences"],
        "spt_note": (
            "Subsoil or surface resources are removed and the physical landscape "
            "communities depend on is transformed. Competence asymmetry over legal "
            "resource rights: who can read a lease, a clearance, a compensation formula."
        ),
        "definition": (
            "Contention over the extraction of minerals, hydrocarbons, sand and stone, "
            "including energy and climate conflicts where the driver is extraction."
        ),
        "absorbs": ["Mining Conflicts", "Energy and Climate Conflicts (extraction-driven)"],
        "strong": [
            "coal block", "coal mine", "coal mining", "opencast mine", "open cast",
            "iron ore mine", "iron ore mining", "bauxite mine", "bauxite mining",
            "limestone mine", "limestone quarry", "granite quarry", "stone quarry",
            "quarrying", "illegal quarrying", "stone crusher", "sand mining",
            "illegal sand mining", "river bed mining", "beach sand", "mineral sands",
            "monazite", "uranium mining", "lignite mine", "diamond mining",
            "chromite mine", "manganese mine", "graphite mine",
            "oil drilling", "oil well", "hydrocarbon exploration", "coal bed methane",
            "shale gas", "fracking", "blowout", "mining lease", "mining licence",
            "mining permit", "prospecting licence", "mineral block", "mmdr",
            "coal auction", "anti-mining", "mining project", "mine expansion",
            # water as an extracted resource: groundwater drawn down by a unit is
            # resource removal, not pollution
            "groundwater extraction", "water extraction", "bottling plant",
            "packaged water", "aquifer depletion",
        ],
        "include": [
            "mine", "mines", "mining", "miner", "miners", "quarry", "overburden",
            "tailings", "mine spoil", "excavation", "blasting", "drilling",
            "ore", "coalfield", "colliery", "collieries", "mineral", "minerals",
            "extraction", "royalty", "district mineral foundation",
            "coal india", "ongc", "nmdc", "singareni", "vedanta", "hindalco",
            "nalco", "adani", "jspl", "sesa", "hasdeo", "niyamgiri",
            "borewell", "borewells", "water table fell",
        ],
        "block": ["fly ash", "ash pond", "effluent", "landfill", "dumping yard"],
    },
    {
        "id": "land_agrarian",
        "order": 2,
        "name": "Land-Use and Agrarian Conflicts",
        "short": "Land & Agrarian",
        "letter": "L",
        "colour": "#5C7A29",
        "spt": ["materials", "meanings"],
        "spt_note": (
            "Agricultural and forest land is converted or enclosed. Both the material "
            "basis of subsistence practice and the identity tied to that land are "
            "ruptured — the same practice configuration whether the converting agent "
            "is a plantation company or a state land bank."
        ),
        "definition": (
            "Contention over the acquisition, conversion, enclosure or plantation of "
            "agricultural, common and forest land, including biomass and land-use "
            "conflicts and the land-acquisition dimension of large projects."
        ),
        "absorbs": ["Land-Use Conflicts", "Biomass and Land-Use Conflicts"],
        "strong": [
            "land acquisition", "forcible acquisition", "land acquisition act",
            "rfctlarr", "land pooling", "land bank", "notified for acquisition",
            "section 4 notification", "compensation for land", "land grab",
            "special economic zone", "sez", "industrial corridor",
            "eucalyptus plantation", "teak plantation", "oil palm", "palm oil",
            "rubber plantation", "monoculture plantation", "compensatory afforestation",
            "campa", "jatropha", "energy plantation", "agroforestry scheme",
            "common land", "grazing land", "gochar", "shamlat", "village commons",
            "forest rights act", "fra claims", "individual forest rights",
            "community forest rights", "cfr title", "patta", "pattas",
            "eviction from forest", "eviction drive", "bulldozer",
            "diversion of forest land", "forest land diverted",
            # water for cultivation: an allocation dispute between water users is
            # an agrarian practice conflict, not an infrastructure one
            "irrigation water", "canal water", "water for irrigation",
            "irrigation rights", "command area", "tail end farmers",
            "water denied to farmers", "crops withered",
        ],
        "include": [
            "farmland", "agricultural land", "fertile land", "paddy field",
            "cropland", "orchard", "landholding", "acquired land", "acquire land",
            "displacement", "displaced", "rehabilitation", "resettlement",
            "oustee", "land loser", "consent", "social impact assessment",
            "encroachment", "enclosure", "commons", "shifting cultivation",
            "podu", "jhum", "tenancy", "sharecropper", "landless", "zameen",
            "revenue land", "wasteland", "acres of land", "hectares of land",
            "irrigation", "water sharing", "kharif", "rabi", "standing crop",
        ],
        "block": [],
    },
    {
        "id": "infrastructure",
        "order": 3,
        "name": "Infrastructure and Mobility Conflicts",
        "short": "Infrastructure",
        "letter": "I",
        "colour": "#3E6E8E",
        "spt": ["materials"],
        "spt_note": (
            "Physical infrastructure displaces, fragments or degrades the material "
            "basis of community practice. Distinct from extraction because the end-use "
            "is connectivity and development, not resource removal."
        ),
        "definition": (
            "Contention over the siting and construction of transport, transmission, "
            "urban and hydro-infrastructure: roads, railways, ports, airports, "
            "expressways, dams, canals, power lines and large urban projects."
        ),
        "absorbs": ["Infrastructure Conflicts"],
        "strong": [
            "expressway", "highway widening", "four laning", "six laning",
            "national highway project", "ring road", "elevated corridor",
            "bullet train", "high speed rail", "rail corridor", "freight corridor",
            "metro car shed", "metro depot", "greenfield airport", "airport project",
            "airport expansion", "port project", "greenfield port", "transshipment",
            "jetty", "hydel project", "hydro power project", "hydroelectric project",
            "dam project", "barrage", "reservoir submergence", "submergence",
            "canal project", "lift irrigation", "transmission line",
            "high tension line", "power line", "char dham", "coastal road",
            "smart city project", "township project", "riverfront development",
            "tunnel project", "flyover project", "widening of the road",
        ],
        "include": [
            "flyover", "bypass", "tunnel", "viaduct", "widening", "alignment",
            "realignment", "right of way", "corridor", "terminal", "depot",
            "nhai", "nhpc", "irrigation department", "pwd", "railways",
            "tree felling", "trees felled", "trees to be cut", "trees axed",
            "subsidence", "project affected", "rehabilitation package",
            # water moved by built works — the dispute is over the structure
            "canal", "river diversion", "river linking", "interlinking of rivers",
            "diversion of the river", "dam", "barrage", "weir", "penstock",
        ],
        "block": ["coal mine", "sand mining", "landfill", "dumping yard", "effluent"],
    },
    {
        "id": "conservation",
        "order": 4,
        "name": "Conservation and Biodiversity Conflicts",
        "short": "Conservation",
        "letter": "C",
        "colour": "#2E7D6B",
        "spt": ["meanings"],
        "spt_note": (
            "The dominant rupture is over what the forest or landscape is FOR. "
            "Conservation science and state protection impose a meaning that overrides "
            "local cultural, spiritual and livelihood meanings. Tourism is a subtype "
            "here, not a separate type."
        ),
        "definition": (
            "Contention arising from protected-area declaration and enforcement, "
            "eco-sensitive zoning, human–wildlife conflict, sacred-landscape claims, "
            "and conservation- or tourism-driven restriction of access and use."
        ),
        "absorbs": ["Biodiversity Conflicts", "Tourism-Related Conflicts"],
        "strong": [
            "tiger reserve", "critical tiger habitat", "national park",
            "wildlife sanctuary", "conservation reserve", "community reserve",
            "eco sensitive zone", "eco-sensitive zone", "esz", "buffer zone",
            "core area", "village relocation", "relocation package",
            "human wildlife conflict", "human-wildlife conflict", "man animal conflict",
            "man-animal conflict", "elephant corridor", "crop raiding",
            "cattle lifting", "leopard attack", "elephant attack", "depredation",
            "wild boar menace", "monkey menace", "grazing ban",
            "collection banned", "minor forest produce", "ntfp",
            "sacred grove", "sacred hill", "deity", "eco tourism", "ecotourism",
            "safari project", "resort inside", "homestay", "carrying capacity",
            "western ghats", "kasturirangan", "gadgil report", "esa notification",
            "biosphere reserve", "ramsar site", "declared a sanctuary",
        ],
        "include": [
            "wildlife", "biodiversity", "habitat", "endangered", "conservation",
            "forest department", "range officer", "protected area", "reserve forest",
            "sanctuary", "elephant", "tiger", "leopard", "crop loss compensation",
            "ex gratia", "wildlife protection act", "biological diversity act",
            "tourism", "tourists", "trekking", "pilgrims", "eco fragile",
            "forest guards", "forest officials",
        ],
        "block": [],
    },
    {
        "id": "industrial_pollution",
        "order": 5,
        "name": "Industrial Pollution Conflicts",
        "short": "Industrial Pollution",
        "letter": "P",
        "colour": "#B03A2E",
        "spt": ["materials"],
        "spt_note": (
            "The material environment — air, water, soil — is degraded by industrial "
            "practice, disrupting the conditions under which community practice is "
            "possible at all. Distinct enough in its logic to stand alone."
        ),
        "definition": (
            "Contention over emissions, effluents and contamination from production "
            "facilities: chemical and pharmaceutical plants, smelters, refineries, "
            "tanneries, dyeing units, thermal stations and industrial estates."
        ),
        "absorbs": ["Industrial Pollution Conflicts"],
        "strong": [
            "effluent", "untreated effluent", "effluent discharge",
            "common effluent treatment plant", "industrial effluent", "etp",
            "stack emission", "toxic emission", "gas leak", "chemical leak",
            "fly ash", "ash pond", "ash dyke", "ash slurry", "coal ash",
            "copper smelter", "sterlite", "thoothukudi", "tuticorin",
            "tannery", "dyeing unit", "bleaching unit", "distillery",
            "pharma unit", "bulk drug park", "petrochemical", "refinery",
            "cement plant", "sponge iron", "thermal power plant", "power plant pollution",
            "heavy metals", "groundwater contaminated", "contaminated water",
            "cancer village", "pollution control board", "closure notice",
            "consent to operate", "cpcb", "critically polluted",
            "industrial pollution", "chimney", "toxic waste discharge",
        ],
        "include": [
            "pollution", "polluted", "polluting", "contamination", "toxic",
            "hazardous", "air quality", "particulate", "emissions", "odour",
            "stench", "foam", "fish kill", "skin disease", "respiratory",
            "industrial estate", "sipcot", "midc", "gidc", "industrial area",
            "factory", "plant", "unit", "smelting", "boiler", "discharge",
        ],
        "block": ["landfill", "dumping yard", "garbage", "municipal solid waste"],
    },
    {
        "id": "waste",
        "order": 6,
        "name": "Waste and Disposal Conflicts",
        "short": "Waste & Disposal",
        "letter": "W",
        "colour": "#7A5C9E",
        "spt": ["materials", "meanings"],
        "spt_note": (
            "Proximity to waste sites disrupts both physical living conditions and the "
            "dignity and identity meanings communities attach to their neighbourhood. "
            "Distinct from industrial pollution because the conflict is about where "
            "waste goes, not about production emissions."
        ),
        "definition": (
            "Contention over the siting and operation of disposal infrastructure: "
            "landfills, dumping yards, waste-to-energy and incineration plants, "
            "sewage and septage works, biomedical and e-waste facilities."
        ),
        "absorbs": ["Waste Management Conflicts"],
        "strong": [
            "landfill", "sanitary landfill", "dumping yard", "dump yard",
            "dumping ground", "garbage dump", "waste dump", "legacy waste",
            "waste to energy", "waste-to-energy", "wte plant", "incinerator",
            "incineration", "biomining", "bio mining", "compost plant",
            "solid waste management plant", "transfer station",
            "sewage treatment plant", "septage", "faecal sludge",
            "biomedical waste", "e-waste", "electronic waste", "hazardous waste",
            "tsdf", "secured landfill", "brahmapuram", "deonar", "ghazipur landfill",
            "okhla plant", "kodungaiyur", "mandur", "bhalswa", "dump site",
            "garbage plant", "waste plant", "trenching ground",
        ],
        "include": [
            "garbage", "waste", "trash", "refuse", "municipal solid waste",
            "leachate", "landfill fire", "dump fire", "stink", "flies",
            "waste pickers", "sanitation workers", "municipal corporation",
            "urban local body", "swachh", "not in my backyard",
            "residents welfare association", "segregation", "tonnes of waste",
        ],
        "block": [],
    },
]

TYPES_BY_ID = {t["id"]: t for t in CONFLICT_TYPES}
TYPE_IDS = [t["id"] for t in CONFLICT_TYPES]


# --------------------------------------------------------------------------
# Cross-cutting tags
# --------------------------------------------------------------------------
# Tags never compete with types. A story keeps its single type and gains any
# tag it matches, so "how many water conflicts" is answerable across all six.

CROSS_CUTTING_TAGS = [
    {
        "id": "water",
        "name": "Water-related",
        "colour": "#2C7FB8",
        "note": (
            "River diversion, irrigation rights, dam displacement, groundwater "
            "depletion and drinking-water access. Cross-cutting by design: in India "
            "these run through extraction, agrarian, infrastructure and pollution "
            "practices alike, so water is a tag rather than a seventh type."
        ),
        "strong": [
            "river diversion", "river linking", "interlinking of rivers",
            "water sharing", "water dispute", "riparian", "tribunal award",
            "irrigation water", "canal water", "command area", "tail end farmers",
            "drinking water", "water scarcity", "water crisis", "borewell",
            "groundwater depletion", "over exploited", "water extraction",
            "packaged water", "bottling plant", "dam displacement", "submergence",
            "reservoir", "backwater", "wetland reclamation", "lake encroachment",
            "tank encroachment", "spring dried", "river drying", "river pollution",
            "sewage into the river", "riverfront", "water table", "watershed",
        ],
        "include": [
            "river", "stream", "canal", "dam", "lake", "tank", "pond", "wetland",
            "groundwater", "aquifer", "spring", "estuary", "backwaters",
            "catchment", "water supply", "water rights", "water body", "well",
        ],
    },
    {
        "id": "national_policy",
        "name": "National policy protest",
        "colour": "#6B7280",
        "note": (
            "Not place-based: contention over a national environmental rule or "
            "instrument. Retained by the inclusion rule and flagged so it can be "
            "separated from site-level cases in analysis."
        ),
        "strong": [
            "eia notification", "draft eia", "environment impact assessment notification",
            "forest conservation amendment", "van adhiniyam",
            "biological diversity amendment", "coastal regulation zone notification",
            "crz notification", "wildlife protection amendment",
            "environment ministry notification", "moefcc notification",
            "coal auction policy", "deregulation of clearances", "nationwide protest",
            "mining bill", "mining law", "mines and minerals bill", "mmdr amendment",
            "lok sabha passes", "rajya sabha passes", "ordinance",
        ],
        "include": [
            "notification", "draft rules", "amendment bill", "public comments",
            "consultation", "countrywide", "across the country",
        ],
    },
]

TAGS_BY_ID = {t["id"]: t for t in CROSS_CUTTING_TAGS}


# --------------------------------------------------------------------------
# Matching
# --------------------------------------------------------------------------
# Word-boundary regexes, compiled once. Substring matching would let "mine"
# fire on "determine" and "esz" on "eszett"; a bare `in` test is not safe here.

def _compile(terms):
    parts = []
    for t in sorted(set(terms), key=len, reverse=True):
        esc = re.escape(t).replace(r"\ ", r"[\s\-]+")
        left = r"\b" if t[0].isalnum() else ""
        right = r"\b" if t[-1].isalnum() else ""
        parts.append(f"{left}{esc}{right}")
    return re.compile("|".join(parts), re.IGNORECASE)


def _distinct(pattern, text):
    """Number of DISTINCT terms matched, not total hits — one hammered keyword
    should not outvote three different pieces of evidence."""
    return len({m.group(0).lower() for m in pattern.finditer(text)})


_CONTEST_RE = _compile(CONTESTATION_TERMS)
_ACTOR_RE = _compile(AFFECTED_ACTORS)
_EXCLUDE_RE = _compile(EXCLUSION_TERMS)

for _t in CONFLICT_TYPES:
    _t["_strong_re"] = _compile(_t["strong"])
    _t["_include_re"] = _compile(_t["include"])
    _t["_block_re"] = _compile(_t["block"]) if _t["block"] else None

for _t in CROSS_CUTTING_TAGS:
    _t["_strong_re"] = _compile(_t["strong"])
    _t["_include_re"] = _compile(_t["include"])


STRONG_WEIGHT = 3
INCLUDE_WEIGHT = 1
BLOCK_PENALTY = 4
MIN_TYPE_SCORE = 3        # one strong term, or three corroborating ones
MIN_TAG_SCORE = 3         # a tag needs real evidence, not one stray "river"


def type_scores(text: str) -> dict:
    scores = {}
    for t in CONFLICT_TYPES:
        s = (_distinct(t["_strong_re"], text) * STRONG_WEIGHT
             + _distinct(t["_include_re"], text) * INCLUDE_WEIGHT)
        if t["_block_re"] is not None:
            s -= _distinct(t["_block_re"], text) * BLOCK_PENALTY
        scores[t["id"]] = s
    return scores


def tag_scores(text: str) -> dict:
    return {
        t["id"]: (_distinct(t["_strong_re"], text) * STRONG_WEIGHT
                  + _distinct(t["_include_re"], text) * INCLUDE_WEIGHT)
        for t in CROSS_CUTTING_TAGS
    }


def passes_gate(text: str) -> bool:
    """Contested environmental matter, and not an excluded genre."""
    if _distinct(_EXCLUDE_RE, text) >= 2:
        return False
    return bool(_CONTEST_RE.search(text)) and bool(_ACTOR_RE.search(text))


def classify(text: str, gate: bool = True, min_score: int = MIN_TYPE_SCORE) -> dict:
    """
    Classify one document.

    gate=False skips the contestation test, and a lower min_score relaxes the
    evidence bar — both are for re-classifying records that already passed a
    harvest-time filter and now carry only a headline, where there is no room
    for three corroborating terms.

    Returns {type, type_name, tags, score, margin, scores, reason}. `margin` is
    the gap to the runner-up; a small margin marks a case worth reading by hand.
    """
    text = text or ""
    if gate and not passes_gate(text):
        return {"type": None, "type_name": None, "tags": [], "score": 0,
                "margin": 0, "scores": {}, "reason": "no contestation"}

    scores = type_scores(text)
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_id, top = ranked[0]
    second = ranked[1][1] if len(ranked) > 1 else 0

    if top < min_score:
        return {"type": None, "type_name": None, "tags": [], "score": top,
                "margin": 0, "scores": scores, "reason": "below threshold"}

    tags = [tid for tid, s in tag_scores(text).items() if s >= MIN_TAG_SCORE]
    return {"type": top_id, "type_name": TYPES_BY_ID[top_id]["name"], "tags": tags,
            "score": top, "margin": top - second, "scores": scores, "reason": "ok"}


# --------------------------------------------------------------------------
# Backfill queries
# --------------------------------------------------------------------------
# Generic per-type queries, run against every outlet with a `site:` filter,
# plus landmark named cases that generic queries rank too low to surface.

QUERY_SEEDS = {
    "extractive": [
        "mining protest villagers", "coal mine protest", "sand mining protest",
        "stone quarry protest", "bauxite mining protest tribals",
        "iron ore mining protest", "gram sabha rejects mining",
        "anti-mining agitation Adivasi", "coal block public hearing opposition",
        "mining displacement protest",
    ],
    "land_agrarian": [
        "land acquisition protest farmers", "forest rights act protest",
        "eviction of forest dwellers protest", "plantation land protest",
        "SEZ land acquisition protest", "land pooling protest",
        "common grazing land encroachment protest", "oil palm plantation protest",
        "compensatory afforestation protest gram sabha",
    ],
    "infrastructure": [
        "highway project protest villagers", "expressway land protest farmers",
        "dam displacement protest", "hydel project protest",
        "port project protest fishermen", "airport project protest",
        "transmission line protest farmers", "metro car shed protest",
        "bullet train land protest", "Char Dham road protest",
    ],
    "conservation": [
        "tiger reserve relocation protest", "eco-sensitive zone protest",
        "wildlife sanctuary eviction protest", "human wildlife conflict protest",
        "elephant corridor protest", "eco tourism protest locals",
        "Western Ghats ESA protest", "grazing ban protest forest",
        "sacred grove protest",
    ],
    "industrial_pollution": [
        "factory pollution protest villagers", "effluent protest farmers",
        "thermal power plant ash protest", "chemical plant protest residents",
        "tannery pollution protest", "groundwater contamination protest",
        "cement plant dust protest", "refinery pollution protest",
    ],
    "waste": [
        "landfill protest residents", "dumping yard protest villagers",
        "waste to energy plant protest", "garbage dump protest",
        "sewage treatment plant protest residents", "biomedical waste protest",
        "legacy waste biomining protest",
    ],
    "water": [
        "river diversion protest", "irrigation water protest farmers",
        "groundwater extraction protest bottling plant",
        "drinking water protest villagers", "wetland reclamation protest",
        "lake encroachment protest",
    ],
}

NAMED_CONFLICTS = [
    # extractive
    "Hasdeo Aranya coal protest", "Niyamgiri Dongria Kondh bauxite",
    "Deucha Pachami coal protest", "Buxwaha diamond mining protest",
    "Surjagarh Gadchiroli mining protest", "Nallamala uranium mining protest",
    "Dehing Patkai coal mining protest", "Sijimali bauxite protest",
    "Bailadila Dantewada mining protest", "Singrauli coal displacement protest",
    # land and agrarian
    "Bhoomi Adhikar Andolan land acquisition", "Nandigram land protest",
    "Aarey land protest", "Khori Gaon eviction", "Assam eviction drive protest",
    # infrastructure
    "Sardar Sarovar oustees protest", "Polavaram displacement protest",
    "Vizhinjam port protest fishermen", "Mumbai Ahmedabad bullet train farmers",
    "Great Nicobar project protest", "Subansiri dam protest",
    "Teesta dam protest", "Silkyara Char Dham protest",
    # conservation
    "Nagarhole relocation protest", "Melghat relocation protest",
    "Kaziranga eviction protest", "Western Ghats ESA notification protest",
    "Buffer zone protest Kerala", "Wayanad human wildlife conflict protest",
    # industrial pollution
    "Sterlite Thoothukudi protest", "Patancheru pollution protest",
    "Ennore ash pond protest", "Vapi industrial pollution protest",
    "Eloor Periyar pollution protest", "Bhopal gas survivors protest",
    # waste
    "Brahmapuram waste protest", "Deonar dumping ground protest",
    "Ghazipur landfill protest", "Okhla waste to energy protest",
    "Kodungaiyur dump protest", "Mandur landfill protest",
    # water
    "Plachimada Coca-Cola groundwater protest", "Mullaperiyar protest",
    "Cauvery water protest", "Ken Betwa link protest",
]


# --------------------------------------------------------------------------
# Front-end payload
# --------------------------------------------------------------------------

def taxonomy_payload() -> dict:
    """The typology as the dashboard needs it — no regexes, no keyword lists."""
    return {
        "types": [
            {k: t[k] for k in
             ("id", "order", "name", "short", "letter", "colour",
              "spt", "spt_note", "definition", "absorbs")}
            for t in CONFLICT_TYPES
        ],
        "tags": [
            {k: t[k] for k in ("id", "name", "colour", "note")}
            for t in CROSS_CUTTING_TAGS
        ],
        "sources": [s["source"] for s in SOURCES],
    }


# --------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------

_EXAMPLES = [
    ("Villagers protest proposed coal block in Hasdeo Aranya forest", "extractive"),
    ("Farmers oppose land acquisition for industrial corridor in Raigad", "land_agrarian"),
    ("Fishermen protest against Vizhinjam port project construction", "infrastructure"),
    ("Tribals oppose relocation from tiger reserve core area", "conservation"),
    ("Residents protest untreated effluent from tannery polluting groundwater", "industrial_pollution"),
    ("Villagers block trucks at proposed dumping yard, oppose landfill", "waste"),
    ("Farmers protest as canal water for irrigation is diverted to the city",
     "land_agrarian"),
    ("Villagers oppose groundwater extraction by bottling plant, borewells dry",
     "extractive"),
    ("Oustees protest submergence of villages by the dam project reservoir",
     "infrastructure"),
    ("Kerala cricket team wins the match at the stadium", None),
]

if __name__ == "__main__":
    print(f"{len(CONFLICT_TYPES)} types, {len(CROSS_CUTTING_TAGS)} tags, "
          f"{len(SOURCES)} sources\n")
    ok = 0
    for text, expected in _EXAMPLES:
        r = classify(text)
        if r["type"] == expected:
            ok += 1
        mark = "ok  " if r["type"] == expected else "MISS"
        got = r["type"] or "(dropped)"
        print(f"  {mark} {got:22s} tags={','.join(r['tags']) or '-':16s} "
              f"score={r['score']:>3} margin={r['margin']:>3}  {text[:56]}")
    print(f"\n{ok}/{len(_EXAMPLES)} as expected. Water cases land in a type "
          f"and carry the water tag, which is the point of the tag.")
