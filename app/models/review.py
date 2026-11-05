"""点赞 / 点踩 / 点评。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Review(Base):
    """用户对企业 / 岗位的点赞、点踩、点评。

    一个用户对同一个目标（target_type + target_id）只能有一条记录。
    rating:  1 = 点赞
            -1 = 点踩
             0 = 仅点评（无态度）
    """

    __tablename__ = "review"
    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_user_target"),
        Index("ix_review_target", "target_type", "target_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, comment="点评者")
    target_type: Mapped[str] = mapped_column(String(16), comment="enterprise / job")
    target_id: Mapped[int] = mapped_column(Integer, comment="企业ID 或 岗位ID")
    rating: Mapped[int] = mapped_column(Integer, default=0, comment="1=点赞 -1=点踩 0=仅点评")
    content: Mapped[str | None] = mapped_column(Text, comment="点评正文，可空")
    status: Mapped[str] = mapped_column(String(16), default="approved", comment="approved / pending / rejected")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
