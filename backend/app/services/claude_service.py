"""Claude AI integration service — analysis execution and problem validation logic.

Stories 4.1 (SSE streaming infrastructure) and 4.2 (problem validation logic)
are both implemented here since they share the same Claude call pipeline.
"""

import json
import os

import anthropic

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

# Module-level singleton — avoids re-creating the HTTP client on every analysis call
_client = anthropic.AsyncAnthropic()

# ── Model pricing (USD per token) ────────────────────────────────────────────

_MODEL_RATES: dict[str, dict[str, float]] = {
    "claude-sonnet-4-6": {"input": 3.00 / 1_000_000, "output": 15.00 / 1_000_000},
    "claude-opus-4-6": {"input": 15.00 / 1_000_000, "output": 75.00 / 1_000_000},
    "claude-haiku-4-5-20251001": {"input": 0.80 / 1_000_000, "output": 4.00 / 1_000_000},
}
_DEFAULT_RATES = _MODEL_RATES["claude-sonnet-4-6"]


# ── Problem Validation system prompt ─────────────────────────────────────────

PROBLEM_VALIDATION_SYSTEM_PROMPT = """You are an expert discovery analyst. Your task is to analyze research data and determine whether a startup's assumed problem is real and validated.

Analyze all provided data sources and return ONLY a valid JSON object (no prose before or after) with this exact structure:

{
  "frequency_score": <float 0.0-1.0>,
  "consistency_score": <float 0.0-1.0>,
  "strength_score": <float 0.0-1.0>,
  "insights": [
    {
      "type": "finding",
      "text": "<1-2 sentence insight>",
      "citation": "<exact_filename>:line <N>",
      "confidence": <float 0.0-1.0>,
      "source_count": <int>
    }
  ]
}

Score definitions:
- frequency_score: proportion of data sources that explicitly or implicitly mention the assumed problem (0.0 = none mention it, 1.0 = all mention it)
- consistency_score: how consistently sources agree on the nature and severity of the problem (0.0 = highly contradictory, 1.0 = fully aligned)
- strength_score: quality of evidence (0.0 = absent/vague mentions only, 0.5 = inferred from context, 1.0 = explicit and specific with details)

Insight type rules:
- "finding": evidence that directly supports or relates to the assumed problem; MUST have a citation
- "contradiction": evidence that conflicts with or undermines the assumed problem; MUST have a citation
- "gap": important information that is missing and would strengthen validation; citation should be null

Citation format: "<exact_filename>:line <N>" where N is the 1-indexed line number from the source. For gaps, use null.

Rules:
- Return 4-8 total insights (mix of findings, contradictions, and gaps)
- Be calibrated: if evidence is weak, score lower — avoid overconfidence
- Every "finding" and "contradiction" MUST have a non-null citation
- Include at least 1 "gap" insight if data appears incomplete
- confidence field: use null for "gap" type insights
- source_count: number of distinct sources supporting this insight (0 for gaps)
"""


# ── Pure functions (Story 4.2) ────────────────────────────────────────────────


def calculate_confidence_score(
    frequency_score: float,
    consistency_score: float,
    strength_score: float,
) -> float:
    """Compute calibrated confidence from three component scores.

    Formula: frequency * 0.4 + consistency * 0.35 + strength * 0.25
    Capped at 0.95 (never 100%). Never below 0.0.
    """
    raw = frequency_score * 0.4 + consistency_score * 0.35 + strength_score * 0.25
    return round(min(0.95, max(0.0, raw)), 4)


def calculate_cost(input_tokens: int, output_tokens: int, model: str) -> float:
    """Calculate USD cost from token counts and model name.

    Falls back to Sonnet rates for unrecognized models.
    """
    rates = _MODEL_RATES.get(model, _DEFAULT_RATES)
    return round((input_tokens * rates["input"]) + (output_tokens * rates["output"]), 6)


_MAX_CHARS_PER_SOURCE = 50_000   # ~12K tokens per source
_MAX_TOTAL_SOURCE_CHARS = 150_000  # ~37K tokens across all sources


def build_problem_validation_prompt(
    objective: str,
    assumed_problem: str | None,
    target_segments: list[str],
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
) -> str:
    """Build the user message for problem validation analysis.

    Adds 1-indexed line numbers to each source to enable precise citations.
    Sources are truncated if they exceed per-source or total character limits to
    avoid exceeding the model's context window.
    """
    parts: list[str] = []

    parts.append("## Assumed Problem to Validate")
    if assumed_problem:
        parts.append(assumed_problem)
    else:
        parts.append(
            f"(No explicit problem statement provided — infer from project objective: {objective})"
        )

    if target_segments:
        parts.append(f"\n## Target Segments: {', '.join(target_segments)}")

    parts.append(f"\n## Project Objective: {objective}")
    parts.append(f"\n## Research Data Sources ({len(data_sources)} total):\n")

    total_chars = 0
    for filename, raw_text in data_sources:
        if total_chars >= _MAX_TOTAL_SOURCE_CHARS:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break

        remaining = _MAX_TOTAL_SOURCE_CHARS - total_chars
        text = raw_text[:_MAX_CHARS_PER_SOURCE]
        if len(raw_text) > _MAX_CHARS_PER_SOURCE:
            text += "\n[... source truncated ...]"
        text = text[:remaining]

        parts.append(f"### Source: {filename}")
        lines = text.split("\n")
        for i, line in enumerate(lines, 1):
            parts.append(f"{i}: {line}")
        parts.append("")  # blank line separator between sources

        total_chars += len(text)

    return "\n".join(parts)


def _extract_json(text: str) -> dict:
    """Extract a JSON object from Claude's response.

    Handles cases where Claude adds preamble or postamble around the JSON.
    """
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    return json.loads(text)  # Let json.loads raise with a clear error


# ── Main analysis function ────────────────────────────────────────────────────


_REQUIRED_RESPONSE_KEYS = {"frequency_score", "consistency_score", "strength_score", "insights"}


async def run_analysis(
    objective: str,
    assumed_problem: str | None,
    target_segments: list[str],
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
) -> dict:
    """Run problem validation analysis using Claude.

    Returns a dict with:
    - confidence_score: float (calculated from component scores)
    - insights: list[dict] — each has type, text, citation, confidence, source_count
    - tokens_used: int
    - cost_usd: float
    - raw_response: str
    """
    prompt = build_problem_validation_prompt(
        objective, assumed_problem, target_segments, data_sources
    )

    message = await _client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        system=PROBLEM_VALIDATION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = message.content[0].text
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens

    parsed = _extract_json(raw_text)

    missing = _REQUIRED_RESPONSE_KEYS - parsed.keys()
    if missing:
        raise ValueError(
            f"Claude response missing required keys: {missing}. "
            f"Response preview: {raw_text[:200]}"
        )

    frequency_score = float(parsed["frequency_score"])
    consistency_score = float(parsed["consistency_score"])
    strength_score = float(parsed["strength_score"])
    confidence_score = calculate_confidence_score(
        frequency_score, consistency_score, strength_score
    )

    return {
        "confidence_score": confidence_score,
        "insights": parsed["insights"],
        "tokens_used": input_tokens + output_tokens,
        "cost_usd": calculate_cost(input_tokens, output_tokens, CLAUDE_MODEL),
        "raw_response": raw_text,
    }
