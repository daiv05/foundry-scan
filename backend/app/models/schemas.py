from __future__ import annotations
from typing import Any
from pydantic import BaseModel


# ── Scans ────────────────────────────────────────────────────────────────────

class ScanCreate(BaseModel):
    config: dict[str, Any] = {}


class ScanResponse(BaseModel):
    id: str
    status: str = "pending"
    config: dict[str, Any] | None = None
    prompt_text: str | None = None
    prompt_tokens_est: int | None = None
    llm_response_raw: str | None = None
    llm_used: str | None = None
    started_at: str | None = None
    processed_at: str | None = None
    submitted_at: str | None = None
    completed_at: str | None = None
    error_message: str | None = None
    created: str = ""
    updated: str = ""


class ScanStatus(BaseModel):
    id: str
    status: str
    error_message: str | None = None


# ── Opportunities ─────────────────────────────────────────────────────────────

class OpportunityResponse(BaseModel):
    id: str
    scan: str
    rank: int | None = None
    score: float | None = None
    name: str | None = None
    problem: str | None = None
    evidence: str | list[Any] | None = None
    scoring: dict[str, Any] | None = None
    target_user: str | None = None
    mvp_features: list[str] | None = None
    monetization: str | None = None
    build_time: str | None = None
    reasoning: str | None = None
    user_status: str = "new"
    notes: str | None = None
    created: str = ""
    updated: str = ""


class OpportunityUpdate(BaseModel):
    user_status: str | None = None
    notes: str | None = None


# ── LLM Response ──────────────────────────────────────────────────────────────

class LLMResponseInput(BaseModel):
    response_text: str
    llm_used: str | None = None


# ── Scan Configs ──────────────────────────────────────────────────────────────

class ScanConfigCreate(BaseModel):
    name: str
    config: dict[str, Any] = {}
    is_default: bool = False


class ScanConfigResponse(BaseModel):
    id: str
    name: str
    config: dict[str, Any] = {}
    is_default: bool = False
    created: str = ""
    updated: str = ""
