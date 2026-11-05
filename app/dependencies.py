"""公共 FastAPI 依赖：数据库会话、当前用户、权限校验。"""
from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _resolve_token(request: Request, header_token: Optional[str]) -> str:
    """同时支持 Authorization 请求头与 ?token=xxx query 参数（浏览器新窗口下载场景）。"""
    if header_token:
        return header_token
    q_token = request.query_params.get("token")
    if q_token:
        return q_token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


DBSession = Annotated[Session, Depends(get_db)]
HeaderToken = Annotated[Optional[str], Depends(oauth2_scheme)]


def get_current_user(request: Request, header_token: HeaderToken, db: DBSession) -> User:
    """解析 JWT，返回当前登录用户（学生 / 管理员 / 企业）。"""
    token = _resolve_token(request, header_token)
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效或已过期的凭证")
    user_id: int | None = payload.get("sub")
    role: str | None = payload.get("role")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="凭证缺少用户标识")

    if role == "enterprise":
        from app.models.user import Enterprise

        ent = db.get(Enterprise, user_id)
        if not ent:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="企业账号不存在")
        # 复用 User 接口：构造轻量代理
        return _enterprise_proxy(ent)

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已被禁用")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if getattr(user, "role", None) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")
    return user


def require_enterprise(user: CurrentUser) -> User:
    if getattr(user, "role", None) != "enterprise":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要企业账号权限")
    return user


def _enterprise_proxy(ent):
    """把 Enterprise 实例包装成与 User 兼容的轻量对象，供依赖层使用。"""
    proxy = User()
    proxy.id = ent.id
    proxy.username = ent.username
    proxy.role = "enterprise"
    proxy.is_active = ent.is_active
    proxy._enterprise = ent
    return proxy
