"""AI 反馈、提示词模板等 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AiFeedbackCreate(BaseModel):
    target_type: str
    target_id: int | None = None
    feedback: str  # like / dislike
    comment: str | None = None


class AiPromptTemplateOut(BaseModel):
    id: int
    agent_name: str
    name: str
    prompt: str
    version: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AiBadCaseOut(BaseModel):
    id: int
    agent_name: str
    request: str | None = None
    response: str | None = None
    reason: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SystemMessageOut(BaseModel):
    id: int
    title: str
    content: str
    target_role: str | None = None
    is_published: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminLogOut(BaseModel):
    id: int
    admin_id: int
    action: str
    target: str | None = None
    detail: Any
    ip: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
