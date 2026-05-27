"""
F09 - Prompt Builder

Builds a self-contained prompt from F08 clusters + trends/PH metadata.
The prompt is ready to paste into any external LLM.

Sections:
  1. CONTEXT     - analyst role and task framing
  2. DATA        - clusters, trend signals, competition data
  3. INSTRUCTIONS - scoring criteria, filters, output expectations
  4. RESPONSE FORMAT - strict JSON schema

Output is persisted to scan.prompt_text + scan.prompt_tokens_est.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

from app.db import pb

logger = logging.getLogger(__name__)

TOKENS_WARN_THRESHOLD = 100_000   # warn but don't block
CHARS_PER_TOKEN       = 4         # conservative English estimate


# ─────────────────────────────────────────────────────────────────────────────
# Section builders
# ─────────────────────────────────────────────────────────────────────────────

def _section_context() -> str:
    return """\
=== CONTEXT ===
You are an expert micro-SaaS market analyst.
Your task is to identify VALIDATED business opportunities from real user discussions and market data.
Focus on specific, niche pain points where a small indie dev / small team could build a profitable SaaS product.

Key principles:
- Evidence must come from the data provided below - no hallucinations.
- Prefer underserved niches with clear willingness to pay.
- Avoid oversaturated markets unless there is a clear differentiator in the data.
"""


def _section_clusters(clusters: list[dict], total_items: int, sources: list[str]) -> str:
    today = date.today().isoformat()
    lines: list[str] = [
        "=== COLLECTED DATA ===",
        f"Analysis date : {today}",
        f"Posts analysed: {total_items}",
        f"Sources       : {', '.join(sources)}",
        f"Clusters found: {len(clusters)}",
        "",
    ]

    for i, c in enumerate(clusters, 1):
        src_str = ", ".join(c.get("sources", []))
        lines += [
            f"--- CLUSTER {i} | score {c['weighted_score']:.1f} ---",
            f"Theme      : {c['label']}",
            f"Posts      : {c['item_count']} ({src_str})",
            f"Pain signals   : {c['pain_count']}",
            f"Demand signals : {c['demand_count']}",
        ]
        if c.get("ask_hn_count"):
            lines.append(f"Ask HN threads : {c['ask_hn_count']}")
        lines.append("Top keywords   : " + ", ".join(c.get("top_terms", [])[:8]))
        lines.append("Representative posts:")
        for phrase in c.get("representative_phrases", [])[:5]:
            lines.append(f"  • {phrase}")
        lines.append("")

    return "\n".join(lines)


def _section_trends(trends: dict) -> str:
    if not trends:
        return "=== TREND SIGNALS ===\nNo trend data available.\n"

    lines = ["=== TREND SIGNALS ==="]
    keywords  = trends.get("keywords", [])
    timeframe = trends.get("timeframe", "")
    geo       = trends.get("geo", "worldwide")
    via       = trends.get("collected_via", "")

    lines.append(f"Keywords  : {', '.join(keywords)}")
    lines.append(f"Period    : {timeframe} | Geo: {geo} | Via: {via}")
    lines.append("")

    # Interest over time - show average value per keyword
    iot = trends.get("interest_over_time", {})
    if iot:
        lines.append("Average search interest (0-100):")
        for kw, points in iot.items():
            values = [p["value"] for p in points if isinstance(p.get("value"), (int, float))]
            if values:
                avg = sum(values) / len(values)
                peak = max(values)
                lines.append(f"  {kw:<25} avg={avg:.0f}  peak={peak}")
        lines.append("")

    # Rising queries (top 3 per keyword)
    rq = trends.get("related_queries", {})
    if rq:
        lines.append("Rising queries:")
        for kw, data in rq.items():
            rising = data.get("rising", [])[:3]
            if rising:
                queries = [r.get("query", "") for r in rising if r.get("query")]
                lines.append(f"  {kw}: {', '.join(queries)}")
        lines.append("")

    # Trending topics (playwright fallback)
    topics = trends.get("trending_topics", [])
    if topics:
        lines.append("Trending topics (this week):")
        for t in topics[:10]:
            title   = t.get("title", "")
            traffic = t.get("traffic", "")
            lines.append(f"  • {title}" + (f"  [{traffic}]" if traffic else ""))
        lines.append("")

    return "\n".join(lines)


def _section_competition(ph: dict) -> str:
    if not ph:
        return "=== COMPETITION DATA ===\nNo Product Hunt data available.\n"

    niches = ph.get("niches", {})
    if not niches:
        return "=== COMPETITION DATA ===\nNo Product Hunt niche data collected.\n"

    lines = ["=== COMPETITION DATA (Product Hunt) ==="]
    for kw, n in niches.items():
        total = n.get("total_found", 0)
        sat   = n.get("saturation_score", 0.0)
        avg_v = n.get("avg_votes", 0.0)
        r6m   = n.get("recent_6m", 0)
        if total == 0:
            lines.append(f"  {kw:<20} - no data (topic slug may not match PH taxonomy)")
            continue
        lines.append(
            f"  {kw:<20} total={total:>6}  recent_6m={r6m:>4}  "
            f"avg_votes={avg_v:>7.1f}  saturation={sat:.1f}/10"
        )
        tops = n.get("top_products", [])[:3]
        for p in tops:
            lines.append(f"    ↳ {p['name'][:40]:<40} {p['votes']:>5} votes")
    lines.append("")

    return "\n".join(lines)


def _section_instructions() -> str:
    return """\
=== INSTRUCTIONS ===
Analyse ALL clusters above and identify the top micro-SaaS opportunities.

For each opportunity:
1. Name         - concise product name
2. Problem      - the specific pain point (one sentence)
3. Evidence     - quantified evidence from the data (signal counts, post counts, quotes)
4. Scoring      - rate 1–10 on each criterion:
     pain_intensity   (weight 30 %) - how acute and frequent is the pain?
     trend_momentum   (weight 20 %) - is search interest / discussion growing?
     competition_gap  (weight 25 %) - how underserved is the niche? (low saturation = high score)
     mvp_feasibility  (weight 25 %) - can a solo dev ship in < 6 months?
5. Score        - weighted total: pain*0.30 + trend*0.20 + competition*0.25 + mvp*0.25
6. Target user  - who exactly has this problem?
7. MVP features - 3–5 core features for a shippable v1
8. Monetization - pricing model and realistic price point
9. Build time   - estimated time to a sellable MVP (e.g. "6–10 weeks")
10. Reasoning   - 2–3 sentences explaining WHY this is a good opportunity

MANDATORY FILTERS - discard any idea that matches:
  ✗ Generic AI chatbot / general-purpose AI assistant
  ✗ AI wrapper with no proprietary workflow or data moat
  ✗ AI note-taking app (extremely saturated)
  ✗ AI coding assistant / Copilot clone
  ✗ "Uber for X" / marketplace idea with no evidence of supply-side willingness
  ✗ Any idea not supported by at least 2 signals from the data

Return between 3 and 8 opportunities, sorted by score descending.
"""


_RESPONSE_SCHEMA = """\
=== RESPONSE FORMAT ===
Return ONLY valid JSON - no markdown, no prose, no code fences.
Use exactly this schema:

{
  "opportunities": [
    {
      "rank": 1,
      "score": 7.8,
      "name": "string",
      "problem": "string",
      "evidence": "string (include numbers)",
      "scoring": {
        "pain_intensity": 8,
        "trend_momentum": 7,
        "competition_gap": 6,
        "mvp_feasibility": 9
      },
      "target_user": "string",
      "mvp_features": ["string", "string", "string"],
      "monetization": "string",
      "build_time": "string",
      "reasoning": "string"
    }
  ]
}
"""


# ─────────────────────────────────────────────────────────────────────────────
# Token estimation
# ─────────────────────────────────────────────────────────────────────────────

def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def _model_recommendation(tokens: int) -> str:
    if tokens < 8_000:
        return "Any modern LLM"
    if tokens < 32_000:
        return "Claude Sonnet/Opus, GPT-4, Gemini Pro"
    if tokens <= 100_000:
        return "Claude (any), Gemini 1.5+"
    return "Claude (any), Gemini 1.5+ - WARNING: prompt exceeds 100K tokens"


# ─────────────────────────────────────────────────────────────────────────────
# Public async interface
# ─────────────────────────────────────────────────────────────────────────────

async def build_prompt(scan_id: str, processed: dict[str, Any]) -> tuple[str, int]:
    """
    Build the full LLM prompt from processed F08 data.

    Args:
        scan_id:   scan record id (used to persist prompt_text + prompt_tokens_est)
        processed: dict returned by processor.process() - has 'clusters' and 'metadata'

    Returns:
        (prompt_text, token_estimate)
    """
    clusters  = processed.get("clusters", [])
    meta      = processed.get("metadata", {})
    trends    = meta.get("trends", {})
    ph        = meta.get("producthunt", {})

    total_items = meta.get("items_clustered", 0)
    sources: list[str] = []
    for c in clusters:
        sources.extend(c.get("sources", []))
    sources = sorted(set(sources)) or ["reddit", "hackernews"]

    sections = [
        _section_context(),
        _section_clusters(clusters, total_items, sources),
        _section_trends(trends),
        _section_competition(ph),
        _section_instructions(),
        _RESPONSE_SCHEMA,
    ]
    prompt = "\n".join(sections)

    tokens = _estimate_tokens(prompt)
    model  = _model_recommendation(tokens)

    if tokens > TOKENS_WARN_THRESHOLD:
        logger.warning(
            "[prompt_builder] Prompt exceeds 100K tokens (%d) for scan=%s - "
            "consider compressed mode.", tokens, scan_id,
        )
    else:
        logger.info(
            "[prompt_builder] Prompt built: %d chars, ~%d tokens, recommended: %s (scan=%s)",
            len(prompt), tokens, model, scan_id,
        )

    await pb.update("scans", scan_id, {
        "prompt_text":       prompt,
        "prompt_tokens_est": tokens,
    })

    return prompt, tokens
