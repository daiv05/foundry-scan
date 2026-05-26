from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response

from app.db import pb
from app.models.schemas import ScanConfigCreate, ScanConfigResponse

router = APIRouter(prefix="/api/configs", tags=["configs"])


@router.post("", response_model=ScanConfigResponse, status_code=201)
async def create_config(body: ScanConfigCreate):
    record = await pb.create("scan_configs", body.model_dump())
    return ScanConfigResponse(**record)


@router.get("", response_model=list[ScanConfigResponse])
async def list_configs():
    result = await pb.get_list("scan_configs", sort="-id")
    return [ScanConfigResponse(**r) for r in result.get("items", [])]


@router.put("/{config_id}", response_model=ScanConfigResponse)
async def update_config(config_id: str, body: ScanConfigCreate):
    try:
        record = await pb.update("scan_configs", config_id, body.model_dump())
    except Exception:
        raise HTTPException(status_code=404, detail="Config not found")
    return ScanConfigResponse(**record)


@router.delete("/{config_id}", status_code=204)
async def delete_config(config_id: str):
    try:
        await pb.delete("scan_configs", config_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Config not found")
    return Response(status_code=204)
