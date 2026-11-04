"""面试相关 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class InterviewSessionCreate(BaseModel):
    job_id: int | None = None
    mode: str = "hr"
    difficulty: str = "medium"


class InterviewSessionOut(BaseModel):
    id: int
    user_id: int
    job_id: int | None = None
    mode: str
    difficulty: str
    status: str
    score: int | None = None
    report: Any
    created_at: datetime

    model_config = {"from_attributes": True}


class InterviewMessageIn(BaseModel):
    content: str


class InterviewMessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    difficulty: str | None = None
    score: int | None = None
    comment: str | None = None
    is_wrong: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class InterviewQuestionBankOut(BaseModel):
    id: int
    category: str | None = None
    question: str
    reference_answer: str | None = None
    difficulty: str
    tags: Any

    model_config = {"from_attributes": True}
