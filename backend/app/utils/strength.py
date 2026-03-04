"""Strength-of-support derivation for problem-validation analysis (Epic 2/3)."""

from typing import Literal

StrengthOfSupport = Literal["strong", "emerging", "weak"]

# Bands: strong >= 0.7, emerging in [0.4, 0.7), weak < 0.4
_STRONG_THRESHOLD = 0.7
_EMERGING_THRESHOLD = 0.4


def confidence_to_strength(confidence_score: float | None) -> StrengthOfSupport | None:
    """Map confidence_score (0.0–1.0) to strength-of-support label for quick view.

    - strong: confidence >= 0.7
    - emerging: 0.4 <= confidence < 0.7
    - weak: confidence < 0.4
    - None: no analysis (confidence_score is None)
    """
    if confidence_score is None:
        return None
    c = float(confidence_score)
    if c >= _STRONG_THRESHOLD:
        return "strong"
    if c >= _EMERGING_THRESHOLD:
        return "emerging"
    return "weak"


def truncate_assumed_problem(text: str | None, max_chars: int = 80) -> str | None:
    """Return truncated assumed problem for quick view; None if input is None or empty."""
    if not text or not str(text).strip():
        return None
    s = str(text).strip()
    if len(s) <= max_chars:
        return s
    return s[: max_chars - 1].rstrip() + "…"
