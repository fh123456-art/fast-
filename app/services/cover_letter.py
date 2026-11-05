"""AI 定制求职信服务：基于简历真实经历 + 目标岗位 JD 生成求职信。"""
from __future__ import annotations

import json

from app.services.llm_client import chat_complete, parse_json_output

SYSTEM_PROMPT = """你是一名资深求职辅导师。请根据候选人的真实简历内容与目标岗位 JD，撰写一封定制求职信。

# 铁律
- 只能使用【简历中真实存在】的经历、技能与成果，严禁虚构公司、职位、业绩、奖项、证书
- 数字与成果必须来自简历原文，不得夸大
- 全文 300-450 字，语气礼貌专业，使用第一人称

# 结构
1. 称呼（如"尊敬的招聘负责人："）
2. 意向：应聘的岗位名称与对公司的关注点
3. 匹配亮点：从简历中挑选与 JD 最相关的 2-3 段经历/技能，说明为何胜任
4. 意愿结尾：表达面试期待与感谢

# 输出 JSON 格式（严格遵守，只输出 JSON）
{
  "letter": "求职信全文（段落之间用 \\n 分隔）",
  "highlights": ["匹配亮点标签1", "匹配亮点标签2", "匹配亮点标签3"]
}
// highlights 为 3-5 条、每条不超过 10 字，从简历与 JD 的真实匹配点中提炼"""


async def generate_cover_letter(resume_content: dict, job_info: dict) -> dict:
    user_text = json.dumps(
        {"resume": resume_content, "target_job": job_info},
        ensure_ascii=False,
    )[:8000]
    out = await chat_complete(SYSTEM_PROMPT, user_text, temperature=0.6, json_mode=True)
    return parse_json_output(out)
