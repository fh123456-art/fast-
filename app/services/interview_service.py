"""AI 模拟面试服务：动态出题、根据回答调整难度、打分点评。"""
from __future__ import annotations

import json

from app.services.llm_client import chat_complete, parse_json_output

SYSTEM_ASK = """你是一名资深面试官。根据当前面试上下文（岗位、模式、历史问答、难度），
提出下一道面试题。输出 JSON：{"question": "题目", "difficulty": "easy|medium|hard"}。只输出 JSON。"""

SYSTEM_EVAL = """你是面试官，请对求职者的回答进行评分与点评。
输出 JSON：{"score": 0-100整数, "comment": "点评", "next_difficulty": "easy|medium|hard", "is_wrong": true/false}。
只输出 JSON。"""

SYSTEM_REPORT = """你是面试官，请根据整场面试的问答记录生成结构化面试报告。
输出 JSON：{"overall_score": 0-100, "summary": "总体评价", "strengths": [], "improvements": [], "suggestions": []}。
只输出 JSON。"""


async def next_question(job: dict, mode: str, difficulty: str, history: list[dict]) -> dict:
    context = json.dumps({"job": job, "mode": mode, "difficulty": difficulty, "history": history[-6:]}, ensure_ascii=False)
    out = await chat_complete(SYSTEM_ASK, context, temperature=0.7, json_mode=True)
    return parse_json_output(out)


async def evaluate_answer(question: str, answer: str) -> dict:
    user = f"问题: {question}\n回答: {answer}"
    out = await chat_complete(SYSTEM_EVAL, user, temperature=0.3, json_mode=True)
    return parse_json_output(out)


async def generate_report(history: list[dict]) -> dict:
    user = json.dumps(history, ensure_ascii=False)
    out = await chat_complete(SYSTEM_REPORT, user, temperature=0.3, json_mode=True)
    return parse_json_output(out)


def compress_history(history: list[dict], keep: int = 8) -> list[dict]:
    """会话记忆压缩：只保留最近 N 轮 + 摘要（这里用截断简化）。"""
    if len(history) <= keep:
        return history
    return history[-keep:]
