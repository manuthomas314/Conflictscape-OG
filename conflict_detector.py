"""
Superseded. Kept only so an old import does not break.

This module used to hold a human–wildlife conflict detector inherited from the
WildLens build: it classified articles into attack, poaching, crop raid and
roadkill categories, which is not what Conflictscape studies. The environmental
conflict typology, its keyword lexicon and its classifier now live in
conflict_types.py, and the six types are keyed to social practice theory rather
than to species and severity.

    from conflict_types import classify
    classify("Villagers protest proposed coal block in Hasdeo Aranya forest")

This file will be deleted once nothing references it.
"""

from conflict_types import classify  # noqa: F401
