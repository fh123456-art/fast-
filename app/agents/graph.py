"""LangGraph 多智能体编排：根据任务类型路由到对应 Agent。"""
from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from app.agents.base import AgentState
from app.agents.exam_generator_agent import ExamGeneratorAgent
from app.agents.hr_interview_agent import HRInterviewAgent
from app.agents.job_match_agent import JobMatchAgent
from app.agents.job_search_agent import JobSearchAgent
from app.agents.resume_diagnose_agent import ResumeDiagnoseAgent
from app.agents.resume_parser_agent import ResumeParserAgent

# 任务 -> Agent 名称 映射
TASK_AGENT_MAP = {
    "parse": "resume_parser",
    "diagnose": "resume_diagnose",
    "match": "job_match",
    "interview": "hr_interview",
    "exam": "exam_generator",
    "job_search": "job_search",
}


def _route_by_task(state: AgentState) -> str:
    task = state.get("task") or "parse"
    return TASK_AGENT_MAP.get(task, "resume_parser")


def build_graph():
    """构建包含 6 个 Agent 的 StateGraph。"""
    graph = StateGraph(AgentState)

    parser = ResumeParserAgent()
    diagnose = ResumeDiagnoseAgent()
    matcher = JobMatchAgent()
    interviewer = HRInterviewAgent()
    examiner = ExamGeneratorAgent()
    searcher = JobSearchAgent()

    graph.add_node("resume_parser", parser.run)
    graph.add_node("resume_diagnose", diagnose.run)
    graph.add_node("job_match", matcher.run)
    graph.add_node("hr_interview", interviewer.run)
    graph.add_node("exam_generator", examiner.run)
    graph.add_node("job_search", searcher.run)

    graph.add_conditional_edges(START, _route_by_task)
    for node in TASK_AGENT_MAP.values():
        graph.add_edge(node, END)

    return graph.compile()


async def run_graph(task: str, **inputs: Any) -> AgentState:
    """便捷入口：执行指定任务的 Agent。"""
    app = build_graph()
    state: AgentState = {"task": task, **inputs}
    result = await app.ainvoke(state)
    return result
