"""
Tests for claude_service — pure functions and run_analysis (Story 4.2: Problem Validation Logic).

Covers: confidence formula, cost calculation, prompt builder, JSON extractor,
and run_analysis (with mocked anthropic client).
No live Claude API calls required.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ============================================================================
# LangSmith tracing (regression: ensure LLM path is traced when langsmith installed)
# ============================================================================

class TestLangSmithTraceable:
    """When langsmith is installed, critical functions must be @traceable-decorated."""

    def test_invoke_claude_is_traceable_when_langsmith_installed(self):
        pytest.importorskip("langsmith")
        from app.services import claude_service
        assert getattr(
            claude_service._invoke_claude, "__langsmith_traceable__", False
        ), "_invoke_claude should be @traceable when langsmith is installed"

    def test_run_analysis_is_traceable_when_langsmith_installed(self):
        pytest.importorskip("langsmith")
        from app.services import claude_service
        assert getattr(
            claude_service.run_analysis, "__langsmith_traceable__", False
        ), "run_analysis should be @traceable when langsmith is installed"


# ============================================================================
# calculate_confidence_score tests
# ============================================================================

class TestCalculateConfidenceScore:
    def test_formula_weighted_sum(self):
        from app.services.claude_service import calculate_confidence_score
        result = calculate_confidence_score(0.8, 0.7, 0.9)
        expected = 0.8 * 0.4 + 0.7 * 0.35 + 0.9 * 0.25
        assert abs(result - expected) < 0.001

    def test_capped_at_0_95(self):
        from app.services.claude_service import calculate_confidence_score
        result = calculate_confidence_score(1.0, 1.0, 1.0)
        assert result == 0.95

    def test_zero_scores_return_zero(self):
        from app.services.claude_service import calculate_confidence_score
        result = calculate_confidence_score(0.0, 0.0, 0.0)
        assert result == 0.0

    def test_mid_range_scores(self):
        from app.services.claude_service import calculate_confidence_score
        result = calculate_confidence_score(0.5, 0.5, 0.5)
        expected = 0.5 * 0.4 + 0.5 * 0.35 + 0.5 * 0.25
        assert abs(result - expected) < 0.001

    def test_low_frequency_reduces_score(self):
        from app.services.claude_service import calculate_confidence_score
        # Only frequency differs — high everything else but zero frequency
        high = calculate_confidence_score(0.8, 0.8, 0.8)
        low_freq = calculate_confidence_score(0.0, 0.8, 0.8)
        assert low_freq < high

    def test_result_rounded_to_4_decimal_places(self):
        from app.services.claude_service import calculate_confidence_score
        result = calculate_confidence_score(0.7, 0.6, 0.8)
        # Result should have at most 4 decimal places
        assert result == round(result, 4)


# ============================================================================
# calculate_cost tests
# ============================================================================

class TestCalculateCost:
    def test_sonnet_cost_calculation(self):
        from app.services.claude_service import calculate_cost
        cost = calculate_cost(1_000_000, 1_000_000, "claude-sonnet-4-6")
        expected = 3.00 + 15.00  # $3 input + $15 output per 1M tokens
        assert abs(cost - expected) < 0.0001

    def test_small_token_count(self):
        from app.services.claude_service import calculate_cost
        cost = calculate_cost(1000, 500, "claude-sonnet-4-6")
        expected = (1000 * 3.00 / 1_000_000) + (500 * 15.00 / 1_000_000)
        assert abs(cost - expected) < 0.000001

    def test_unknown_model_falls_back_to_sonnet(self):
        from app.services.claude_service import calculate_cost
        cost_unknown = calculate_cost(1000, 500, "unknown-model-xyz")
        cost_sonnet = calculate_cost(1000, 500, "claude-sonnet-4-6")
        assert cost_unknown == cost_sonnet

    def test_opus_is_more_expensive_than_sonnet(self):
        from app.services.claude_service import calculate_cost
        sonnet_cost = calculate_cost(10000, 5000, "claude-sonnet-4-6")
        opus_cost = calculate_cost(10000, 5000, "claude-opus-4-6")
        assert opus_cost > sonnet_cost

    def test_haiku_is_cheapest(self):
        from app.services.claude_service import calculate_cost
        haiku_cost = calculate_cost(10000, 5000, "claude-haiku-4-5-20251001")
        sonnet_cost = calculate_cost(10000, 5000, "claude-sonnet-4-6")
        assert haiku_cost < sonnet_cost

    def test_zero_tokens_zero_cost(self):
        from app.services.claude_service import calculate_cost
        assert calculate_cost(0, 0, "claude-sonnet-4-6") == 0.0


# ============================================================================
# build_problem_validation_prompt tests
# ============================================================================

class TestBuildProblemValidationPrompt:
    def test_includes_assumed_problem(self):
        from app.services.claude_service import build_problem_validation_prompt
        prompt = build_problem_validation_prompt(
            "problem-validation",
            "Companies lose money tracking RFPs",
            [],
            [],
        )
        assert "Companies lose money tracking RFPs" in prompt

    def test_includes_objective(self):
        from app.services.claude_service import build_problem_validation_prompt
        prompt = build_problem_validation_prompt("problem-validation", None, [], [])
        assert "problem-validation" in prompt

    def test_includes_source_filename(self):
        from app.services.claude_service import build_problem_validation_prompt
        sources = [("interview.txt", "Some content")]
        prompt = build_problem_validation_prompt("problem-validation", None, [], sources)
        assert "interview.txt" in prompt

    def test_adds_line_numbers_to_sources(self):
        from app.services.claude_service import build_problem_validation_prompt
        sources = [("test.txt", "line one\nline two\nline three")]
        prompt = build_problem_validation_prompt("problem-validation", None, [], sources)
        assert "1: line one" in prompt
        assert "2: line two" in prompt
        assert "3: line three" in prompt

    def test_includes_target_segments(self):
        from app.services.claude_service import build_problem_validation_prompt
        prompt = build_problem_validation_prompt(
            "problem-validation", None, ["RFP Buyer", "MSP User"], []
        )
        assert "RFP Buyer" in prompt
        assert "MSP User" in prompt

    def test_no_assumed_problem_uses_fallback(self):
        from app.services.claude_service import build_problem_validation_prompt
        prompt = build_problem_validation_prompt("problem-validation", None, [], [])
        assert "No explicit problem statement" in prompt

    def test_multiple_sources_all_included(self):
        from app.services.claude_service import build_problem_validation_prompt
        sources = [
            ("interview-001.txt", "content a"),
            ("survey.csv", "content b"),
        ]
        prompt = build_problem_validation_prompt("problem-validation", None, [], sources)
        assert "interview-001.txt" in prompt
        assert "survey.csv" in prompt

    def test_source_count_in_prompt(self):
        from app.services.claude_service import build_problem_validation_prompt
        sources = [("a.txt", "x"), ("b.txt", "y"), ("c.txt", "z")]
        prompt = build_problem_validation_prompt("problem-validation", None, [], sources)
        assert "3 total" in prompt

    def test_oversized_source_is_truncated(self):
        from app.services.claude_service import build_problem_validation_prompt, _MAX_CHARS_PER_SOURCE
        large_text = "x" * (_MAX_CHARS_PER_SOURCE + 1000)
        prompt = build_problem_validation_prompt("obj", None, [], [("big.txt", large_text)])
        assert "source truncated" in prompt

    def test_truncation_marker_preserved_when_near_budget(self):
        """When remaining budget is small, the truncation marker must still appear (not sliced away)."""
        from app.services.claude_service import (
            _MAX_TOTAL_SOURCE_CHARS,
            build_problem_validation_prompt,
        )
        # First source consumes almost all budget; second source is large and gets truncated
        first_len = _MAX_TOTAL_SOURCE_CHARS - 100
        first_content = "a" * first_len
        second_content = "b" * 1000  # will be truncated with marker
        sources = [("first.txt", first_content), ("second.txt", second_content)]
        prompt = build_problem_validation_prompt("obj", None, [], sources)
        # Marker appears in prompt (possibly with line prefix "N: "; core text must be present)
        assert "[... source truncated ...]" in prompt

    def test_total_source_limit_omits_excess_sources(self):
        from app.services.claude_service import build_problem_validation_prompt, _MAX_TOTAL_SOURCE_CHARS
        # Two sources that together exceed the total limit
        chunk = "y" * (_MAX_TOTAL_SOURCE_CHARS)
        sources = [("first.txt", chunk), ("second.txt", "should be omitted")]
        prompt = build_problem_validation_prompt("obj", None, [], sources)
        assert "second.txt" not in prompt or "omitted" in prompt


# ============================================================================
# _extract_json tests
# ============================================================================

class TestExtractJson:
    def test_clean_json_object(self):
        from app.services.claude_service import _extract_json
        data = {"frequency_score": 0.8, "insights": []}
        result = _extract_json(json.dumps(data))
        assert result["frequency_score"] == 0.8

    def test_json_with_preamble(self):
        from app.services.claude_service import _extract_json
        text = 'Here is the analysis:\n{"frequency_score": 0.7, "insights": []}'
        result = _extract_json(text)
        assert result["frequency_score"] == 0.7

    def test_json_with_postamble(self):
        from app.services.claude_service import _extract_json
        text = '{"frequency_score": 0.6, "insights": []}\n\nI hope this helps!'
        result = _extract_json(text)
        assert result["frequency_score"] == 0.6

    def test_json_with_both_preamble_and_postamble(self):
        from app.services.claude_service import _extract_json
        text = 'Analysis:\n{"x": 1}\nDone.'
        result = _extract_json(text)
        assert result["x"] == 1

    def test_invalid_json_raises(self):
        from app.services.claude_service import _extract_json
        with pytest.raises(json.JSONDecodeError):
            _extract_json("not json at all")

    def test_postamble_with_braces_uses_brace_matching(self):
        """Postamble containing '}' must not be included; extract by matching first { to its closing }."""
        from app.services.claude_service import _extract_json
        text = '{"frequency_score": 0.5, "insights": []} Additional {context} for reference'
        result = _extract_json(text)
        assert result["frequency_score"] == 0.5
        assert result["insights"] == []


# ============================================================================
# run_analysis tests (mocked anthropic client)
# ============================================================================

def _make_mock_response(payload: dict, input_tokens: int = 1000, output_tokens: int = 500):
    """Build a mock anthropic message response."""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(payload))]
    mock_response.usage.input_tokens = input_tokens
    mock_response.usage.output_tokens = output_tokens
    return mock_response


_VALID_PAYLOAD = {
    "frequency_score": 0.8,
    "consistency_score": 0.7,
    "strength_score": 0.9,
    "insights": [
        {
            "type": "finding",
            "text": "Problem confirmed in 4 of 5 sources.",
            "citation": "interview.txt:line 3",
            "confidence": 0.85,
            "source_count": 4,
        }
    ],
}


def _patch_make_client(messages_create_return):
    """Patch _make_client to return a mock client whose messages.create returns the given value."""
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=messages_create_return)
    return patch("app.services.claude_service._make_client", return_value=mock_client)


class TestRunAnalysis:
    @pytest.mark.asyncio
    async def test_successful_analysis_returns_all_keys(self):
        from app.services.claude_service import run_analysis
        with _patch_make_client(_make_mock_response(_VALID_PAYLOAD)):
            result = await run_analysis("problem-validation", None, [], [])
        assert set(result.keys()) == {
            "confidence_score", "insights", "tokens_used", "cost_usd", "raw_response"
        }

    @pytest.mark.asyncio
    async def test_confidence_score_matches_formula(self):
        from app.services.claude_service import run_analysis, calculate_confidence_score
        with _patch_make_client(_make_mock_response(_VALID_PAYLOAD)):
            result = await run_analysis("problem-validation", None, [], [])
        expected = calculate_confidence_score(0.8, 0.7, 0.9)
        assert result["confidence_score"] == expected

    @pytest.mark.asyncio
    async def test_tokens_used_is_sum_of_input_and_output(self):
        from app.services.claude_service import run_analysis
        with _patch_make_client(_make_mock_response(_VALID_PAYLOAD, input_tokens=1000, output_tokens=500)):
            result = await run_analysis("problem-validation", None, [], [])
        assert result["tokens_used"] == 1500

    @pytest.mark.asyncio
    async def test_cost_usd_is_calculated(self):
        from app.services.claude_service import run_analysis, calculate_cost, CLAUDE_MODEL
        with _patch_make_client(_make_mock_response(_VALID_PAYLOAD, input_tokens=1000, output_tokens=500)):
            result = await run_analysis("problem-validation", None, [], [])
        assert result["cost_usd"] == calculate_cost(1000, 500, CLAUDE_MODEL)

    @pytest.mark.asyncio
    async def test_insights_list_passed_through(self):
        from app.services.claude_service import run_analysis
        with _patch_make_client(_make_mock_response(_VALID_PAYLOAD)):
            result = await run_analysis("problem-validation", None, [], [])
        assert len(result["insights"]) == 1
        assert result["insights"][0]["type"] == "finding"

    @pytest.mark.asyncio
    async def test_missing_required_keys_raises_value_error(self):
        from app.services.claude_service import run_analysis
        incomplete = {"some": "junk"}
        with _patch_make_client(_make_mock_response(incomplete)):
            with pytest.raises(ValueError, match="missing required keys"):
                await run_analysis("problem-validation", None, [], [])

    @pytest.mark.asyncio
    async def test_malformed_json_raises_json_decode_error(self):
        from app.services.claude_service import run_analysis
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not valid json at all")]
        mock_response.usage.input_tokens = 100
        mock_response.usage.output_tokens = 50
        with _patch_make_client(mock_response):
            with pytest.raises(json.JSONDecodeError):
                await run_analysis("problem-validation", None, [], [])

    @pytest.mark.asyncio
    async def test_raw_response_preserved(self):
        from app.services.claude_service import run_analysis
        with _patch_make_client(_make_mock_response(_VALID_PAYLOAD)):
            result = await run_analysis("problem-validation", None, [], [])
        assert result["raw_response"] == json.dumps(_VALID_PAYLOAD)


# ============================================================================
# run_recommendations_generation (Story 6-1)
# ============================================================================

_VALID_RECOMMENDATIONS_PAYLOAD = {
    "action_items": ["Interview 3 more customers", "Validate pricing assumption"],
    "interview_script_md": "# Intro\\n\\nKey questions...",
    "survey_template_md": "# Screening\\n\\nMain questions...",
    "can_create_next_project": True,
    "suggested_next_objective": "positioning",
}


class TestRunRecommendationsGeneration:
    @pytest.mark.asyncio
    async def test_returns_all_required_keys(self):
        from app.services.claude_service import run_recommendations_generation
        with _patch_make_client(_make_mock_response(_VALID_RECOMMENDATIONS_PAYLOAD)):
            result = await run_recommendations_generation(
                "My Project", "problem-validation", 0.7, 5
            )
        assert set(result.keys()) == {
            "action_items", "interview_script_md", "survey_template_md",
            "can_create_next_project", "suggested_next_objective",
        }
        assert result["action_items"] == ["Interview 3 more customers", "Validate pricing assumption"]
        assert result["can_create_next_project"] is True
        assert result["suggested_next_objective"] == "positioning"

    @pytest.mark.asyncio
    async def test_invalid_suggested_next_objective_normalized_to_none(self):
        from app.services.claude_service import run_recommendations_generation
        payload = {**_VALID_RECOMMENDATIONS_PAYLOAD, "suggested_next_objective": "invalid-objective"}
        with _patch_make_client(_make_mock_response(payload)):
            result = await run_recommendations_generation(
                "Proj", "problem-validation", 0.5, 3
            )
        assert result["suggested_next_objective"] is None

    @pytest.mark.asyncio
    async def test_missing_required_keys_raises(self):
        from app.services.claude_service import run_recommendations_generation
        with _patch_make_client(_make_mock_response({"action_items": []})):
            with pytest.raises(ValueError, match="missing required keys"):
                await run_recommendations_generation("P", "positioning", 0.6, 2)


# ============================================================================
# run_intake_scope tests
# ============================================================================

_VALID_INTAKE_PAYLOAD = {
    "engagement_summary": "Acme Corp engagement: discover ICP and messaging for enterprise sales.",
    "icp_hypothesis": ["B2B SaaS", "VP Product buyer", "Series A-B"],
    "discovery_questions": ["What is your biggest activation blocker?", "Describe your best customer."],
    "suggested_engagement_type": "discovery",
}


class TestRunIntakeScope:
    @pytest.mark.asyncio
    async def test_builds_user_message_from_company_name(self):
        """User message must include company_name."""
        from app.services.claude_service import run_intake_scope
        with _patch_make_client(_make_mock_response(_VALID_INTAKE_PAYLOAD)) as mock_make_client:
            await run_intake_scope(
                company_name="Acme Corp",
                context="B2B SaaS platform",
                win_definition="Clear ICP",
            )
        # Verify the client was called with content that includes the company name
        mock_client = mock_make_client.return_value
        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs is not None
        messages = call_kwargs.kwargs.get("messages") or call_kwargs.args[0] if call_kwargs.args else None
        if messages is None and hasattr(call_kwargs, "kwargs"):
            messages = call_kwargs.kwargs.get("messages", [])
        user_msg = next((m for m in (messages or []) if m.get("role") == "user"), None)
        assert user_msg is not None, "No user message passed to Claude"
        assert "Acme Corp" in user_msg["content"]

    @pytest.mark.asyncio
    async def test_returns_all_required_keys(self):
        from app.services.claude_service import run_intake_scope
        with _patch_make_client(_make_mock_response(_VALID_INTAKE_PAYLOAD)):
            result = await run_intake_scope("Acme Corp", "context", "win")
        assert "engagement_summary" in result
        assert "icp_hypothesis" in result
        assert "discovery_questions" in result
        assert "suggested_engagement_type" in result
        assert "tokens_used" in result
        assert "cost_usd" in result

    @pytest.mark.asyncio
    async def test_missing_required_keys_raises_value_error(self):
        from app.services.claude_service import run_intake_scope
        incomplete = {"some": "junk"}
        with _patch_make_client(_make_mock_response(incomplete)):
            with pytest.raises(ValueError, match="missing required keys"):
                await run_intake_scope("Acme Corp", "", "")
