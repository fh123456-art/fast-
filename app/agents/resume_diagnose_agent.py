"""简历诊断 Agent：分析优缺点，输出修改建议与润色片段。"""
from __future__ import annotations

from app.agents.base import AgentState, BaseAgent
from app.services.resume_diagnose import diagnose_resume


class ResumeDiagnoseAgent(BaseAgent):
    name = "resume_diagnose"

    async def run(self, state: AgentState) -> AgentState:
        resume = state.get("parsed_resume") or state.get("resume_content") or {}
        result = await diagnose_resume(resume)
        return {"diagnose": result, "current_agent": self.name}
