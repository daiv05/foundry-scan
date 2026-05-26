from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.db import pb
from app.models.schemas import OpportunityResponse, OpportunityUpdate

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


@router.get("/new", response_model=list[OpportunityResponse])
async def get_new_opportunities():
    """Return opportunities with user_status='new'."""
    result = await pb.get_list(
        "opportunities",
        filter='user_status="new"',
        sort="-score",
    )
    return [OpportunityResponse(**r) for r in result.get("items", [])]


@router.get("", response_model=list[OpportunityResponse])
async def list_opportunities(
    page: int = 1,
    per_page: int = 50,
    sort: str = "-score",
    filter: str = Query(default=""),  # noqa: A002
):
    result = await pb.get_list(
        "opportunities",
        page=page,
        per_page=per_page,
        sort=sort,
        filter=filter,
    )
    return [OpportunityResponse(**r) for r in result.get("items", [])]


@router.get("/{opp_id}", response_model=OpportunityResponse)
async def get_opportunity(opp_id: str):
    try:
        record = await pb.get_one("opportunities", opp_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return OpportunityResponse(**record)


@router.patch("/{opp_id}", response_model=OpportunityResponse)
async def update_opportunity(opp_id: str, body: OpportunityUpdate):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=422, detail="Nothing to update")
    try:
        record = await pb.update("opportunities", opp_id, data)
    except Exception:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return OpportunityResponse(**record)
