"""学生用户表 + 企业账号表。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """学生用户表 users"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    real_name: Mapped[str | None] = mapped_column(String(64))
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(128))
    school: Mapped[str | None] = mapped_column(String(128), comment="学校")
    major: Mapped[str | None] = mapped_column(String(128), comment="专业")
    education: Mapped[str | None] = mapped_column(String(32), comment="学历：本科/硕士/博士")
    graduate_year: Mapped[int | None] = mapped_column(Integer, comment="毕业年份")
    role: Mapped[str] = mapped_column(String(16), default="student", comment="student/admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_quota: Mapped[int] = mapped_column(Integer, default=100, comment="AI 调用次数配额")
    resume_limit: Mapped[int] = mapped_column(Integer, default=5, comment="简历数量上限")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Enterprise(Base):
    """企业账号表 enterprise"""

    __tablename__ = "enterprise"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str] = mapped_column(String(128), comment="企业名称")
    contact_name: Mapped[str | None] = mapped_column(String(64))
    contact_phone: Mapped[str | None] = mapped_column(String(32))
    industry: Mapped[str | None] = mapped_column(String(64), comment="所属行业")
    intro: Mapped[str | None] = mapped_column(Text, comment="企业简介")
    role: Mapped[str] = mapped_column(String(16), default="enterprise")
    status: Mapped[str] = mapped_column(String(16), default="pending", comment="pending/approved/rejected")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
