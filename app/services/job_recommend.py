"""AI 智能推荐：简历关键词提取 → 联网搜岗 → 逐岗位匹配打分 → 排序返回。"""
from __future__ import annotations

import asyncio
import json
from typing import Any

from app.services.job_match import match_resume_to_job
from app.services.job_search import ai_search_jobs
from app.services.llm_client import chat_complete, parse_json_output

KEYWORD_PROMPT = """你是求职分析专家。阅读用户的简历，从中提取 3-5 个最核心的求职关键词（用于联网搜索相关真实岗位）。
关键词应该是：岗位方向（如 Java 后端、React 前端、数据分析师、AI 算法）、技术栈、目标行业。
返回严格 JSON 数组，只输出 JSON，不要 markdown。"""


async def extract_search_keywords(resume_content: dict) -> list[str]:
    """从简历里抽 3-5 个用于联网搜岗的关键词。"""
    text = json.dumps(resume_content, ensure_ascii=False)[:3000]
    out = await chat_complete(KEYWORD_PROMPT, text, temperature=0.2, json_mode=True)
    parsed = parse_json_output(out)
    if isinstance(parsed, list):
        return [str(k).strip() for k in parsed if str(k).strip()][:5]
    if isinstance(parsed, dict):
        for key in ("keywords", "keys", "result"):
            v = parsed.get(key)
            if isinstance(v, list):
                return [str(k).strip() for k in v if str(k).strip()][:5]
    return []


async def recommend_for_resume(
    resume_content: dict, max_candidates: int = 15, top_k: int = 10
) -> list[dict[str, Any]]:
    """
    完整流程：
    1. 从简历抽关键词
    2. 每个关键词联网搜岗 → 合并去重 → 候选池
    3. 对每个候选岗并发 LLM 匹配打分
    4. 按分排序 top_k
    """
    keywords = await extract_search_keywords(resume_content)
    if not keywords:
        summary = str(resume_content.get("summary") or resume_content.get("raw_text") or "")
        exp = str(resume_content.get("experiences") or "")
        skills = str(resume_content.get("skills") or "")
        combined = f"{summary} {exp} {skills}".strip() or "Java Python 后端 前端"
        keywords = [combined[:80]]

    seen: set[tuple[str, str]] = set()
    candidates: list[dict] = []
    for kw in keywords:
        try:
            jobs = await ai_search_jobs(kw, max_items=8)
        except Exception:
            continue
        for j in jobs:
            key = (j.get("company", ""), j.get("title", ""))
            if key in seen or not j.get("title"):
                continue
            seen.add(key)
            candidates.append(j)
            if len(candidates) >= max_candidates:
                break
        if len(candidates) >= max_candidates:
            break

    resume_for_match = {
        "name": resume_content.get("name", ""),
        "school": resume_content.get("school", ""),
        "major": resume_content.get("major", ""),
        "skills": resume_content.get("skills", []),
        "summary": resume_content.get("summary", ""),
        "experiences": resume_content.get("experiences", []),
        "projects": resume_content.get("projects", []),
        "education": resume_content.get("education", ""),
        "experience": resume_content.get("experience", ""),
    }

    sem = asyncio.Semaphore(5)

    async def _one_score(job: dict) -> dict:
        async with sem:
            try:
                m = await match_resume_to_job(resume_for_match, job)
            except Exception:
                m = {}
            job_copy = dict(job)
            job_copy["match_score"] = round(float(m.get("match_score", 0) or 0), 1)
            job_copy["matched_skills"] = m.get("matched_skills", [])
            job_copy["missing_skills"] = m.get("missing_skills", [])
            job_copy["match_analysis"] = m.get("analysis", "")
            job_copy["risk_hint"] = m.get("risk_hint", "")
            return job_copy

    tasks = [_one_score(j) for j in candidates[:max_candidates]]
    scored = await asyncio.gather(*tasks, return_exceptions=True)
    scored = [s for s in scored if isinstance(s, dict)]

    scored.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return scored[:top_k]
