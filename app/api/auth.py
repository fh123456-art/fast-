"""认证路由：学生注册/登录、企业注册/登录、当前用户信息。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.core.exceptions import success
from app.database import SessionLocal
from app.dependencies import CurrentUser
from app.models.user import Enterprise, User
from app.schemas.user import (
    EnterpriseRegister,
    TokenOut,
    UserLogin,
    UserOut,
    UserRegister,
)
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=dict)
def register_student(payload: UserRegister):
    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(status_code=400, detail="用户名已存在")
        user = User(
            username=payload.username,
            password_hash=hash_password(payload.password),
            real_name=payload.real_name,
            school=payload.school,
            major=payload.major,
            education=payload.education,
            graduate_year=payload.graduate_year,
            ai_quota=settings.DEFAULT_AI_QUOTA,
            resume_limit=settings.DEFAULT_RESUME_LIMIT,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return success({"user_id": user.id})
    finally:
        db.close()


@router.post("/login", response_model=TokenOut)
def login_student(payload: UserLogin):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == payload.username).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="账号已被禁用")
        token = create_access_token(user.id, user.role)
        return TokenOut(access_token=token, role=user.role, user_id=user.id)
    finally:
        db.close()


@router.post("/enterprise/register", response_model=dict)
def register_enterprise(payload: EnterpriseRegister):
    db = SessionLocal()
    try:
        if db.query(Enterprise).filter(Enterprise.username == payload.username).first():
            raise HTTPException(status_code=400, detail="企业用户名已存在")
        ent = Enterprise(
            username=payload.username,
            password_hash=hash_password(payload.password),
            company_name=payload.company_name,
            contact_name=payload.contact_name,
            contact_phone=payload.contact_phone,
            industry=payload.industry,
            intro=payload.intro,
            status="pending",
        )
        db.add(ent)
        db.commit()
        db.refresh(ent)
        return success({"enterprise_id": ent.id, "status": "pending 待审核"})
    finally:
        db.close()


@router.post("/enterprise/login", response_model=TokenOut)
def login_enterprise(payload: UserLogin):
    db = SessionLocal()
    try:
        ent = db.query(Enterprise).filter(Enterprise.username == payload.username).first()
        if not ent or not verify_password(payload.password, ent.password_hash):
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        if ent.status != "approved":
            raise HTTPException(status_code=403, detail="企业账号尚未通过审核")
        token = create_access_token(ent.id, "enterprise")
        return TokenOut(access_token=token, role="enterprise", user_id=ent.id)
    finally:
        db.close()


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
