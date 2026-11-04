"""用户 / 企业 / 认证相关 Schema。"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)
    real_name: str | None = None
    school: str | None = None
    major: str | None = None
    education: str | None = None
    graduate_year: int | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class EnterpriseRegister(BaseModel):
    username: str
    password: str
    company_name: str
    contact_name: str | None = None
    contact_phone: str | None = None
    industry: str | None = None
    intro: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int


class UserOut(BaseModel):
    id: int
    username: str
    real_name: str | None = None
    phone: str | None = None
    email: str | None = None
    school: str | None = None
    major: str | None = None
    education: str | None = None
    graduate_year: int | None = None
    role: str
    is_active: bool
    ai_quota: int
    resume_limit: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    real_name: str | None = None
    phone: str | None = None
    email: str | None = None
    school: str | None = None
    major: str | None = None
    education: str | None = None
    graduate_year: int | None = None


class EnterpriseOut(BaseModel):
    id: int
    username: str
    company_name: str
    contact_name: str | None = None
    industry: str | None = None
    status: str
    is_active: bool

    model_config = {"from_attributes": True}
