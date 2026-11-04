"""笔试题库 + 刷题记录。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ExamQuestion(Base):
    """笔试题库 exam_question"""

    __tablename__ = "exam_question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str | None] = mapped_column(String(64), comment="分类：前端/后端/算法等")
    question_type: Mapped[str] = mapped_column(String(16), comment="single/multiple/code/qa")
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[str | None] = mapped_column(Text, comment="选项 JSON")
    answer: Mapped[str | None] = mapped_column(Text, comment="参考答案")
    analysis: Mapped[str | None] = mapped_column(Text, comment="解析")
    difficulty: Mapped[str] = mapped_column(String(16), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class UserExamRecord(Base):
    """刷题记录 user_exam_record"""

    __tablename__ = "user_exam_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_question.id"), index=True)
    user_answer: Mapped[str | None] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Integer, default=0)
    is_collected: Mapped[bool] = mapped_column(Integer, default=0, comment="是否错题收藏")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ExamSession(Base):
    """笔试会话 exam_session（一套岗位笔试题）"""

    __tablename__ = "exam_session"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    job_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("job_position.id"))
    difficulty: Mapped[str] = mapped_column(String(16), default="medium")
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="ongoing", comment="ongoing/finished")
    report: Mapped[str | None] = mapped_column(Text, comment="结构化报告 JSON")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)


class ExamSessionQuestion(Base):
    """笔试会话题目 exam_session_question"""

    __tablename__ = "exam_session_question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_session.id"), index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_question.id"))
    seq: Mapped[int] = mapped_column(Integer, comment="题号")
    user_answer: Mapped[str | None] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
