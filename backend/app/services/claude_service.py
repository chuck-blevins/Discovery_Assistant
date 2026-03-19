"""Claude AI integration service — analysis execution and problem validation logic.

Stories 4.1 (SSE streaming infrastructure) and 4.2 (problem validation logic)
are both implemented here since they share the same Claude call pipeline.

LangSmith: set LANGSMITH_TRACING=true and LANGSMITH_API_KEY in .env to send traces.
When enabled, full prompt and response content is sent to LangSmith; in
compliance-sensitive environments, disable tracing or use LangSmith access controls.
See https://docs.langchain.com/langsmith/annotate-code
"""

import json
import os

import anthropic
import httpx

try:
    from langsmith import traceable
except ImportError:
    def traceable(func=None, **kwargs):
        """No-op when langsmith is not installed; app runs without tracing."""
        if func is None:
            return lambda f: f
        return func

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

# Timeout for Claude API calls (seconds). Long prompts can take 60+ s; avoid indefinite hangs.
_CLAUDE_TIMEOUT = float(os.getenv("CLAUDE_REQUEST_TIMEOUT", "180"))

def _get_effective_api_key(override: str | None = None) -> str | None:
    """Return DB-provided key if given, otherwise fall back to env vars."""
    return override or os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")


def _make_client(api_key: str | None = None, timeout: float | None = None) -> anthropic.AsyncAnthropic:
    """Create a fresh Anthropic client per call so DB-stored keys take effect immediately."""
    return anthropic.AsyncAnthropic(
        api_key=_get_effective_api_key(api_key),
        http_client=httpx.AsyncClient(timeout=timeout or _CLAUDE_TIMEOUT),
    )

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


# ── Positioning Discovery system prompt (Story 5-1) ───────────────────────────

POSITIONING_SYSTEM_PROMPT = """You are an expert discovery analyst. Your task is to analyze research data to surface positioning insights for a startup.

Analyze all provided data sources and return ONLY a valid JSON object (no prose before or after) with this exact structure:

{
  "value_drivers": [
    {"text": "<1-2 sentence description of a value driver>", "frequency_count": <int>}
  ],
  "alternative_angles": ["<angle 1>", "<angle 2>", "<angle 3>"],
  "recommended_interviews": ["<persona or role 1>", "<persona or role 2>", ...],
  "confidence_score": <float 0.0-1.0>
}

Definitions:
- value_drivers: themes or benefits that the data suggests customers care about; frequency_count = how many sources or mentions support this driver
- alternative_angles: 2-3 distinct positioning angles the startup could test (different framings of value or audience)
- recommended_interviews: types of people or roles to interview next to validate or refine positioning
- confidence_score: how well the data supports these positioning conclusions (0.0 = very thin, 1.0 = strong evidence)

Rules:
- Return 2-5 value_drivers, 2-3 alternative_angles, and at least 1 recommended_interview
- Be calibrated: avoid overconfidence when data is limited
"""


# ── Persona Origination system prompt (Story 5-2) ───────────────────────────────

PERSONA_SYSTEM_PROMPT = """You are an expert discovery analyst. Your task is to extract a buyer persona from research data.

Analyze all provided data sources and return ONLY a valid JSON object (no prose before or after) with this exact structure:

{
  "name_title": "<string or null>",
  "goals": "<string or null>",
  "pain_points": "<string or null>",
  "decision_drivers": "<string or null>",
  "false_beliefs": "<string or null>",
  "job_to_be_done": "<string or null>",
  "usage_patterns": "<string or null>",
  "objections": "<string or null>",
  "success_metrics": "<string or null>",
  "confidence_score": <float 0.0-1.0>,
  "field_quality": {
    "name_title": "low" | "medium" | "high",
    "goals": "low" | "medium" | "high",
    ...
  }
}

Definitions:
- Each of the 9 fields: 1-3 sentence summary drawn from the data, or null if no evidence.
- confidence_score: overall confidence in the persona (0.0 = very thin, 1.0 = strong evidence).
- field_quality: for each field, "low" (weak or inferred), "medium" (some direct evidence), "high" (explicit and well-supported). Only include keys for fields that have a non-null value.

Field meanings:
- name_title: Role or title of the persona
- goals: What they are trying to achieve
- pain_points: Frustrations and problems they face
- decision_drivers: What influences their decisions
- false_beliefs: Misconceptions they may hold
- job_to_be_done: The job they hire a product for
- usage_patterns: How they would use the product
- objections: Likely objections to the product
- success_metrics: How they measure success

Rules:
- Use only evidence from the provided sources. Prefer null over speculation.
- field_quality keys must match field names exactly (snake_case).
"""


# ── ICP Refinement system prompt (Story 5-3) ──────────────────────────────────

ICP_SYSTEM_PROMPT = """You are an expert discovery analyst. Your task is to extract an Ideal Customer Profile (ICP) from research data.

Analyze all provided data sources and return ONLY a valid JSON object (no prose before or after) with this exact structure:

{
  "company_size": "<string or null>",
  "industries": "<string or null>",
  "geography": "<string or null>",
  "revenue": "<string or null>",
  "tech_stack": "<string or null>",
  "use_case_fit": "<string or null>",
  "buying_process": "<string or null>",
  "budget": "<string or null>",
  "maturity": "<string or null>",
  "custom": "<string or null>",
  "dimension_confidence": {
    "company_size": "low" | "medium" | "high",
    "industries": "low" | "medium" | "high",
    ...
  }
}

Definitions:
- Each dimension: 1-2 sentence summary of what the data suggests for that ICP dimension, or null if no evidence.
- dimension_confidence: for each dimension with a non-null value, rate evidence strength: "low" (inferred/weak), "medium" (some direct evidence), "high" (explicit and well-supported). Only include keys for dimensions that have a value.

Dimension meanings:
- company_size: Employee count or company size range
- industries: Target industries or verticals
- geography: Regions or markets
- revenue: Revenue range or scale
- tech_stack: Technology context
- use_case_fit: How well the use case fits
- buying_process: How they buy / decision process
- budget: Budget range or constraints
- maturity: Market or organizational maturity
- custom: Any other defining characteristic

Rules:
- Use only evidence from the provided sources. Prefer null over speculation.
- dimension_confidence keys must match dimension names exactly (snake_case).
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
_TRUNCATION_MARKER = "\n[... source truncated ...]"


@traceable(run_type="llm", name="invokeClaude")
async def _invoke_claude(
    system: str,
    user_content: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    api_key: str | None = None,
    timeout: float | None = None,
):
    """Single Claude API call. Traced as LLM run in LangSmith when LANGSMITH_TRACING=true."""
    client = _make_client(api_key=api_key, timeout=timeout)
    message = await client.messages.create(
        model=model or CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    return message


@traceable(name="formatPromptProblemValidation")
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
        # Reserve space for truncation marker so it is never sliced away by the budget cut
        content_budget = min(remaining - len(_TRUNCATION_MARKER), _MAX_CHARS_PER_SOURCE)
        if content_budget <= 0:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        text = raw_text[:content_budget]
        if len(raw_text) > content_budget:
            text += _TRUNCATION_MARKER

        parts.append(f"### Source: {filename}")
        lines = text.split("\n")
        for i, line in enumerate(lines, 1):
            parts.append(f"{i}: {line}")
        parts.append("")  # blank line separator between sources

        total_chars += len(text)

    return "\n".join(parts)


@traceable(name="formatPromptPositioning")
def build_positioning_prompt(
    objective: str,
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
) -> str:
    """Build the user message for positioning discovery analysis.

    Same line-numbering and truncation behavior as build_problem_validation_prompt.
    """
    parts: list[str] = []
    parts.append("## Project Objective")
    parts.append(objective)
    parts.append(f"\n## Research Data Sources ({len(data_sources)} total):\n")

    total_chars = 0
    for filename, raw_text in data_sources:
        if total_chars >= _MAX_TOTAL_SOURCE_CHARS:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        remaining = _MAX_TOTAL_SOURCE_CHARS - total_chars
        content_budget = min(remaining - len(_TRUNCATION_MARKER), _MAX_CHARS_PER_SOURCE)
        if content_budget <= 0:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        text = raw_text[:content_budget]
        if len(raw_text) > content_budget:
            text += _TRUNCATION_MARKER
        parts.append(f"### Source: {filename}")
        for i, line in enumerate(text.split("\n"), 1):
            parts.append(f"{i}: {line}")
        parts.append("")
        total_chars += len(text)

    return "\n".join(parts)


@traceable(name="formatPromptPersona")
def build_persona_prompt(
    objective: str,
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
) -> str:
    """Build the user message for persona origination analysis."""
    parts: list[str] = []
    parts.append("## Project Objective")
    parts.append(objective)
    parts.append(f"\n## Research Data Sources ({len(data_sources)} total):\n")

    total_chars = 0
    for filename, raw_text in data_sources:
        if total_chars >= _MAX_TOTAL_SOURCE_CHARS:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        remaining = _MAX_TOTAL_SOURCE_CHARS - total_chars
        content_budget = min(remaining - len(_TRUNCATION_MARKER), _MAX_CHARS_PER_SOURCE)
        if content_budget <= 0:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        text = raw_text[:content_budget]
        if len(raw_text) > content_budget:
            text += _TRUNCATION_MARKER
        parts.append(f"### Source: {filename}")
        for i, line in enumerate(text.split("\n"), 1):
            parts.append(f"{i}: {line}")
        parts.append("")
        total_chars += len(text)

    return "\n".join(parts)


@traceable(name="formatPromptIcp")
def build_icp_prompt(
    objective: str,
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
) -> str:
    """Build the user message for ICP refinement analysis."""
    parts: list[str] = []
    parts.append("## Project Objective")
    parts.append(objective)
    parts.append(f"\n## Research Data Sources ({len(data_sources)} total):\n")

    total_chars = 0
    for filename, raw_text in data_sources:
        if total_chars >= _MAX_TOTAL_SOURCE_CHARS:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        remaining = _MAX_TOTAL_SOURCE_CHARS - total_chars
        content_budget = min(remaining - len(_TRUNCATION_MARKER), _MAX_CHARS_PER_SOURCE)
        if content_budget <= 0:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        text = raw_text[:content_budget]
        if len(raw_text) > content_budget:
            text += _TRUNCATION_MARKER
        parts.append(f"### Source: {filename}")
        for i, line in enumerate(text.split("\n"), 1):
            parts.append(f"{i}: {line}")
        parts.append("")
        total_chars += len(text)

    return "\n".join(parts)


@traceable(name="parseOutput")
def _extract_json(text: str) -> dict:
    """Extract a JSON object from Claude's response.

    Handles preamble/postamble by finding the first '{' and its matching '}'
    via brace counting, so postamble text containing '}' does not break extraction.
    """
    text = text.strip()
    start = text.find("{")
    if start < 0:
        return json.loads(text)
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    return json.loads(text)


# ── Main analysis function ────────────────────────────────────────────────────


_REQUIRED_RESPONSE_KEYS = {"frequency_score", "consistency_score", "strength_score", "insights"}


@traceable(name="runAnalysis")
async def run_analysis(
    objective: str,
    assumed_problem: str | None,
    target_segments: list[str],
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    timeout: float | None = None,
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

    message = await _invoke_claude(
        system=system_prompt or PROBLEM_VALIDATION_SYSTEM_PROMPT,
        user_content=prompt,
        model=model,
        api_key=api_key,
        timeout=timeout,
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


# ── Positioning analysis (Story 5-1) ──────────────────────────────────────────

_POSITIONING_REQUIRED_KEYS = {
    "value_drivers",
    "alternative_angles",
    "recommended_interviews",
    "confidence_score",
}


@traceable(name="runPositioningAnalysis")
async def run_positioning_analysis(
    objective: str,
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    timeout: float | None = None,
) -> dict:
    """Run positioning discovery analysis using Claude.

    Returns a dict with:
    - positioning_result: dict with value_drivers, alternative_angles,
      recommended_interviews, confidence_score (suitable for JSONB storage)
    - tokens_used: int
    - cost_usd: float
    - raw_response: str
    """
    prompt = build_positioning_prompt(objective, data_sources)

    message = await _invoke_claude(
        ssystem=system_prompt or POSITIONING_SYSTEM_PROMPT,
        user_content=prompt,
        model=model,
        api_key=api_key,
        timeout=timeout,
    )

    raw_text = message.content[0].text
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens

    parsed = _extract_json(raw_text)
    missing = _POSITIONING_REQUIRED_KEYS - parsed.keys()
    if missing:
        raise ValueError(
            f"Claude positioning response missing required keys: {missing}. "
            f"Response preview: {raw_text[:200]}"
        )

    # Normalize value_drivers: ensure list of {text, frequency_count}
    value_drivers = []
    for v in parsed.get("value_drivers") or []:
        if isinstance(v, dict):
            value_drivers.append({
                "text": str(v.get("text", "")).strip() or "(no text)",
                "frequency_count": int(v.get("frequency_count", 0)),
            })
        else:
            value_drivers.append({"text": str(v), "frequency_count": 0})

    confidence = parsed.get("confidence_score")
    if confidence is not None:
        c = float(confidence)
        confidence = round(min(0.95, max(0.0, c)), 4)

    positioning_result = {
        "value_drivers": value_drivers,
        "alternative_angles": [str(a).strip() for a in (parsed.get("alternative_angles") or [])],
        "recommended_interviews": [
            str(r).strip() for r in (parsed.get("recommended_interviews") or [])
        ],
        "confidence_score": confidence,
    }

    return {
        "positioning_result": positioning_result,
        "tokens_used": input_tokens + output_tokens,
        "cost_usd": calculate_cost(input_tokens, output_tokens, CLAUDE_MODEL),
        "raw_response": raw_text,
    }


# ── Persona analysis (Story 5-2) ─────────────────────────────────────────────

_PERSONA_FIELD_NAMES = [
    "name_title", "goals", "pain_points", "decision_drivers", "false_beliefs",
    "job_to_be_done", "usage_patterns", "objections", "success_metrics",
]
_PERSONA_REQUIRED_KEYS = {"confidence_score", "field_quality"} | set(_PERSONA_FIELD_NAMES)
_QUALITY_VALUES = {"low", "medium", "high"}


@traceable(name="runPersonaAnalysis")
async def run_persona_analysis(
    objective: str,
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    timeout: float | None = None,
) -> dict:
    """Run persona origination analysis using Claude.

    Returns a dict with:
    - persona_data: dict with 9 text fields (str | None), confidence_score (float), field_quality (dict)
    - tokens_used: int
    - cost_usd: float
    - raw_response: str
    """
    prompt = build_persona_prompt(objective, data_sources)

    message = await _invoke_claude(
        system=system_prompt or PERSONA_SYSTEM_PROMPT,
        user_content=prompt,
        model=model,
        api_key=api_key,
        timeout=timeout,
    )

    raw_text = message.content[0].text
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens

    parsed = _extract_json(raw_text)
    missing = _PERSONA_REQUIRED_KEYS - parsed.keys()
    if missing:
        raise ValueError(
            f"Claude persona response missing required keys: {missing}. "
            f"Response preview: {raw_text[:200]}"
        )

    def _text(v: object) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s if s else None

    persona_fields = {f: _text(parsed.get(f)) for f in _PERSONA_FIELD_NAMES}

    confidence = parsed.get("confidence_score")
    if confidence is not None:
        confidence = round(min(0.95, max(0.0, float(confidence))), 4)
    else:
        confidence = 0.0

    fq = parsed.get("field_quality") or {}
    if not isinstance(fq, dict):
        fq = {}
    field_quality = {}
    for k, v in fq.items():
        if k in _PERSONA_FIELD_NAMES and v in _QUALITY_VALUES:
            field_quality[k] = v

    return {
        "persona_data": {
            **persona_fields,
            "confidence_score": confidence,
            "field_quality": field_quality,
        },
        "tokens_used": input_tokens + output_tokens,
        "cost_usd": calculate_cost(input_tokens, output_tokens, CLAUDE_MODEL),
        "raw_response": raw_text,
    }


# ── ICP analysis (Story 5-3) ──────────────────────────────────────────────────

_ICP_DIMENSION_NAMES = [
    "company_size", "industries", "geography", "revenue", "tech_stack",
    "use_case_fit", "buying_process", "budget", "maturity", "custom",
]
_ICP_REQUIRED_KEYS = {"dimension_confidence"} | set(_ICP_DIMENSION_NAMES)
_ICP_QUALITY_SCORE = {"low": 0.33, "medium": 0.66, "high": 1.0}


@traceable(name="runIcpAnalysis")
async def run_icp_analysis(
    objective: str,
    data_sources: list[tuple[str, str]],  # [(filename, raw_text), ...]
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    timeout: float | None = None,
) -> dict:
    """Run ICP refinement analysis using Claude.

    Returns a dict with:
    - icp_data: dict with 10 dimension text fields, confidence_score (computed), dimension_confidence
    - tokens_used: int
    - cost_usd: float
    - raw_response: str
    """
    prompt = build_icp_prompt(objective, data_sources)

    message = await _invoke_claude(
       system=system_prompt or ICP_SYSTEM_PROMPT,
        user_content=prompt,
        model=model,
        api_key=api_key,
        timeout=timeout,
    )

    raw_text = message.content[0].text
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens

    parsed = _extract_json(raw_text)
    missing = _ICP_REQUIRED_KEYS - parsed.keys()
    if missing:
        raise ValueError(
            f"Claude ICP response missing required keys: {missing}. "
            f"Response preview: {raw_text[:200]}"
        )

    def _text(v: object) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s if s else None

    dimension_fields = {f: _text(parsed.get(f)) for f in _ICP_DIMENSION_NAMES}

    dc = parsed.get("dimension_confidence") or {}
    if not isinstance(dc, dict):
        dc = {}
    dimension_confidence = {
        k: v for k, v in dc.items()
        if k in _ICP_DIMENSION_NAMES and v in _ICP_QUALITY_SCORE
    }

    # Overall confidence = average of dimension scores, capped 0.95
    if dimension_confidence:
        scores = [_ICP_QUALITY_SCORE[v] for v in dimension_confidence.values()]
        confidence = round(min(0.95, sum(scores) / len(scores)), 4)
    else:
        confidence = 0.0

    return {
        "icp_data": {
            **dimension_fields,
            "confidence_score": confidence,
            "dimension_confidence": dimension_confidence,
        },
        "tokens_used": input_tokens + output_tokens,
        "cost_usd": calculate_cost(input_tokens, output_tokens, CLAUDE_MODEL),
        "raw_response": raw_text,
    }


# ── Onboarding analysis ───────────────────────────────────────────────────────

ONBOARDING_SYSTEM_PROMPT = """You are an expert engagement consultant reviewing notes and interviews to help a consultant understand a client's needs, priorities, and blind spots before shaping a work engagement.

Analyze all provided notes and interview transcripts and return ONLY a valid JSON object (no prose before or after) with this exact structure:

{
  "themes": [
    {"text": "<1-2 sentence description of a recurring pattern or theme>", "frequency": <int>}
  ],
  "interest_points": ["<specific topic or priority the client seems most focused on>", ...],
  "gaps": ["<blind spot, unaddressed area, or concern the client hasn't mentioned>", ...],
  "summary": "<2-3 paragraph narrative summarizing the client's overall situation, what they care about, and what the engagement should focus on>",
  "confidence_score": <float 0.0-1.0>
}

Definitions:
- themes: Patterns that appear repeatedly across notes/interviews. frequency = how many sources or mentions support this theme. Return 2-6 themes.
- interest_points: Specific topics, goals, or priorities the client explicitly expressed enthusiasm or focus on. Return 2-6 items.
- gaps: Areas the client hasn't addressed, seems unaware of, or where there's a notable absence of information that a consultant should probe. These are things the consultant may not see without an outside view. Return 2-5 gaps.
- summary: A coherent narrative the consultant can use to orient themselves before the engagement. Cover: what the client wants, what's driving their situation, and what the consultant should pay attention to.
- confidence_score: How complete and clear the picture is based on the available data (0.0 = very thin data, 1.0 = rich and detailed).

Rules:
- Only use evidence from the provided sources. Prefer concrete observations over speculation.
- Gaps should be genuinely insightful — things that are conspicuously missing or underexplored.
- Write the summary as if briefing a colleague before their first call with the client.
"""

_ONBOARDING_REQUIRED_KEYS = {"themes", "interest_points", "gaps", "summary", "confidence_score"}


@traceable(name="runOnboardingAnalysis")
async def run_onboarding_analysis(
    objective: str,
    data_sources: list[tuple[str, str]],
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    timeout: float | None = None,
) -> dict:
    """Run onboarding analysis — surfaces themes, interest points, gaps, and a summary.

    Returns a dict with:
    - onboarding_data: dict with themes, interest_points, gaps, summary, confidence_score
    - tokens_used: int
    - cost_usd: float
    - raw_response: str
    """
    parts: list[str] = []
    parts.append("## Engagement Context")
    parts.append(f"Project objective: {objective}")
    parts.append(f"\n## Notes and Interviews ({len(data_sources)} total):\n")

    total_chars = 0
    for filename, raw_text in data_sources:
        if total_chars >= _MAX_TOTAL_SOURCE_CHARS:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        remaining = _MAX_TOTAL_SOURCE_CHARS - total_chars
        content_budget = min(remaining - len(_TRUNCATION_MARKER), _MAX_CHARS_PER_SOURCE)
        if content_budget <= 0:
            parts.append("[Additional sources omitted — total source content limit reached]")
            break
        text = raw_text[:content_budget]
        if len(raw_text) > content_budget:
            text += _TRUNCATION_MARKER
        parts.append(f"### Source: {filename}")
        for i, line in enumerate(text.split("\n"), 1):
            parts.append(f"{i}: {line}")
        parts.append("")
        total_chars += len(text)

    prompt = "\n".join(parts)

    message = await _invoke_claude(
        system=system_prompt or ONBOARDING_SYSTEM_PROMPT,
        user_content=prompt,
        model=model,
        api_key=api_key,
        timeout=timeout,
    )

    raw_text = message.content[0].text
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens

    parsed = _extract_json(raw_text)
    missing = _ONBOARDING_REQUIRED_KEYS - parsed.keys()
    if missing:
        raise ValueError(
            f"Claude onboarding response missing required keys: {missing}. "
            f"Response preview: {raw_text[:200]}"
        )

    # Normalize themes
    themes = []
    for t in (parsed.get("themes") or []):
        if isinstance(t, dict):
            themes.append({
                "text": str(t.get("text", "")).strip() or "(no text)",
                "frequency": int(t.get("frequency", 1)),
            })
        else:
            themes.append({"text": str(t).strip(), "frequency": 1})

    confidence = parsed.get("confidence_score")
    if confidence is not None:
        confidence = round(min(0.95, max(0.0, float(confidence))), 4)
    else:
        confidence = 0.0

    return {
        "onboarding_data": {
            "themes": themes,
            "interest_points": [str(p).strip() for p in (parsed.get("interest_points") or [])],
            "gaps": [str(g).strip() for g in (parsed.get("gaps") or [])],
            "summary": str(parsed.get("summary") or "").strip(),
            "confidence_score": confidence,
        },
        "tokens_used": input_tokens + output_tokens,
        "cost_usd": calculate_cost(input_tokens, output_tokens, CLAUDE_MODEL),
        "raw_response": raw_text,
    }


# ── Next-step recommendations (Story 6-1) ──────────────────────────────────────

RECOMMENDATIONS_SYSTEM_PROMPT = """You are an expert discovery consultant. After an analysis run, you produce actionable next-step recommendations and downloadable artifacts.

Given the project objective, current confidence score, and number of data sources, return ONLY a valid JSON object (no prose before or after) with this exact structure:

{
  "action_items": ["<prescriptive action 1>", "<action 2>", "<action 3>"],
  "interview_script_md": "<full markdown string for an interview script pre-filled for this objective. Include sections: Intro, Key questions, Follow-ups. 1-2 pages of content. Use \\n for newlines.>",
  "survey_template_md": "<full markdown string for a survey template with suggested questions. Include sections: Screening, Main questions, Demographics. Use \\n for newlines.>",
  "can_create_next_project": <true or false>,
  "suggested_next_objective": "<next objective string or null>"
}

Rules:
- action_items: 3-5 concrete next steps (what to investigate, who to interview, what to ask). Be specific to the objective.
- interview_script_md and survey_template_md: complete markdown documents as single strings; escape newlines as \\n within the JSON string.
- can_create_next_project: true if confidence is high enough (e.g. >= 0.6) that starting a follow-up project (e.g. different objective) is reasonable.
- suggested_next_objective: one of "problem-validation", "positioning", "persona-buildout", "icp-refinement", or null if no clear next step.
- Tailor content to the objective (e.g. for "positioning" suggest interviews to validate value drivers; for "persona-buildout" suggest survey questions about goals and pain points).
"""

_RECOMMENDATIONS_REQUIRED_KEYS = {
    "action_items",
    "interview_script_md",
    "survey_template_md",
    "can_create_next_project",
    "suggested_next_objective",
}


@traceable(name="formatPromptRecommendations")
def build_recommendations_prompt(
    project_name: str,
    objective: str,
    confidence_score: float,
    source_count: int,
) -> str:
    """Build user prompt for recommendations generation."""
    return f"""Project name: {project_name}
Objective: {objective}
Current confidence score (0-1): {confidence_score:.2f}
Number of data sources analyzed: {source_count}

Generate next-step recommendations and the two markdown artifacts (interview script, survey template) as specified in the system prompt. Return only the JSON object."""


@traceable(name="runRecommendationsGeneration")
async def run_recommendations_generation(
    project_name: str,
    objective: str,
    confidence_score: float,
    source_count: int,
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    timeout: float | None = None,
) -> dict:
    """Generate next-step recommendations and script/template content (Story 6-1).

    Returns a dict suitable for analyses.recommendations JSONB:
    - action_items: list[str]
    - interview_script_md: str | None
    - survey_template_md: str | None
    - can_create_next_project: bool
    - suggested_next_objective: str | None
    """
    prompt = build_recommendations_prompt(
        project_name=project_name,
        objective=objective,
        confidence_score=confidence_score,
        source_count=source_count,
    )

    message = await _invoke_claude(
        system=system_prompt or RECOMMENDATIONS_SYSTEM_PROMPT,
        user_content=prompt,
        model=model,
        api_key=api_key,
        timeout=timeout,
    )

    raw_text = message.content[0].text
    parsed = _extract_json(raw_text)

    missing = _RECOMMENDATIONS_REQUIRED_KEYS - parsed.keys()
    if missing:
        raise ValueError(
            f"Claude recommendations response missing required keys: {missing}. "
            f"Response preview: {raw_text[:200]}"
        )

    action_items = list(parsed.get("action_items") or [])
    if not isinstance(action_items, list):
        action_items = [str(action_items)]
    action_items = [str(a).strip() for a in action_items if str(a).strip()]

    suggested = parsed.get("suggested_next_objective")
    if suggested is not None:
        suggested = str(suggested).strip() or None
    valid_objectives = {"problem-validation", "positioning", "persona-buildout", "icp-refinement"}
    if suggested and suggested not in valid_objectives:
        suggested = None

    return {
        "action_items": action_items,
        "interview_script_md": (parsed.get("interview_script_md") or "").strip() or None,
        "survey_template_md": (parsed.get("survey_template_md") or "").strip() or None,
        "can_create_next_project": bool(parsed.get("can_create_next_project", False)),
        "suggested_next_objective": suggested,
    }
