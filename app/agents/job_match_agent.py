"""岗位匹配 Agent：简历-JD 技能对比，计算匹配分数，岗位推荐。"""
from __future__ import annotations

from app.agents.base import AgentState, BaseAgent
from app.services.job_match import match_resume_to_job


class JobMatchAgent(BaseAgent):
    name = "job_match"

    async def run(self, state: AgentState) -> AgentState:
        resume = state.get("parsed_resume") or state.get("resume_content") or {}
        job = state.get("job") or {}
        result = await match_resume_to_job(resume, job)
        return {"match": result, "current_agent": self.name}
