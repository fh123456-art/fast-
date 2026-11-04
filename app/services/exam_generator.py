"""笔试出题服务：根据岗位生成练习题。"""
from __future__ import annotations

import json

from app.services.llm_client import chat_complete, parse_json_output

SYSTEM_PROMPT = """你是笔试题出题专家。根据岗位信息生成一道笔试练习题。
输出 JSON：{
  "category": "分类",
  "question_type": "single|multiple|code|qa",
  "question": "题干",
  "options": ["选项A","选项B","选项C","选项D"],  # 单选/多选时提供
  "answer": "参考答案",
  "analysis": "解析",
  "difficulty": "easy|medium|hard"
}
只输出 JSON。"""

BATCH_PROMPT = """你是笔试题出题专家。根据岗位信息生成 {count} 道不同类型的笔试练习题。
输出 JSON 数组，每项结构：{{
  "category": "分类",
  "question_type": "single|multiple|code|qa",
  "question": "题干",
  "options": ["选项A","选项B","选项C","选项D"],
  "answer": "参考答案",
  "analysis": "解析",
  "difficulty": "easy|medium|hard"
}}
只输出 JSON 数组，不要其他文字。"""


async def generate_question(job: dict, category: str | None = None) -> dict:
    user = json.dumps({"job": job, "category": category}, ensure_ascii=False)
    out = await chat_complete(SYSTEM_PROMPT, user, temperature=0.8, json_mode=True)
    return parse_json_output(out)


async def batch_generate(job: dict, count: int = 5, difficulty: str = "medium") -> list[dict]:
    prompt = BATCH_PROMPT.format(count=count)
    user = json.dumps({"job": job, "count": count, "difficulty": difficulty}, ensure_ascii=False)
    out = await chat_complete(prompt, user, temperature=0.85, json_mode=True)
    parsed = parse_json_output(out)
    if isinstance(parsed, dict):
        for key in ("questions", "items", "list", "exam_questions"):
            if key in parsed and isinstance(parsed[key], list):
                return parsed[key]
        return [parsed]
    if isinstance(parsed, list):
        return parsed
    return []
