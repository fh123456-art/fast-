"""面试会话表 + 面试问答表 + 面试题库。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InterviewSession(Base):
    """面试会话表 interview_session"""

    __tablename__ = "interview_session"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    job_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("job_position.id"))
    mode: Mapped[str] = mapped_column(String(32), comment="面试模式：hr/tech/behavioral/mock")
    difficulty: Mapped[str] = mapped_column(String(16), default="medium", comment="easy/medium/hard")
    status: Mapped[str] = mapped_column(String(16), default="ongoing", comment="ongoing/finished")
    score: Mapped[int | None] = mapped_column(Integer, comment="综合评分")
    report: Mapped[str | None] = mapped_column(Text, comment="结构化面试报告 JSON")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)


class InterviewMessage(Base):
    """面试问答表 interview_message"""

    __tablename__ = "interview_message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("interview_session.id"), index=True)
    role: Mapped[str] = mapped_column(String(16), comment="interviewer/user")
    content: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str | None] = mapped_column(String(16), comment="本题难度")
    score: Mapped[int | None] = mapped_column(Integer, comment="单题评分")
    comment: Mapped[str | None] = mapped_column(Text, comment="点评")
    is_wrong: Mapped[bool] = mapped_column(Integer, default=0, comment="是否错题")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class InterviewQuestionBank(Base):
    """面试题库 interview_question_bank"""

    __tablename__ = "interview_question_bank"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str | None] = mapped_column(String(64), comment="分类：技术/HR/行为")
    question: Mapped[str] = mapped_column(Text)
    reference_answer: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(16), default="medium")
    tags: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
