"""简历解析服务：PDF/Word 提取文本 + 敏感信息检测 + 结构化抽取。"""
from __future__ import annotations

import json
from pathlib import Path

from pypdf import PdfReader
from docx import Document

from app.services.llm_client import chat_complete, parse_json_output
from app.utils.desensitize import detect_sensitive, desensitize

SYSTEM_PROMPT = """你是一名资深简历解析助手。请把用户提供的简历纯文本抽取为结构化 JSON，
字段包含：name, phone, email, school, major, education, graduate_year, summary,
experiences[{company, role, period, detail}], projects[{name, period, detail}], skills[]。
只输出 JSON，不要解释。"""


def normalize_resume(data: dict | None) -> dict:
    """把任意格式的简历 content 统一成前端编辑器期望的嵌套结构。

    输入可能有两种风格：
      1) AI 解析的扁平格式: {name, phone, email, school, major, education(str),
                              experiences[{company, role, period, detail}], ...}
      2) 前端编辑器的嵌套格式: {basics:{...}, education:[{...}],
                                experience:[{...}], skills:[{...}]}
    输出统一为风格 2。
    """
    if not isinstance(data, dict):
        data = {}

    basics = data.get("basics") or {}
    if not isinstance(basics, dict):
        basics = {}

    flat_name = data.get("name") or basics.get("name", "")
    flat_target = data.get("target") or data.get("job_intention") or data.get("objective") or ""
    flat_email = data.get("email") or basics.get("email", "")
    flat_phone = data.get("phone") or basics.get("phone", "")
    flat_summary = data.get("summary") or basics.get("summary", "")

    basics_out = {
        "name": flat_name,
        "target": flat_target,
        "email": flat_email,
        "phone": flat_phone,
        "summary": flat_summary,
    }

    education = data.get("education")
    if isinstance(education, str):
        school = data.get("school", "")
        major = data.get("major", "")
        edu_list = [{
            "school": school,
            "major": major,
            "degree": education,
            "start_date": "",
            "end_date": str(data.get("graduate_year", "")) if data.get("graduate_year") else "",
            "description": "",
        }]
    elif isinstance(education, list):
        edu_list = []
        for item in education:
            if isinstance(item, dict):
                edu_list.append({
                    "school": item.get("school", "") or item.get("name", ""),
                    "major": item.get("major", ""),
                    "degree": item.get("degree", "") or item.get("education", ""),
                    "start_date": item.get("start_date", "") or item.get("start", ""),
                    "end_date": item.get("end_date", "") or item.get("end", "") or str(item.get("graduate_year", "")),
                    "description": item.get("description", "") or item.get("detail", ""),
                })
    else:
        edu_list = []

    experiences = data.get("experience") or data.get("experiences") or []
    if isinstance(experiences, list):
        exp_list = []
        for item in experiences:
            if isinstance(item, dict):
                exp_list.append({
                    "company": item.get("company", "") or item.get("name", ""),
                    "position": item.get("position", "") or item.get("role", "") or item.get("title", ""),
                    "start_date": item.get("start_date", "") or item.get("start", "") or item.get("period", "").split("-")[0] if item.get("period") else "",
                    "end_date": item.get("end_date", "") or item.get("end", ""),
                    "description": item.get("description", "") or item.get("detail", "") or item.get("duties", ""),
                })
    else:
        exp_list = []

    projects = data.get("projects") or []
    if isinstance(projects, list):
        for item in projects:
            if isinstance(item, dict):
                exp_list.append({
                    "company": item.get("name", "") or "项目",
                    "position": item.get("role", "") or "项目经历",
                    "start_date": "",
                    "end_date": item.get("period", ""),
                    "description": item.get("detail", "") or item.get("description", ""),
                })

    skills = data.get("skills")
    if isinstance(skills, list):
        skill_list = []
        for item in skills:
            if isinstance(item, dict):
                skill_list.append({
                    "name": item.get("name", "") or item.get("skill", ""),
                    "level": item.get("level", "") or item.get("proficiency", ""),
                })
            elif isinstance(item, str):
                skill_list.append({"name": item, "level": ""})
    elif isinstance(skills, str):
        skill_list = [{"name": s.strip(), "level": ""} for s in skills.replace("、", ",").split(",") if s.strip()]
    else:
        skill_list = []

    return {
        "basics": basics_out,
        "education": edu_list,
        "experience": exp_list,
        "skills": skill_list,
    }


def extract_text_from_file(file_path: str) -> str:
    """根据扩展名从 PDF / Word 提取纯文本。"""
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    if suffix in (".docx",):
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)
    if suffix == ".doc":
        # python-docx 不支持 .doc，这里做占位
        return path.read_text(encoding="utf-8", errors="ignore")
    # 纯文本兜底
    return path.read_text(encoding="utf-8", errors="ignore")


async def parse_resume_text(raw_text: str) -> dict:
    """调用 LLM 把简历纯文本结构化为 JSON。"""
    content = await chat_complete(SYSTEM_PROMPT, raw_text[:8000], json_mode=True)
    return parse_json_output(content)


async def parse_resume_file(file_path: str) -> tuple[str, dict, list[dict]]:
    """解析上传的简历文件，返回 (纯文本, 结构化内容, 敏感信息命中列表)。"""
    raw_text = extract_text_from_file(file_path)
    _, hits = desensitize(raw_text)
    structured = await parse_resume_text(raw_text)
    return raw_text, structured, hits
