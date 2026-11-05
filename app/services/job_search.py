"""AI 联网搜职位：调用 DeepSeek 联网搜索，把关键词扩展为结构化岗位列表。"""
from __future__ import annotations

import json
from typing import Any

from app.services.llm_client import chat_complete, parse_json_output

SYSTEM_PROMPT = """你是一名资深招聘信息采集助手。用户会给你一个职位关键词，你需要：
1. 联网搜索当前年份（2025-2026）最新、真实的对应岗位信息（优先来源：BOSS直聘、拉勾、智联招聘、猎聘、各大公司官网招聘页）；
2. 为每个岗位返回结构化数据，字段如下：
   - company:  公司全称（如 字节跳动、小米、华为）
   - title:    岗位全称（如 Java 后端开发工程师）
   - city:     工作城市（如 北京、上海、杭州、深圳）
   - salary_min: 最低月薪（整数，单位 K，如 20）
   - salary_max: 最高月薪（整数，单位 K，如 45）
   - experience: 经验要求（如 1-3年、3-5年、5-10年、不限）
   - education: 学历要求（如 大专、本科、硕士、博士）
   - job_type:  工作性质（如 全职、实习、兼职）
   - category:  岗位大类（如 后端开发、前端开发、算法、测试、产品、运营、设计、数据、底层开发）
   - description: 岗位职责的简短描述（50-100字）
   - requirement: 任职要求的简短描述（30-80字）
   - skills:    技能关键词列表（数组，每项 1-3 词，如 ["Java","Spring Boot","MySQL"]）
3. 一次返回 10-15 条不同公司的真实岗位，不要虚构公司；
4. 只输出一个 JSON 数组，不要任何 markdown 代码块标记、注释或其他文字。"""


def _normalize_jobs(raw: Any) -> list[dict]:
    """把 LLM 的 JSON 输出规整成统一结构。"""
    if isinstance(raw, dict):
        for k in ("jobs", "results", "data", "items"):
            if k in raw and isinstance(raw[k], list):
                raw = raw[k]
                break
        else:
            raw = [raw]
    if not isinstance(raw, list):
        return []

    jobs: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        company = str(item.get("company") or item.get("company_name") or "").strip()
        title = str(item.get("title") or item.get("job_title") or "").strip()
        if not company or not title:
            continue

        salary = str(item.get("salary") or item.get("salary_range") or "").strip()
        smin = item.get("salary_min") or item.get("min_salary")
        smax = item.get("salary_max") or item.get("max_salary")
        if smin is None and smax is None and salary:
            import re
            nums = re.findall(r"(\d+(?:\.\d+)?)", salary.replace(",", ""))
            if len(nums) >= 1:
                smin = int(float(nums[0]))
            if len(nums) >= 2:
                smax = int(float(nums[1]))
            elif smin:
                smax = smin + 5
        smin = int(smin) if smin is not None and str(smin).isdigit() else None
        smax = int(smax) if smax is not None and str(smax).isdigit() else None
        if smin is not None and smax is None:
            smax = smin + 5

        skills = item.get("skills") or item.get("skill") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split("/") if s.strip()]
        skills = [str(s) for s in skills][:8]

        jobs.append({
            "company": company,
            "title": title,
            "city": str(item.get("city") or "全国").strip(),
            "salary_min": smin,
            "salary_max": smax,
            "experience": str(item.get("experience") or "1-3年").strip(),
            "education": str(item.get("education") or "本科").strip(),
            "job_type": str(item.get("job_type") or "全职").strip(),
            "category": str(item.get("category") or "").strip(),
            "description": str(item.get("description") or item.get("desc") or "").strip()[:200],
            "requirement": str(item.get("requirement") or item.get("requirements") or "").strip()[:200],
            "skills": json.dumps(skills, ensure_ascii=False),
        })
    return jobs


async def ai_search_jobs(keyword: str, max_items: int = 15, city: str | None = None) -> list[dict]:
    """联网搜索关键词对应的真实岗位，返回结构化列表。"""
    loc = f"在「{city}」地区" if city and city != "全国" else "在全国各地"
    user = f"请联网搜索{loc}与「{keyword}」相关的最新真实岗位，尽可能多地返回（至少 {max_items} 条以上），来自不同公司不同岗位方向。"
    text = await chat_complete(SYSTEM_PROMPT, user, temperature=0.4, enable_search=True)
    data = parse_json_output(text)
    jobs = _normalize_jobs(data)
    if city and city != "全国":
        for j in jobs:
            if not j.get("city") or j["city"] == "全国":
                j["city"] = city
    return jobs[:max_items]
