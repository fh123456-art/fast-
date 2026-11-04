"""智能体共享状态与基类。"""
from __future__ import annotations

from typing import Any, TypedDict


class AgentState(TypedDict, total=False):
    """多智能体共享状态。"""

    # 路由
    task: str

    # 输入
    resume_text: str
    resume_content: dict[str, Any]
    job: dict[str, Any]
    mode: str
    difficulty: str
    history: list[dict[str, Any]]
    category: str | None
    keyword: str
    query: str

    # 各 Agent 输出
    parsed_resume: dict[str, Any]
    sensitive_hits: list[dict[str, Any]]
    diagnose: dict[str, Any]
    match: dict[str, Any]
    interview_question: dict[str, Any]
    interview_eval: dict[str, Any]
    interview_report: dict[str, Any]
    exam_question: dict[str, Any]
    job_search_results: list[dict[str, Any]]

    # 元信息
    current_agent: str
    error: str


class BaseAgent:
    name: str = "base"

    async def run(self, state: AgentState) -> AgentState:
        raise NotImplementedError
