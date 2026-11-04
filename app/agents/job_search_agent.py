from __future__ import annotations

from app.agents.base import AgentState, BaseAgent
from app.services.job_search import ai_search_jobs


class JobSearchAgent(BaseAgent):
    name = "job_search"

    async def run(self, state: AgentState) -> AgentState:
        keyword = state.get("keyword") or state.get("query") or ""
        if not keyword:
            return {"job_search_results": [], "current_agent": self.name}
        results = await ai_search_jobs(keyword)
        return {"job_search_results": results, "current_agent": self.name}
