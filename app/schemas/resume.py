"""简历相关 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ResumeCreate(BaseModel):
    title: str
    template_id: int | None = None
    content: dict[str, Any] = Field(default_factory=dict)
    source_file: str | None = None


class ResumeUpdate(BaseModel):
    title: str | None = None
    template_id: int | None = None
    content: dict[str, Any] | None = None
    is_default: bool | None = None


class ResumeOut(BaseModel):
    id: int
    user_id: int
    title: str
    version: int
    template_id: int | None = None
    content: Any
    raw_text: str | None = None
    source_file: str | None = None
    is_default: bool
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeTemplateOut(BaseModel):
    id: int
    name: str
    category: str | None = None
    layout: str
    preview_url: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class ResumeParseOut(BaseModel):
    raw_text: str
    structured: dict[str, Any]
    sensitive_hits: list[dict]
    source_file: str | None = None
    original_filename: str | None = None


class ResumeDiagnoseOut(BaseModel):
    score: int
    dimension_scores: dict[str, int] = Field(default_factory=dict)
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    polished_segments: dict[str, Any]
