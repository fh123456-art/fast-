"""简历导出 PDF（基于 reportlab 生成基础版式）。"""
from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def render_resume_pdf(resume: dict) -> bytes:
    """根据简历字典渲染 PDF 二进制。

    resume 结构示例：
    {
      "name": "张三", "phone": "138****", "email": "...",
      "school": "...", "major": "...", "education": "本科",
      "summary": "...",
      "experiences": [{"company":"..","role":"..","period":"..","detail":".."}],
      "projects": [...],
      "skills": ["Python", "FastAPI", ...],
    }
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleCN", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=20, spaceAfter=8
    )
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#1f4e79"))
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=10, leading=15)

    story: list = []
    story.append(Paragraph(str(resume.get("name", "")), title_style))

    contact_parts = [
        resume.get("phone", ""),
        resume.get("email", ""),
        resume.get("school", ""),
        resume.get("major", ""),
    ]
    contact = " | ".join(p for p in contact_parts if p)
    if contact:
        story.append(Paragraph(contact, body))
    story.append(Spacer(1, 0.3 * cm))

    if resume.get("summary"):
        story.append(Paragraph("个人简介", h2))
        story.append(Paragraph(str(resume["summary"]).replace("\n", "<br/>"), body))
        story.append(Spacer(1, 0.3 * cm))

    if resume.get("experiences"):
        story.append(Paragraph("实习/工作经历", h2))
        for exp in resume["experiences"]:
            header = f"{exp.get('company','')} - {exp.get('role','')}  ({exp.get('period','')})"
            story.append(Paragraph(header, ParagraphStyle("exp", parent=body, fontName="Helvetica-Bold")))
            story.append(Paragraph(str(exp.get("detail", "")).replace("\n", "<br/>"), body))
        story.append(Spacer(1, 0.3 * cm))

    if resume.get("projects"):
        story.append(Paragraph("项目经历", h2))
        for p in resume["projects"]:
            story.append(Paragraph(f"{p.get('name','')} ({p.get('period','')})", ParagraphStyle("p", parent=body, fontName="Helvetica-Bold")))
            story.append(Paragraph(str(p.get("detail", "")).replace("\n", "<br/>"), body))
        story.append(Spacer(1, 0.3 * cm))

    if resume.get("skills"):
        story.append(Paragraph("技能标签", h2))
        data = [[Paragraph(str(s), body) for s in resume["skills"][:4]]]
        table = Table(data, colWidths=[4 * cm] * 4)
        table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f5f5f5")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(table)

    doc.build(story)
    return buf.getvalue()
