"""AI 求职练习 - 模拟面试路由：多模式、动态难度、结构化报告、错题集。"""
from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents import run_graph
from app.core.exceptions import success
from app.database import get_db
from app.dependencies import CurrentUser
from app.models.interview import InterviewMessage, InterviewQuestionBank, InterviewSession
from app.models.job import JobPosition
from app.schemas.interview import (
    InterviewMessageIn,
    InterviewMessageOut,
    InterviewSessionCreate,
    InterviewSessionOut,
)
from app.services import interview_service as iv

router = APIRouter()


def _job_dict(job):
    if not job:
        return {}
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "requirement": job.requirement,
        "skills": job.skills,
    }


def _session_out(s: InterviewSession, db: Session) -> dict:
    job = db.get(JobPosition, s.job_id) if s.job_id else None
    title = job.title if job else ""
    company = job.company if job else ""
    d = InterviewSessionOut.model_validate(s).model_dump()
    d["job_title"] = title
    d["company"] = company
    try:
        d["report"] = json.loads(s.report) if s.report else None
    except json.JSONDecodeError:
        d["report"] = s.report
    return d


@router.post("", response_model=dict)
async def create_session(payload: InterviewSessionCreate, user: CurrentUser, db: Session = Depends(get_db)):
    """创建 AI 模拟面试会话（多面试模式）。"""
    session = InterviewSession(
        user_id=user.id,
        job_id=payload.job_id,
        mode=payload.mode,
        difficulty=payload.difficulty,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    job = db.get(JobPosition, payload.job_id) if payload.job_id else None
    result = await run_graph("interview", job=_job_dict(job), mode=payload.mode, difficulty=payload.difficulty, history=[])
    q = result.get("interview_question", {})
    msg = InterviewMessage(
        session_id=session.id,
        role="interviewer",
        content=q.get("question", "请做一下自我介绍"),
        difficulty=q.get("difficulty", payload.difficulty),
    )
    db.add(msg)
    db.commit()
    return success({"session_id": session.id, "first_question": msg.content, "difficulty": msg.difficulty})


@router.get("/sessions", response_model=list[dict])
def list_sessions(user: CurrentUser, db: Session = Depends(get_db)):
    rows = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(50)
        .all()
    )
    return [_session_out(s, db) for s in rows]


@router.get("/wrong/questions", response_model=list[InterviewMessageOut])
def wrong_questions(user: CurrentUser, db: Session = Depends(get_db)):
    """面试错题集复盘。"""
    session_ids = [s.id for s in db.query(InterviewSession).filter(InterviewSession.user_id == user.id).all()]
    if not session_ids:
        return []
    return (
        db.query(InterviewMessage)
        .filter(InterviewMessage.session_id.in_(session_ids), InterviewMessage.is_wrong == 1)
        .order_by(InterviewMessage.created_at.desc())
        .all()
    )


@router.get("/{session_id}", response_model=dict)
def get_session(session_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    session = db.get(InterviewSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    return _session_out(session, db)


@router.post("/{session_id}/answer", response_model=dict)
async def answer_question(
    session_id: int,
    payload: InterviewMessageIn,
    user: CurrentUser,
    db: Session = Depends(get_db),
):
    """提交回答，AI 打分点评并动态出下一题（动态调节题目难度）。"""
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    session = db.get(InterviewSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")

    history = [
        {"role": m.role, "content": m.content}
        for m in db.query(InterviewMessage)
        .filter(InterviewMessage.session_id == session_id)
        .order_by(InterviewMessage.id)
        .all()
    ]
    history.append({"role": "user", "content": payload.content})

    job = db.get(JobPosition, session.job_id) if session.job_id else None
    result = await run_graph(
        "interview",
        job=_job_dict(job),
        mode=session.mode,
        difficulty=session.difficulty,
        history=history,
    )
    ev = result.get("interview_eval", {})
    q = result.get("interview_question", {})

    user_msg = InterviewMessage(session_id=session_id, role="user", content=payload.content)
    db.add(user_msg)

    last_interviewer = (
        db.query(InterviewMessage)
        .filter(InterviewMessage.session_id == session_id, InterviewMessage.role == "interviewer")
        .order_by(InterviewMessage.id.desc())
        .first()
    )
    if last_interviewer:
        last_interviewer.score = ev.get("score")
        last_interviewer.comment = ev.get("comment")
        last_interviewer.is_wrong = 1 if ev.get("is_wrong") else 0

    next_msg = InterviewMessage(
        session_id=session_id,
        role="interviewer",
        content=q.get("question", "下一题"),
        difficulty=q.get("difficulty", session.difficulty),
    )
    db.add(next_msg)
    session.difficulty = q.get("difficulty", session.difficulty)
    user.ai_quota -= 1
    db.commit()
    return success({
        "score": ev.get("score"),
        "comment": ev.get("comment"),
        "next_question": next_msg.content,
        "next_difficulty": next_msg.difficulty,
        "is_wrong": ev.get("is_wrong", False),
    })


@router.post("/{session_id}/finish", response_model=dict)
async def finish_session(session_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """结束面试，生成结构化面试报告。"""
    session = db.get(InterviewSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    msgs = db.query(InterviewMessage).filter(InterviewMessage.session_id == session_id).order_by(InterviewMessage.id).all()
    history = [{"role": m.role, "content": m.content} for m in msgs]
    report = await iv.generate_report(history)
    session.report = json.dumps(report, ensure_ascii=False)
    session.score = report.get("overall_score")
    session.status = "finished"
    session.finished_at = datetime.utcnow()
    db.commit()
    return success({"report": report})


@router.post("/sessions/{session_id}/rejudge", response_model=dict)
async def rejudge_session(session_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """重新评定已完成的面试会话：重新生成结构化报告。"""
    session = db.get(InterviewSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    if session.status != "finished":
        raise HTTPException(status_code=400, detail="会话尚未完成")

    msgs = db.query(InterviewMessage).filter(InterviewMessage.session_id == session_id).order_by(InterviewMessage.id).all()
    history = [{"role": m.role, "content": m.content} for m in msgs]
    report = await iv.generate_report(history)
    session.report = json.dumps(report, ensure_ascii=False)
    session.score = report.get("overall_score")
    db.commit()
    db.refresh(session)
    return success({
        "id": session.id,
        "score": session.score,
        "report": report,
        "job_title": session.job_title,
        "company": session.company,
    })


@router.get("/{session_id}/messages", response_model=list[InterviewMessageOut])
def session_messages(session_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    session = db.get(InterviewSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    return (
        db.query(InterviewMessage)
        .filter(InterviewMessage.session_id == session_id)
        .order_by(InterviewMessage.id)
        .all()
    )
