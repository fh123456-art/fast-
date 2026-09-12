"""AI 模拟面试路由:真实大模型评分 + 追问 + 报告生成"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import (
    InterviewSession, InterviewMessage, User, Job, Resume,
    InterviewQuestionBank, AiFeedback
)
from security import get_current_user
from llm import chat_json, chat, LLMError

router = APIRouter(prefix="/interview", tags=["AI模拟面试"])

MAX_ROUNDS = 8  # 最多 8 轮问答


def _parse_json(s, default):
    try:
        return json.loads(s) if s else default
    except Exception:
        return default


def _build_history(messages: list, db: Session, job: Job | None = None) -> str:
    """把已有多轮对话拼成文本上下文供大模型参考"""
    lines = []
    for m in messages:
        role = "面试官" if m.role == "assistant" else "候选人"
        lines.append(f"{role}: {m.content}")
    return "\n".join(lines)


@router.post("/sessions")
def create_session(job_id: int | None = None, resume_id: int | None = None,
                   mode: str = "技术面", db: Session = Depends(get_db),
                   current: User = Depends(get_current_user)):
    """创建面试会话,用大模型生成第一个面试问题"""
    session = InterviewSession(
        user_id=current.id, job_id=job_id, resume_id=resume_id,
        mode=mode, score=0, report="", status="进行中",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 获取岗位和简历信息(用于大模型生成贴合场景的问题)
    job = db.query(Job).filter(Job.id == job_id).first() if job_id else None
    resume = db.query(Resume).filter(Resume.id == resume_id).first() if resume_id else None
    resume_info = ""
    if resume and resume.parsed_content:
        try:
            resume_info = json.dumps(json.loads(resume.parsed_content), ensure_ascii=False)
        except Exception:
            resume_info = resume.content or ""

    # 用大模型生成开场白 + 第一个问题
    system = (
        "你是一名专业的校招面试官,正在进行模拟面试。"
        "请根据岗位信息和候选人简历,生成简短开场白和第一个面试问题。"
        "只返回面试官说的话(开场白+问题),不要有额外格式,200字以内。"
    )
    user_prompt = f"面试模式: {mode}\n"
    if job:
        user_prompt += f"岗位: {job.title} ({job.company})\n岗位要求: {job.requirements}\n"
    if resume_info:
        user_prompt += f"候选人简历: {resume_info}\n"

    try:
        q_content = chat(system, user_prompt, temperature=0.8)
    except LLMError:
        # 兜底:从题库随机取一题
        q = db.query(InterviewQuestionBank).order_by(func.rand()).first()
        q_content = q.question if q else "请简单介绍一下你自己,以及你为什么对这份工作感兴趣?"

    msg = InterviewMessage(session_id=session.id, role="assistant", content=q_content)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "sessionId": session.id,
        "mode": session.mode,
        "status": session.status,
        "messageId": msg.id,
        "role": "assistant",
        "content": q_content,
        "questionsAsked": 1,
    }


@router.post("/sessions/{session_id}/message")
def send_message(session_id: int, content: str = Body(..., embed=True),
                 db: Session = Depends(get_db),
                 current: User = Depends(get_current_user)):
    """发送面试回答,AI 真实评分+点评+追问下一题"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="面试会话不存在")
    if session.status != "进行中":
        raise HTTPException(status_code=400, detail="面试已结束")

    # 保存用户消息
    user_msg = InterviewMessage(session_id=session_id, role="user", content=content)
    db.add(user_msg)
    db.commit()

    # 统计已回答轮数(user 消息数)
    user_msgs = db.query(InterviewMessage).filter(
        InterviewMessage.session_id == session_id,
        InterviewMessage.role == "user"
    ).all()
    round_num = len(user_msgs)

    # 获取岗位和简历上下文
    job = db.query(Job).filter(Job.id == session.job_id).first() if session.job_id else None
    resume = db.query(Resume).filter(Resume.id == session.resume_id).first() if session.resume_id else None
    resume_info = ""
    if resume and resume.parsed_content:
        try:
            resume_info = json.dumps(json.loads(resume.parsed_content), ensure_ascii=False)
        except Exception:
            resume_info = resume.content or ""

    # 拼接对话历史(最近 10 条,避免 token 过多)
    all_msgs = db.query(InterviewMessage).filter(
        InterviewMessage.session_id == session_id
    ).order_by(InterviewMessage.id.asc()).all()
    history = _build_history(all_msgs[-10:], db, job)

    # === 判断是否该结束面试 ===
    should_end = round_num >= MAX_ROUNDS

    if should_end:
        # === 面试结束:生成报告 ===
        session.status = "已结束"
        session.ended_at = datetime.now()

        system = (
            "你是一名资深校招面试官。面试已结束,请根据完整对话记录,生成结构化面试评估报告。"
            "严格以 JSON 格式返回,字段如下:\n"
            '- "grade": 等级("A"/"B"/"C"/"D")\n'
            '- "totalScore": 综合评分(0-100,一位小数)\n'
            '- "questionsAnswered": 回答问题数(整数)\n'
            '- "mode": 面试模式\n'
            '- "strengths": 表现亮点列表(字符串数组,3条)\n'
            '- "weaknesses": 待改进点列表(字符串数组,3条)\n'
            '- "suggestions": 提升建议列表(字符串数组,3条)\n'
            "评分标准:A(85+优秀) B(70-84良好) C(60-69及格) D(<60不及格)。只返回 JSON。"
        )
        user_prompt = f"面试模式: {session.mode}\n岗位: {job.title if job else '通用'}\n"
        if resume_info:
            user_prompt += f"候选人简历: {resume_info[:500]}\n"
        user_prompt += f"完整对话记录:\n{_build_history(all_msgs, db, job)}"

        try:
            report = chat_json(system, user_prompt)
        except LLMError:
            avg = sum((m.score or 0) for m in user_msgs) / max(1, len(user_msgs))
            grade = "A" if avg >= 85 else "B" if avg >= 70 else "C" if avg >= 60 else "D"
            report = {
                "grade": grade, "totalScore": round(avg, 1),
                "questionsAnswered": len(user_msgs), "mode": session.mode,
                "strengths": ["沟通表达基本流畅", "态度端正"],
                "weaknesses": ["回答可更深入", "缺少量化数据"],
                "suggestions": ["多做准备", "练习 STAR 法则回答"],
            }

        session.score = report.get("totalScore", 0)
        session.report = json.dumps(report, ensure_ascii=False)

        # 给最后一题也打个分(兜底)
        if not user_msg.score:
            user_msg.score = report.get("totalScore", 70)
            user_msg.suggestion = "面试已结束,综合报告已生成。"
        db.commit()

        return {
            "ended": True,
            "score": session.score,
            "report": report,
            "questionsAsked": len(user_msgs),
        }

    # === 未结束:大模型评分 + 点评 + 追问下一题 ===
    system = (
        "你是一名专业的校招面试官,正在进行模拟面试。"
        "请根据对话历史和候选人的最新回答,完成两件事:\n"
        "1. 对候选人的最新回答打分并给出简短点评\n"
        "2. 追问一个相关的下一个面试问题\n\n"
        "严格以 JSON 格式返回,字段如下:\n"
        '- "score": 分数(0-100 整数,根据回答质量)\n'
        '- "suggestion": 简短点评(50字以内,指出优缺点)\n'
        '- "nextQuestion": 追问的下一个面试问题(50字以内)\n'
        "评分参考:回答详实有条理85+,基本到位70+,过于简短或偏题60+。只返回 JSON。"
    )
    user_prompt = f"面试模式: {session.mode}\n"
    if job:
        user_prompt += f"岗位: {job.title} ({job.company})\n"
    if resume_info:
        user_prompt += f"候选人简历: {resume_info[:500]}\n"
    user_prompt += f"对话历史:\n{history}\n\n候选人的最新回答需要你打分并追问。"

    try:
        result = chat_json(system, user_prompt, temperature=0.5)
    except LLMError as e:
        # 兜底:简单评分 + 题库追问
        result = {
            "score": 70,
            "suggestion": "回答已记录,继续下一题。",
            "nextQuestion": "你还有什么想补充的吗?",
        }

    # 兜底处理
    score = result.get("score", 70)
    if not isinstance(score, (int, float)):
        try:
            score = int(score)
        except Exception:
            score = 70
    score = max(0, min(100, int(score)))

    suggestion = result.get("suggestion", "回答已记录。")
    next_q = result.get("nextQuestion", "你还有什么想补充的吗?")

    # 更新用户消息的评分
    db.refresh(user_msg)
    user_msg.score = score
    user_msg.suggestion = suggestion
    db.commit()

    # 保存 AI 追问消息
    ai_msg = InterviewMessage(session_id=session_id, role="assistant", content=next_q)
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "ended": False,
        "score": score,
        "suggestion": suggestion,
        "messageId": ai_msg.id,
        "role": "assistant",
        "content": next_q,
        "questionsAsked": round_num,
    }


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current.id
    ).order_by(InterviewSession.started_at.desc()).all()
    result = []
    for s in sessions:
        job = db.query(Job).filter(Job.id == s.job_id).first() if s.job_id else None
        result.append({
            "id": s.id, "mode": s.mode, "status": s.status,
            "score": s.score or 0,
            "jobTitle": job.title if job else "",
            "startedAt": s.started_at.strftime("%Y-%m-%d %H:%M") if s.started_at else "",
        })
    return result


@router.get("/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db),
                current: User = Depends(get_current_user)):
    s = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current.id
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="不存在")
    messages = db.query(InterviewMessage).filter(
        InterviewMessage.session_id == session_id
    ).order_by(InterviewMessage.id.asc()).all()
    job = db.query(Job).filter(Job.id == s.job_id).first() if s.job_id else None
    report = None
    if s.report:
        try:
            report = json.loads(s.report)
        except Exception:
            report = None
    return {
        "id": s.id, "mode": s.mode, "status": s.status, "score": s.score or 0,
        "jobTitle": job.title if job else "",
        "startedAt": s.started_at.strftime("%Y-%m-%d %H:%M") if s.started_at else "",
        "endedAt": s.ended_at.strftime("%Y-%m-%d %H:%M") if s.ended_at else "",
        "report": report,
        "messages": [{
            "id": m.id, "role": m.role, "content": m.content,
            "score": m.score or 0, "suggestion": m.suggestion or "",
            "time": m.created_at.strftime("%H:%M") if m.created_at else "",
        } for m in messages],
    }


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db),
                   current: User = Depends(get_current_user)):
    s = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current.id
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="不存在")
    db.query(InterviewMessage).filter(InterviewMessage.session_id == session_id).delete()
    db.delete(s)
    db.commit()
    return {"msg": "删除成功"}
