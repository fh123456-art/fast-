"""AI 提示词模板 + 用户反馈 + AI 坏案例库。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AiPromptTemplate(Base):
    """提示词模板 ai_prompt_template"""

    __tablename__ = "ai_prompt_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_name: Mapped[str] = mapped_column(String(64), comment="智能体名称")
    name: Mapped[str] = mapped_column(String(128), comment="模板名称")
    prompt: Mapped[str] = mapped_column(Text, comment="提示词内容")
    version: Mapped[str] = mapped_column(String(32), default="v1")
    is_active: Mapped[bool] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class AiFeedback(Base):
    """用户反馈表 ai_feedback（AI 简历/面试点评点赞点踩）"""

    __tablename__ = "ai_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String(32), comment="resume/interview/exam")
    target_id: Mapped[int | None] = mapped_column(Integer)
    feedback: Mapped[str] = mapped_column(String(16), comment="like/dislike")
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AiBadCase(Base):
    """AI 坏案例库 ai_bad_case"""

    __tablename__ = "ai_bad_case"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_name: Mapped[str] = mapped_column(String(64))
    request: Mapped[str | None] = mapped_column(Text, comment="输入")
    response: Mapped[str | None] = mapped_column(Text, comment="输出")
    reason: Mapped[str | None] = mapped_column(Text, comment="问题原因")
    status: Mapped[str] = mapped_column(String(16), default="open", comment="open/fixed")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
