"""Tests for strength-of-support utility (Epic 2/3)."""

import pytest

from app.utils.strength import confidence_to_strength, truncate_assumed_problem


class TestConfidenceToStrength:
    def test_none_returns_none(self):
        assert confidence_to_strength(None) is None

    def test_strong_threshold(self):
        assert confidence_to_strength(0.7) == "strong"
        assert confidence_to_strength(0.95) == "strong"

    def test_emerging_band(self):
        assert confidence_to_strength(0.4) == "emerging"
        assert confidence_to_strength(0.5) == "emerging"
        assert confidence_to_strength(0.69) == "emerging"

    def test_weak_band(self):
        assert confidence_to_strength(0.0) == "weak"
        assert confidence_to_strength(0.39) == "weak"


class TestTruncateAssumedProblem:
    def test_none_returns_none(self):
        assert truncate_assumed_problem(None) is None
        assert truncate_assumed_problem("") is None
        assert truncate_assumed_problem("   ") is None

    def test_short_string_unchanged(self):
        s = "Teams lose time tracking RFPs"
        assert truncate_assumed_problem(s) == s
        assert truncate_assumed_problem(s, max_chars=80) == s

    def test_long_string_truncated_with_ellipsis(self):
        s = "a" * 100
        out = truncate_assumed_problem(s, max_chars=80)
        assert len(out) == 80
        assert out.endswith("…")
        assert out == "a" * 79 + "…"
