"""笔试相关 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ExamQuestionOut(BaseModel):
    id: int
    category: str | None = None
    question_type: str
    question: str
    options: Any
    difficulty: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ExamAnswerIn(BaseModel):
    user_answer: str


class UserExamRecordOut(BaseModel):
    id: int
    user_id: int
    question_id: int
    user_answer: str | None = None
    is_correct: bool
    is_collected: bool
    created_at: datetime

    model_config = {"from_attributes": True}
