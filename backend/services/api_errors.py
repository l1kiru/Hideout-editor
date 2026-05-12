from __future__ import annotations

from typing import Any

from fastapi import HTTPException


def api_error(
    *,
    status_code: int,
    code: str,
    detail: str,
    params: dict[str, Any] | None = None,
) -> HTTPException:
    payload: dict[str, Any] = {
        "detail": detail,
        "error": {
            "code": code,
            "params": params or {},
        },
    }
    return HTTPException(status_code=status_code, detail=payload)

