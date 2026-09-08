"""
Deciphering Conflicts Conflict Detection Engine
Analyzes news articles and determines:
1. Is this an actual human-wildlife or human-created conflict? (True/False)
2. Conflict Category (attack, retaliatory killing, poaching, crop/livestock raid, train/road hit, encroachment)
3. Involved Species and Impact
4. Severity Score (1-5)
"""

import re
from typing import Dict, Any, Optional

# ---------------------------------------------------------------------------
# Lexical & Pattern Knowledge Base
# ---------------------------------------------------------------------------

# Exclusions: Definite non-conflict / noise indicators
NON_CONFLICT_PATTERNS = [
    r"\bphotography\b", r"\bcontest\b", r"\bdocumentary\b", r"\bmovie\b",
    r"\bsong\b", r"\btourism\b", r"\bsafari open", r"\btourist season\b",
    r"\bcensus\b", r"\bpopulation (rises|increases|grows)\b", r"\bnew species\b",
    r"\bdiscovered\b", r"\bstudy reveals\b", r"\bwelcomes? cub", r"\bbirth of\b",
    r"\benterprise\b", r"\bmsme\b", r"\bstartup\b", r"\bcricket\b", r"\bpolitics\b",
]

# High-priority conflict verbs & triggers
HUMAN_ATTACK_TRIGGERS = [
    r"\bkills? (\d+ )?(man|woman|villager|farmer|person|child|people|labourer|grazier|tribal)\b",
    r"\bmauls? (\d+ )?(man|woman|villager|farmer|person|child|people|labourer|grazier)\b",
    r"\b(attacks?|tramples?|gores?|injures?) (\d+ )?(man|woman|villager|farmer|person|people)\b",
    r"\b(man|woman|farmer|villager|person) (killed|mauled|trampled|injured|gored|attacked) by\b",
    r"\b(human-wildlife|man-animal|human-elephant|human-tiger|human-leopard) conflict\b",
    r"\b(tiger|leopard|elephant|bear) (terror|panic|prowl|menace)\b",
]

RETALIATORY_AND_TRAP_TRIGGERS = [
    r"\belectrocuted\b", r"\belectrocution\b", r"\bpoisoned\b", r"\bcarcass found\b",
    r"\btrapped in (wire|snare|fence|net|well)\b", r"\bsnared?\b", r"\bmob (beats?|kills?|burns?)\b",
    r"\bretaliatory\b", r"\billegal electric (fence|wire)\b", r"\bcrush(ed)? by train\b",
    r"\bhit by (train|speeding vehicle|truck)\b", r"\broadkill\b",
]

POACHING_AND_CRIME_TRIGGERS = [
    r"\bpoach(ed|ing|ers?)?\b", r"\bsmugg(led?|ing|ers?)\b", r"\bseized?\b",
    r"\btrapped by poachers\b", r"\bivory\b", r"\btiger skin\b", r"\bpangolin scales\b",
    r"\bdeer meat\b", r"\bvenison\b", r"\bwildlife crime\b", r"\billegal hunt(ing)?\b",
    r"\barrested with\b", r"\bskins? seized\b",
]

CROP_LIVESTOCK_TRIGGERS = [
    r"\b(cattle|cow|goat|calf|buffalo|sheep) (killed|lifted|preyed|mauled) by\b",
    r"\braids? crops?\b", r"\bdestroys? (crops?|paddy|plantation|houses?|homes?)\b",
    r"\belephant herd (damages?|wreaks havoc|raids?)\b",
]

HABITAT_ENCROACHMENT_TRIGGERS = [
    r"\billegal min(ing|e)\b", r"\btree felling\b", r"\bencroach(ment|ed|ing)?\b",
    r"\bforest land (diverted|grabbed|cleared)\b", r"\bforest fire (arson|caused by)\b",
    r"\bclash with forest (guards?|officials?|rangers?)\b",
]

SPECIES_PATTERNS = {
    "Tiger": r"\btiger(s|ss)?\b",
    "Leopard": r"\bleopard(s)?\b",
    "Elephant": r"\belephant(s)?\b",
    "Sloth Bear": r"\b(sloth )?bear(s)?\b",
    "Rhino": r"\brhino(s|ceros)?\b",
    "Crocodile / Gharial": r"\b(crocodile|gharial|mugger)(s)?\b",
    "Snake": r"\b(snake|cobra|viper|krait|python)(s)?\b",
    "Wild Boar": r"\b(wild )?boar(s)?\b",
    "Lion": r"\b(asiatic )?lion(s|ess)?\b",
}


def detect_species(text: str) -> Optional[str]:
    for species, pattern in SPECIES_PATTERNS.items():
        if re.search(pattern, text, re.IGNORECASE):
            return species
    return "Unknown Wildlife"


def analyze_conflict(headline: str, summary: str = "") -> Dict[str, Any]:
    """
    Evaluates whether an article represents a genuine conflict.
    Returns structured incident analysis.
    """
    full_text = f"{headline} {summary}".strip()
    lowered = full_text.lower()

    # Step 1: Filter out explicit non-conflict noise
    for neg_pat in NON_CONFLICT_PATTERNS:
        if re.search(neg_pat, lowered):
            # Verify it isn't an attack during a census/safari
            if not any(re.search(p, lowered) for p in HUMAN_ATTACK_TRIGGERS):
                return {
                    "is_conflict": False,
                    "confidence": 0.90,
                    "reason": f"Matched non-conflict pattern: {neg_pat}",
                    "conflict_type": None,
                    "severity": 0,
                }

    species = detect_species(lowered)

    # Step 2: Human Casualty / Animal Attack (Highest Severity)
    for pat in HUMAN_ATTACK_TRIGGERS:
        if re.search(pat, lowered):
            fatal = bool(re.search(r"\b(killed|dead|dies|fatal|death)\b", lowered))
            return {
                "is_conflict": True,
                "confidence": 0.95,
                "conflict_type": "Human Casualty / Physical Attack",
                "subtype": "wildlife_to_human",
                "species": species,
                "severity": 5 if fatal else 4,
                "severity_label": "Critical" if fatal else "High",
                "summary": "Direct wildlife attack causing human injury or fatality.",
            }

    # Step 3: Retaliation, Electrocution, Snares, Traps (Human-created hazard)
    for pat in RETALIATORY_AND_TRAP_TRIGGERS:
        if re.search(pat, lowered):
            return {
                "is_conflict": True,
                "confidence": 0.92,
                "conflict_type": "Retaliation / Unlawful Hazard",
                "subtype": "human_to_wildlife",
                "species": species,
                "severity": 4,
                "severity_label": "High",
                "summary": "Wildlife killed or injured by human infrastructure, electrocution, snaring, or vehicle collision.",
            }

    # Step 4: Poaching, Smuggling, Wildlife Crime
    for pat in POACHING_AND_CRIME_TRIGGERS:
        if re.search(pat, lowered):
            return {
                "is_conflict": True,
                "confidence": 0.93,
                "conflict_type": "Poaching & Illegal Exploitation",
                "subtype": "human_to_wildlife",
                "species": species,
                "severity": 4,
                "severity_label": "High",
                "summary": "Illegal hunting, trapping, or wildlife body parts trafficking.",
            }

    # Step 5: Crop Raiding & Livestock Depredation (Economic Conflict)
    for pat in CROP_LIVESTOCK_TRIGGERS:
        if re.search(pat, lowered):
            return {
                "is_conflict": True,
                "confidence": 0.88,
                "conflict_type": "Crop & Livestock Depredation",
                "subtype": "wildlife_to_property",
                "species": species,
                "severity": 3,
                "severity_label": "Moderate",
                "summary": "Wild animals entering agricultural fields or destroying livestock/dwellings.",
            }

    # Step 6: Habitat Encroachment & Clashes with Rangers
    for pat in HABITAT_ENCROACHMENT_TRIGGERS:
        if re.search(pat, lowered):
            return {
                "is_conflict": True,
                "confidence": 0.85,
                "conflict_type": "Habitat Destruction & Encroachment",
                "subtype": "human_to_habitat",
                "species": species,
                "severity": 3,
                "severity_label": "Moderate",
                "summary": "Illegal land grab, mining, tree felling, or violence against forest protection staff.",
            }

    # Strayed into human settlements (Interface without confirmed casualties yet)
    if re.search(r"\b(strays? into|enters? (village|house|town|colony|residential|garden)|wanders into)\b", lowered):
        return {
            "is_conflict": True,
            "confidence": 0.78,
            "conflict_type": "Urban/Village Intrusion (Interface Hazard)",
            "subtype": "interface_risk",
            "species": species,
            "severity": 2,
            "severity_label": "Low-Moderate",
            "summary": "Wildlife venturing into populated areas creating risk of conflict.",
        }

    return {
        "is_conflict": False,
        "confidence": 0.75,
        "reason": "No aggressive, lethal, illegal, or destructive conflict patterns detected.",
        "conflict_type": None,
        "severity": 0,
    }
