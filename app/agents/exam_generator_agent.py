"""笔试出题 Agent：生成岗位笔试练习题。"""
from __future__ import annotations

from app.agents.base import AgentState, BaseAgent
from app.services.exam_generator import generate_question


class ExamGeneratorAgent(BaseAgent):
    name = "exam_generator"

    async def run(self, state: AgentState) -> AgentState:
        job = state.get("job") or {}
        category = state.get("category")
        question = await generate_question(job, category)
        return {"exam_question": question, "current_agent": self.name}
