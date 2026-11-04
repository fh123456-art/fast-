"""HR 面试 Agent：动态出题，根据回答调整难度，打分点评。"""
from __future__ import annotations

from app.agents.base import AgentState, BaseAgent
from app.services import interview_service as iv


class HRInterviewAgent(BaseAgent):
    name = "hr_interview"

    async def run(self, state: AgentState) -> AgentState:
        job = state.get("job") or {}
        mode = state.get("mode", "hr")
        difficulty = state.get("difficulty", "medium")
        history = state.get("history") or []

        result: AgentState = {"current_agent": self.name}

        # 若有用户最新回答，则先评分，再据此调整难度出题
        if history and history[-1].get("role") == "user":
            last_q = next((h for h in reversed(history[:-1]) if h.get("role") == "interviewer"), None)
            if last_q:
                ev = await iv.evaluate_answer(last_q.get("content", ""), history[-1].get("content", ""))
                result["interview_eval"] = ev
                difficulty = ev.get("next_difficulty", difficulty)

        question = await iv.next_question(job, mode, difficulty, history)
        result["interview_question"] = question
        result["difficulty"] = question.get("difficulty", difficulty)
        return result
