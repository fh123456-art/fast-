"""岗位 / 投递相关 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class JobPositionCreate(BaseModel):
    title: str
    company: str | None = None
    city: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    experience: str | None = None
    education: str | None = None
    job_type: str | None = None
    category: str | None = None
    description: str | None = None
    requirement: str | None = None
    skills: list[str] | None = None


class JobPositionOut(BaseModel):
    id: int
    enterprise_id: int | None = None
    title: str
    company: str | None = None
    city: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    experience: str | None = None
    education: str | None = None
    job_type: str | None = None
    category: str | None = None
    description: str | None = None
    requirement: str | None = None
    skills: Any
    status: str
    risk_hint: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JobApplyCreate(BaseModel):
    job_id: int
    resume_id: int


class JobApplyOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    resume_id: int
    status: str
    note: str | None = None
    tags: Any
    interview_date: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JobApplyUpdate(BaseModel):
    status: str | None = None
    note: str | None = None
    tags: list[str] | None = None
    interview_date: datetime | None = None


class JobMatchOut(BaseModel):
    job_id: int
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    analysis: str
