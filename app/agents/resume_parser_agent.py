"""简历解析 Agent：提取结构化信息 + 敏感识别。"""
from __future__ import annotations

from app.agents.base import AgentState, BaseAgent
from app.services.resume_parser import parse_resume_text
from app.utils.desensitize import detect_sensitive


class ResumeParserAgent(BaseAgent):
    name = "resume_parser"

    async def run(self, state: AgentState) -> AgentState:
        text = state.get("resume_text") or ""
        if not text and state.get("resume_content"):
            import json

            text = json.dumps(state["resume_content"], ensure_ascii=False)
        structured = await parse_resume_text(text) if text else {}
        hits = detect_sensitive(text)
        new_state: AgentState = {
            "parsed_resume": structured or state.get("resume_content", {}),
            "sensitive_hits": hits,
            "current_agent": self.name,
        }
        return new_state
