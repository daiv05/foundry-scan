"""
F08 - Processor

Transforms raw collected data into clean, clustered, scored input
for the LLM prompt builder (F09).

Pipeline:
  1. Extract     - pull posts/items from raw_data; isolate trends + PH as metadata
  2. Clean       - filter short (<10 words) / spam, normalise text
  3. Deduplicate - cosine similarity threshold (≥ 0.85)
  4. Cluster     - TF-IDF + KMeans, auto k via silhouette score (range 3–15)
  5. Score       - weighted signals per cluster
  6. Summarise   - representative phrases + concise cluster description

Signal weights (spec §5.2):
  pain signal       --> 1x
  demand signal     --> 3x
  high engagement   --> 1.5x
  Ask HN post       --> 2x
"""
from __future__ import annotations

import asyncio
import logging
import re
import unicodedata
from typing import Any

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import cosine_similarity

from app.db import pb

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────

MIN_WORDS         = 10
MIN_CLUSTER_ITEMS = 10     # need at least this many items to attempt clustering
K_MIN, K_MAX      = 3, 15  # silhouette sweep range
DEDUP_THRESHOLD   = 0.85   # cosine similarity above which two items are duplicates
HIGH_ENG_REDDIT   = 100    # score threshold for "high engagement" on Reddit
HIGH_ENG_HN       = 50     # score threshold for "high engagement" on HN

W_PAIN            = 1.0
W_DEMAND          = 3.0
W_HIGH_ENGAGEMENT = 1.5
W_ASK_HN          = 2.0

_URL_RE  = re.compile(r"https?://\S+")
_SPAM_RE = re.compile(
    r"\b(buy\s+now|click\s+here|limited\s+time|promo\s+code|discount\s+code"
    r"|check\s+out\s+my|affiliate\s+link|coupon)\b",
    re.I,
)
_WS_RE = re.compile(r"\s+")


# ─────────────────────────────────────────────────────────────────────────────
# 1. Extraction
# ─────────────────────────────────────────────────────────────────────────────

def _extract_items(raw_records: list[dict]) -> tuple[list[dict], dict[str, Any]]:
    """
    Split raw_data records into:
      items    - normalised Reddit + HN post dicts ready for clustering
      metadata - trends + ProductHunt context (used by PromptBuilder, F09)
    """
    items: list[dict] = []
    metadata: dict[str, Any] = {"trends": {}, "producthunt": {}}

    for rec in raw_records:
        source = rec.get("source", "")
        data   = rec.get("data") or {}

        if source == "reddit":
            posts = data if isinstance(data, list) else []
            for post in posts:
                if not post.get("title"):
                    continue
                items.append({
                    "id":             post.get("url", ""),
                    "source":         "reddit",
                    "title":          post.get("title", ""),
                    "body":           post.get("body", ""),
                    "score":          int(post.get("score") or 0),
                    "pain_signals":   post.get("pain_signals") or [],
                    "demand_signals": post.get("demand_signals") or [],
                    "type":           "reddit_post",
                    "url":            post.get("url", ""),
                    "subreddit":      post.get("subreddit", ""),
                })

        elif source == "hackernews":
            hn_items = data if isinstance(data, list) else []
            for item in hn_items:
                if not item.get("title"):
                    continue
                items.append({
                    "id":             str(item.get("url") or item.get("id", "")),
                    "source":         "hackernews",
                    "title":          item.get("title", ""),
                    "body":           "",
                    "score":          int(item.get("score") or 0),
                    "pain_signals":   item.get("pain_signals") or [],
                    "demand_signals": item.get("demand_signals") or [],
                    "type":           item.get("type", "story"),
                    "url":            item.get("url", ""),
                    "subreddit":      "",
                })

        elif source == "trends":
            metadata["trends"] = data

        elif source == "producthunt":
            metadata["producthunt"] = data

    return items, metadata


# ─────────────────────────────────────────────────────────────────────────────
# 2. Cleaning
# ─────────────────────────────────────────────────────────────────────────────

def _normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    return _WS_RE.sub(" ", text).strip()


def _item_text(item: dict) -> str:
    """Combined title + body, normalised."""
    return _normalise(f"{item['title']} {item['body']}")


def _is_spam(text: str) -> bool:
    words = text.split()
    if not words:
        return True
    urls = _URL_RE.findall(text)
    if len(urls) / max(len(words), 1) > 0.3:
        return True
    return bool(_SPAM_RE.search(text))


def _clean(items: list[dict]) -> tuple[list[dict], int]:
    """Return (kept_items, filtered_count). Adds '_text' to each kept item."""
    kept: list[dict] = []
    filtered = 0
    for item in items:
        text = _item_text(item)
        if len(text.split()) < MIN_WORDS or _is_spam(text):
            filtered += 1
            continue
        item["_text"] = text
        kept.append(item)
    return kept, filtered


# ─────────────────────────────────────────────────────────────────────────────
# 3. Deduplication
# ─────────────────────────────────────────────────────────────────────────────

def _deduplicate(items: list[dict]) -> tuple[list[dict], int]:
    """
    Remove near-duplicate items using cosine similarity on TF-IDF vectors.
    When two items exceed the threshold, the lower-scored one is dropped.
    """
    if len(items) < 2:
        return items, 0

    texts = [it["_text"] for it in items]
    vec   = TfidfVectorizer(max_features=5_000, stop_words="english")
    try:
        matrix = vec.fit_transform(texts)
    except Exception:
        return items, 0

    sim  = cosine_similarity(matrix)
    keep = [True] * len(items)
    removed = 0

    for i in range(len(items)):
        if not keep[i]:
            continue
        for j in range(i + 1, len(items)):
            if keep[j] and sim[i, j] >= DEDUP_THRESHOLD:
                # keep the higher-scored item
                if items[i]["score"] >= items[j]["score"]:
                    keep[j] = False
                else:
                    keep[i] = False
                removed += 1

    return [it for it, k in zip(items, keep) if k], removed


# ─────────────────────────────────────────────────────────────────────────────
# 4. Clustering
# ─────────────────────────────────────────────────────────────────────────────

def _best_k(matrix, k_min: int, k_max: int) -> int:
    """Sweep k in [k_min, k_max] and return the k with the highest silhouette score."""
    n = matrix.shape[0]
    k_max = min(k_max, n - 1)
    k_min = max(k_min, 2)
    if k_max < k_min:
        return k_min

    best_k, best_score = k_min, -1.0
    for k in range(k_min, k_max + 1):
        labels = KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(matrix)
        try:
            score = silhouette_score(matrix, labels, sample_size=min(500, n))
        except Exception:
            continue
        if score > best_score:
            best_score, best_k = score, k

    logger.debug("[processor] silhouette sweep --> best k=%d (score=%.4f)", best_k, best_score)
    return best_k


def _cluster(items: list[dict]) -> tuple[list[dict], dict[int, list[str]]]:
    """
    Assign cluster_id to each item.
    Returns (items, top_terms_map) where top_terms_map[cid] = top-10 TF-IDF terms.
    Falls back to a single cluster (id=0) when there are too few items.
    """
    if len(items) < MIN_CLUSTER_ITEMS:
        for it in items:
            it["cluster_id"] = 0
        return items, {0: []}

    texts  = [it["_text"] for it in items]
    vec    = TfidfVectorizer(max_features=10_000, stop_words="english", sublinear_tf=True)
    matrix = vec.fit_transform(texts)

    k  = _best_k(matrix, K_MIN, K_MAX)
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(matrix)

    feat_names = np.array(vec.get_feature_names_out())
    order      = km.cluster_centers_.argsort()[:, ::-1]
    top_terms  = {
        int(cid): [feat_names[i] for i in order[cid, :10]]
        for cid in range(k)
    }

    for it, lbl in zip(items, labels):
        it["cluster_id"] = int(lbl)

    logger.info("[processor] KMeans k=%d selected", k)
    return items, top_terms


# ─────────────────────────────────────────────────────────────────────────────
# 5 + 6. Scoring + Summarising clusters
# ─────────────────────────────────────────────────────────────────────────────

def _item_weight(item: dict) -> float:
    w  = len(item["pain_signals"])   * W_PAIN
    w += len(item["demand_signals"]) * W_DEMAND
    thresh = HIGH_ENG_REDDIT if item["source"] == "reddit" else HIGH_ENG_HN
    if item["score"] >= thresh:
        w += W_HIGH_ENGAGEMENT
    if item.get("type") == "ask_hn":
        w += W_ASK_HN
    return w


def _representative_phrases(items: list[dict], n: int = 5) -> list[str]:
    """Top-n titles ranked by weighted signal score then raw score."""
    ranked = sorted(items, key=lambda it: (_item_weight(it), it["score"]), reverse=True)
    return [it["title"][:120] for it in ranked[:n]]


def _build_clusters(
    items: list[dict],
    top_terms: dict[int, list[str]],
) -> list[dict[str, Any]]:
    """Group items by cluster_id, compute scores, and write summaries."""
    groups: dict[int, list[dict]] = {}
    for it in items:
        groups.setdefault(it["cluster_id"], []).append(it)

    clusters: list[dict[str, Any]] = []

    for cid, group in sorted(groups.items()):
        pain_count   = sum(len(it["pain_signals"])   for it in group)
        demand_count = sum(len(it["demand_signals"]) for it in group)
        ask_hn_count = sum(1 for it in group if it.get("type") == "ask_hn")
        weighted     = round(sum(_item_weight(it) for it in group), 2)
        terms        = top_terms.get(cid, [])
        label        = ", ".join(terms[:5]) if terms else f"cluster_{cid}"
        phrases      = _representative_phrases(group)
        sources      = sorted({it["source"] for it in group})

        extra = f", Ask HN threads: {ask_hn_count}" if ask_hn_count else ""
        summary = (
            f"Cluster '{label}' - {len(group)} posts from {', '.join(sources)}. "
            f"Pain signals: {pain_count}, demand signals: {demand_count}{extra}. "
            f"Weighted score: {weighted:.1f}. "
            f"Top topics: {'; '.join(phrases[:3])}."
        )

        clusters.append({
            "id":                     cid,
            "label":                  label,
            "top_terms":              terms,
            "item_count":             len(group),
            "sources":                sources,
            "pain_count":             pain_count,
            "demand_count":           demand_count,
            "ask_hn_count":           ask_hn_count,
            "weighted_score":         weighted,
            "representative_phrases": phrases,
            "summary":                summary,
        })

    # Sort best clusters first
    clusters.sort(key=lambda c: c["weighted_score"], reverse=True)
    return clusters


# ─────────────────────────────────────────────────────────────────────────────
# Synchronous pipeline (runs in thread pool)
# ─────────────────────────────────────────────────────────────────────────────

def _run_pipeline_sync(scan_id: str, raw_records: list[dict]) -> dict[str, Any]:
    items, metadata = _extract_items(raw_records)
    logger.info("[processor] Extracted %d items (scan=%s)", len(items), scan_id)

    items, filtered = _clean(items)
    logger.info("[processor] After clean : %d kept, %d filtered (scan=%s)",
                len(items), filtered, scan_id)

    items, dupes = _deduplicate(items)
    logger.info("[processor] After dedup : %d kept, %d removed (scan=%s)",
                len(items), dupes, scan_id)

    items, top_terms = _cluster(items)
    clusters = _build_clusters(items, top_terms)
    logger.info("[processor] Built %d clusters (scan=%s)", len(clusters), scan_id)

    return {
        "clusters": clusters,
        "metadata": {
            "scan_id":         scan_id,
            "total_extracted": len(items) + filtered + dupes,
            "filtered":        filtered,
            "deduplicated":    dupes,
            "items_clustered": len(items),
            "cluster_count":   len(clusters),
            "trends":          metadata.get("trends", {}),
            "producthunt":     metadata.get("producthunt", {}),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Public async interface
# ─────────────────────────────────────────────────────────────────────────────

async def process(scan_id: str) -> dict[str, Any]:
    """
    Fetch raw_data for scan_id, run the full pipeline, and return a processed
    dict with 'clusters' and 'metadata' for use by the PromptBuilder (F09).

    CPU-bound work (TF-IDF + KMeans) is offloaded to a thread pool so the
    event loop stays responsive.
    """
    try:
        resp = await pb.get_list(
            "raw_data",
            filter=f"scan='{scan_id}'",
            per_page=50,
        )
    except Exception as exc:
        logger.error("[processor] Failed to fetch raw_data scan=%s: %s", scan_id, exc)
        raise

    raw_records = resp.get("items", [])
    logger.info("[processor] Fetched %d raw_data records (scan=%s)",
                len(raw_records), scan_id)

    return await asyncio.to_thread(_run_pipeline_sync, scan_id, raw_records)
