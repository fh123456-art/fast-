"""岗位匹配服务：简历-JD 技能对比，计算匹配分数，给出风险提示。"""
from __future__ import annotations

import json

from app.services.llm_client import chat_complete, parse_json_output

SYSTEM_PROMPT = """你是岗位匹配专家。对比简历与岗位 JD，输出 JSON：
{
  "match_score": 0-100 浮点数,
  "matched_skills": ["匹配到的技能"],
  "missing_skills": ["缺失的技能"],
  "analysis": "简短分析",
  "risk_hint": "求职风险提示（如学历不足、经验不匹配等，无则空字符串）"
}
只输出 JSON。"""


async def match_resume_to_job(resume_content: dict, job: dict) -> dict:
    user_text = (
        f"【简历】\n{json.dumps(resume_content, ensure_ascii=False)[:3000]}\n\n"
        f"【岗位JD】\n标题: {job.get('title')}\n描述: {job.get('description','')}\n"
        f"要求: {job.get('requirement','')}\n技能: {job.get('skills','')}"
    )
    out = await chat_complete(SYSTEM_PROMPT, user_text, temperature=0.2, json_mode=True)
    return parse_json_output(out)


def keyword_risk_hint(resume: dict, job: dict) -> str:
    """基于关键词的轻量风险提示（无 LLM 时兜底）。"""
    hints = []
    edu = str(resume.get("education", ""))
    req_edu = str(job.get("education", ""))
    if req_edu and edu and req_edu not in edu:
        hints.append(f"学历要求 {req_edu}，简历为 {edu}")
    exp = str(resume.get("experience", ""))
    req_exp = str(job.get("experience", ""))
    if req_exp and req_exp not in exp:
        hints.append(f"经验要求 {req_exp}")
    return "；".join(hints)
