from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.system import SystemMessage
from app.schemas.ai import SystemMessageOut
from app.utils.security import decode_access_token

router = APIRouter()


def _optional_user_role(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    payload = decode_access_token(token)
    if not payload:
        return None
    role = payload.get("role")
    return role


@router.get("", response_model=list[SystemMessageOut])
def list_messages(
    limit: int = Query(default=20, ge=1, le=100),
    role: Optional[str] = Depends(_optional_user_role),
    db: Session = Depends(get_db),
):
    """公开公告列表：所有人可见，按角色过滤 target_role。"""
    query = db.query(SystemMessage).filter(SystemMessage.is_published == 1)

    if role in ("student", "enterprise"):
        query = query.filter(
            SystemMessage.target_role.in_(["all", role, None])
        )
    else:
        query = query.filter(
            SystemMessage.target_role.in_(["all", None])
        )

    rows = query.order_by(SystemMessage.created_at.desc()).limit(limit).all()
    return rows
