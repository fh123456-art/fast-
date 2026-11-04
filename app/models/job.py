"""招聘岗位表 + 岗位收藏 + 投递记录表。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JobPosition(Base):
    """招聘岗位表 job_position"""

    __tablename__ = "job_position"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enterprise_id: Mapped[int] = mapped_column(Integer, ForeignKey("enterprise.id"), index=True)
    title: Mapped[str] = mapped_column(String(128), comment="岗位名称")
    company: Mapped[str | None] = mapped_column(String(128), comment="企业名称")
    city: Mapped[str | None] = mapped_column(String(64))
    salary_min: Mapped[int | None] = mapped_column(Integer, comment="月薪下限(K)")
    salary_max: Mapped[int | None] = mapped_column(Integer, comment="月薪上限(K)")
    experience: Mapped[str | None] = mapped_column(String(32), comment="经验要求")
    education: Mapped[str | None] = mapped_column(String(32), comment="学历要求")
    job_type: Mapped[str | None] = mapped_column(String(32), comment="全职/实习")
    category: Mapped[str | None] = mapped_column(String(64), comment="岗位分类")
    description: Mapped[str | None] = mapped_column(Text, comment="岗位描述 JD")
    requirement: Mapped[str | None] = mapped_column(Text, comment="任职要求")
    skills: Mapped[str | None] = mapped_column(Text, comment="技能标签 JSON")
    status: Mapped[str] = mapped_column(String(16), default="approved", comment="pending/approved/offline")
    risk_hint: Mapped[str | None] = mapped_column(Text, comment="求职风险提示")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class UserCollectJob(Base):
    """岗位收藏 user_collect_job"""

    __tablename__ = "user_collect_job"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_position.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class JobApply(Base):
    """投递记录表 job_apply"""

    __tablename__ = "job_apply"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_position.id"), index=True)
    resume_id: Mapped[int] = mapped_column(Integer, ForeignKey("resume.id"), comment="绑定的简历版本")
    status: Mapped[str] = mapped_column(String(32), default="submitted", comment="submitted/viewed/accepted/rejected")
    note: Mapped[str | None] = mapped_column(Text, comment="求职笔记")
    tags: Mapped[str | None] = mapped_column(String(255), comment="标签 JSON")
    interview_date: Mapped[datetime | None] = mapped_column(DateTime, comment="面试时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
