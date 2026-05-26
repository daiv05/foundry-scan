"""
Async PocketBase client.

Authenticates as superuser on startup and exposes CRUD helpers used by routers.
Compatible with PocketBase v0.22+ (superusers endpoint, Bearer token auth).
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class PocketBaseClient:
    def __init__(self) -> None:
        self.base_url = settings.pocketbase_url.rstrip("/")
        self._token: str | None = None
        self._http: httpx.AsyncClient | None = None

    # ── Lifecycle ────────────────────────────────────────────────────────────

    async def connect(self) -> None:
        self._http = httpx.AsyncClient(base_url=self.base_url, timeout=10.0)
        await self._authenticate()
        logger.info("PocketBase client connected and authenticated.")

    async def disconnect(self) -> None:
        if self._http:
            await self._http.aclose()
            self._http = None
        logger.info("PocketBase client disconnected.")

    # ── Auth ─────────────────────────────────────────────────────────────────

    async def _authenticate(self) -> None:
        """Obtain a superuser token (PocketBase v0.22+)."""
        resp = await self._http.post(
            "/api/collections/_superusers/auth-with-password",
            json={
                "identity": settings.pb_admin_email,
                "password": settings.pb_admin_password,
            },
        )
        resp.raise_for_status()
        self._token = resp.json()["token"]

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token}"} if self._token else {}

    # ── CRUD helpers ─────────────────────────────────────────────────────────

    async def create(self, collection: str, data: dict[str, Any]) -> dict[str, Any]:
        resp = await self._http.post(
            f"/api/collections/{collection}/records",
            json=data,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def get_one(self, collection: str, record_id: str) -> dict[str, Any]:
        resp = await self._http.get(
            f"/api/collections/{collection}/records/{record_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def get_list(
        self,
        collection: str,
        page: int = 1,
        per_page: int = 50,
        filter: str = "",
        sort: str = "-created",
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"page": page, "perPage": per_page, "sort": sort}
        if filter:
            params["filter"] = filter
        resp = await self._http.get(
            f"/api/collections/{collection}/records",
            params=params,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def update(
        self, collection: str, record_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        resp = await self._http.patch(
            f"/api/collections/{collection}/records/{record_id}",
            json=data,
            headers=self._headers(),
        )
        if not resp.is_success:
            logger.error(
                "PB update error %s %s: %s", resp.status_code, record_id, resp.text[:500]
            )
        resp.raise_for_status()
        return resp.json()

    async def delete(self, collection: str, record_id: str) -> None:
        resp = await self._http.delete(
            f"/api/collections/{collection}/records/{record_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()


# Singleton — imported by routers and main
pb = PocketBaseClient()
