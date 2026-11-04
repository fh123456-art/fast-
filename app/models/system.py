"""系统消息 + 管理员操作日志。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemMessage(Base):
    """系统消息 system_message"""

    __tablename__ = "system_message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(128))
    content: Mapped[str] = mapped_column(Text)
    target_role: Mapped[str | None] = mapped_column(String(16), comment="all/student/enterprise/admin")
    is_published: Mapped[bool] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AdminOperationLog(Base):
    """管理员操作日志 admin_operation_log"""

    __tablename__ = "admin_operation_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(Integer, index=True)
    action: Mapped[str] = mapped_column(String(64), comment="操作类型")
    target: Mapped[str | None] = mapped_column(String(128), comment="操作对象")
    detail: Mapped[str | None] = mapped_column(Text, comment="详情 JSON")
    ip: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
