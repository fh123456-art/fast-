"""简历诊断服务：分析优缺点，给出修改建议，AI 润色片段。"""
from __future__ import annotations

import json

from app.services.llm_client import chat_complete, parse_json_output

SYSTEM_PROMPT = """你是一名拥有 10 年招聘经验的资深 HR 与简历优化顾问。请对用户提供的简历进行深度诊断。

# 评分维度（总分 100，每个维度按权重打分后加总）
1. 内容完整性 (20%): 基本信息、教育、工作/项目经历、技能是否齐全
2. 经历量化度 (20%): 是否有具体数字（业绩、团队规模、增长百分比、用户数等）
3. 职位匹配度 (20%): 经历描述是否针对目标岗位，关键词是否命中
4. 表达专业度 (15%): 用词是否专业有力（如"主导""设计""优化"而非"参与""负责"），格式是否清晰
5. 逻辑结构 (15%): 经历描述是否有 STAR 法则（情境-任务-行动-结果），时间线是否清晰
6. 简历精简度 (10%): 是否冗余，是否一页纸原则

# 输出 JSON 格式（严格遵守，只输出 JSON）
{{
  "score": 0-100 整数,
  "dimension_scores": {{
    "内容完整性": 0-100,
    "经历量化度": 0-100,
    "职位匹配度": 0-100,
    "表达专业度": 0-100,
    "逻辑结构": 0-100,
    "简历精简度": 0-100
  }},
  "strengths": ["优点1（具体描述，指出哪里好）", "优点2", ...],  // 3-6 条
  "weaknesses": ["缺点1（具体描述，指出哪里不足）", "缺点2", ...],  // 3-6 条
  "suggestions": [
    "1. 具体修改建议（分步骤，可执行）",
    "2. ...",
    ...
  ],  // 4-8 条
  "polished_segments": {{
    "原简历中的片段（原文）": "AI 润色后的专业改写",
    ...
  }}  // 2-5 个典型片段
}}

# 要求
- strengths 和 weaknesses 必须**具体**，引用简历中的**实际内容**，不要空泛
- suggestions 必须**可执行**，说出"改什么 + 怎么改"
- polished_segments 选择 2-5 个最需要优化的片段，润色后要**加量化、用动词、突出结果**
- 如果简历缺少某类信息，在 weaknesses 里明确指出"""


async def diagnose_resume(resume_content: dict) -> dict:
    user_text = json.dumps(resume_content, ensure_ascii=False)[:6000]
    out = await chat_complete(SYSTEM_PROMPT, user_text, temperature=0.4, json_mode=True)
    return parse_json_output(out)


async def polish_segment(segment: str) -> str:
    """对单个简历片段一键润色。"""
    system = "你是简历润色专家，请把用户提供的简历片段改写得更专业、更有量化成果，保持原意。只输出改写后的文本。"
    return await chat_complete(system, segment, temperature=0.5)
