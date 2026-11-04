"""简历版本表 + 简历模板表。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Resume(Base):
    """简历版本表 resume"""

    __tablename__ = "resume"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(128), comment="简历标题（版本名）")
    version: Mapped[int] = mapped_column(Integer, default=1, comment="版本号")
    template_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("resume_template.id"))
    # 结构化简历内容（JSON 字符串）：name/phone/email/school/major/summary/experiences/projects/skills
    content: Mapped[str] = mapped_column(Text, comment="JSON 结构化简历内容")
    raw_text: Mapped[str | None] = mapped_column(Text, comment="解析后的纯文本")
    source_file: Mapped[str | None] = mapped_column(String(255), comment="上传的原文件路径")
    is_default: Mapped[bool] = mapped_column(Integer, default=0, comment="是否默认简历")
    status: Mapped[str] = mapped_column(String(16), default="draft", comment="draft/audited/rejected")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ResumeTemplate(Base):
    """简历模板表 resume_template"""

    __tablename__ = "resume_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), comment="模板名称")
    category: Mapped[str | None] = mapped_column(String(64), comment="分类：校招/社招/技术岗等")
    layout: Mapped[str] = mapped_column(String(32), default="classic", comment="版式标识")
    content: Mapped[str | None] = mapped_column(Text, comment="模板占位结构 JSON")
    preview_url: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
