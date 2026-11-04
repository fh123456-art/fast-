"""AI 笔试刷题路由：出题、答题判分、错题收藏、岗位笔试会话。"""
from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.exceptions import success
from app.database import get_db
from app.dependencies import CurrentUser
from app.models.exam import ExamQuestion, ExamSession, ExamSessionQuestion, UserExamRecord
from app.models.job import JobPosition
from app.schemas.exam import ExamAnswerIn, ExamQuestionOut, UserExamRecordOut
from app.services.exam_generator import batch_generate

router = APIRouter()


class ExamSessionCreate(BaseModel):
    job_id: int | None = None
    difficulty: str = "medium"
    count: int = 5


def _q_to_dict(q: ExamQuestion) -> dict:
    d = ExamQuestionOut.model_validate(q).model_dump()
    try:
        d["options"] = json.loads(q.options) if q.options else []
    except json.JSONDecodeError:
        d["options"] = q.options
    d["answer"] = q.answer
    d["analysis"] = q.analysis
    return d


def _job_dict(job) -> dict:
    if not job:
        return {}
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "requirement": job.requirement,
        "skills": getattr(job, "skills", None),
    }


def _session_out(s: ExamSession, db: Session) -> dict:
    job = db.get(JobPosition, s.job_id) if s.job_id else None
    d = {
        "id": s.id,
        "user_id": s.user_id,
        "job_id": s.job_id,
        "difficulty": s.difficulty,
        "total_count": s.total_count,
        "correct_count": s.correct_count,
        "score": s.score,
        "status": s.status,
        "job_title": job.title if job else "",
        "company": job.company if job else "",
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "finished_at": s.finished_at.isoformat() if s.finished_at else None,
    }
    try:
        d["report"] = json.loads(s.report) if s.report else None
    except json.JSONDecodeError:
        d["report"] = None
    return d


def _session_detail(s: ExamSession, db: Session) -> dict:
    d = _session_out(s, db)
    questions = db.query(ExamSessionQuestion).filter(
        ExamSessionQuestion.session_id == s.id
    ).order_by(ExamSessionQuestion.seq).all()
    items = []
    for sq in questions:
        q = db.get(ExamQuestion, sq.question_id)
        if q:
            item = _q_to_dict(q)
            item["seq"] = sq.seq
            item["user_answer"] = sq.user_answer
            item["is_correct"] = bool(sq.is_correct)
            item["session_q_id"] = sq.id
            items.append(item)
    d["questions"] = items
    return d


# ===== 笔试会话（岗位批量出题）=====

@router.post("/sessions", response_model=dict)
async def create_session(payload: ExamSessionCreate, user: CurrentUser, db: Session = Depends(get_db)):
    """创建岗位笔试会话：AI 一次性生成 N 道题。"""
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    job = db.get(JobPosition, payload.job_id) if payload.job_id else None
    job_d = _job_dict(job)
    count = max(1, min(10, payload.count))
    raw_list = await batch_generate(job_d, count=count, difficulty=payload.difficulty)
    if not raw_list:
        raise HTTPException(status_code=500, detail="AI 出题失败，请重试")

    session = ExamSession(
        user_id=user.id,
        job_id=payload.job_id,
        difficulty=payload.difficulty,
        total_count=0,
    )
    db.add(session)
    user.ai_quota -= 1  # 一次批量生成扣一次
    db.flush()

    seq = 0
    for raw in raw_list:
        if not isinstance(raw, dict) or not raw.get("question"):
            continue
        eq = ExamQuestion(
            category=raw.get("category"),
            question_type=raw.get("question_type", "qa"),
            question=raw.get("question", ""),
            options=json.dumps(raw.get("options", []), ensure_ascii=False),
            answer=raw.get("answer", ""),
            analysis=raw.get("analysis", ""),
            difficulty=raw.get("difficulty", payload.difficulty),
        )
        db.add(eq)
        db.flush()
        seq += 1
        sq = ExamSessionQuestion(session_id=session.id, question_id=eq.id, seq=seq)
        db.add(sq)

    session.total_count = seq
    db.commit()
    db.refresh(session)
    return _session_detail(session, db)


@router.get("/sessions", response_model=list[dict])
def list_sessions(user: CurrentUser, db: Session = Depends(get_db)):
    """列出我的笔试会话（只返回有效完成的 + 进行中的）。"""
    sessions = (
        db.query(ExamSession)
        .filter(ExamSession.user_id == user.id)
        .order_by(ExamSession.created_at.desc())
        .all()
    )
    return [_session_out(s, db) for s in sessions]


@router.get("/sessions/{session_id}", response_model=dict)
def get_session(session_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    s = db.get(ExamSession, session_id)
    if not s or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    return _session_detail(s, db)


@router.post("/sessions/{session_id}/submit", response_model=dict)
def submit_answer(session_id: int, payload: ExamAnswerIn, user: CurrentUser, db: Session = Depends(get_db)):
    """提交一道题的答案（按当前会话内未答题的最小题号）。"""
    s = db.get(ExamSession, session_id)
    if not s or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    if s.status != "ongoing":
        raise HTTPException(status_code=400, detail="会话已结束")
    sq = (
        db.query(ExamSessionQuestion)
        .filter(
            ExamSessionQuestion.session_id == session_id,
            ExamSessionQuestion.user_answer.is_(None),
        )
        .order_by(ExamSessionQuestion.seq)
        .first()
    )
    if not sq:
        raise HTTPException(status_code=400, detail="所有题目已答完")
    q = db.get(ExamQuestion, sq.question_id)
    if not q:
        raise HTTPException(status_code=500, detail="题目丢失")

    user_ans = payload.user_answer.strip()
    ref_ans = (q.answer or "").strip()
    sq.user_answer = payload.user_answer

    question_type = q.question_type or "single"
    if question_type in ("single", "multiple"):
        correct = _check_option_match(user_ans, ref_ans, q.options)
        sq.is_correct = 1 if correct else 0
        if correct:
            s.correct_count += 1
    else:
        sq.is_correct = 2

    db.commit()
    db.refresh(sq)
    is_correct_val = sq.is_correct if sq.is_correct != 2 else None
    return success({
        "seq": sq.seq,
        "is_correct": is_correct_val,
        "answer": q.answer,
        "analysis": q.analysis,
        "total": s.total_count,
        "correct": s.correct_count,
        "answered": db.query(ExamSessionQuestion).filter(
            ExamSessionQuestion.session_id == session_id,
            ExamSessionQuestion.user_answer.isnot(None),
        ).count(),
    })


def _check_option_match(user_ans: str, ref_ans: str, raw_options: str | None) -> bool:
    """智能比对客观题答案：兼容字母格式（A,B）和文本格式（选项内容本身）。"""
    user_ans = (user_ans or "").strip()
    ref_ans = (ref_ans or "").strip()

    if not user_ans or not ref_ans:
        return False
    if user_ans == ref_ans:
        return True

    options = []
    if raw_options:
        try:
            options = json.loads(raw_options) if isinstance(raw_options, str) else list(raw_options)
        except (json.JSONDecodeError, TypeError):
            options = []

    def _parse(raw: str) -> set[str]:
        parts = [p.strip() for p in raw.replace("，", ",").split(",") if p.strip()]
        return set(parts)

    def _to_texts(raw_set: set[str]) -> set[str]:
        """把字母集合转换成对应选项文本集合；如果不是字母则原样返回。"""
        if not options:
            return raw_set
        all_single_letters = all(len(p) == 1 and p.isalpha() for p in raw_set)
        if not all_single_letters:
            return raw_set
        letter_to_text = {}
        for i, opt in enumerate(options):
            if opt is None:
                continue
            letter_to_text[chr(65 + i)] = str(opt).strip()
        result = set()
        for letter in raw_set:
            t = letter_to_text.get(letter.upper(), "")
            if t:
                result.add(t)
        return result or raw_set

    user_set = _parse(user_ans)
    ref_set = _parse(ref_ans)

    if user_set == ref_set:
        return True

    user_texts = _to_texts(user_set)
    ref_texts = _to_texts(ref_set)

    if user_texts == ref_texts and user_texts:
        return True

    return False


async def _ai_judge(session: ExamSession, pending: list, db: Session):
    """用 AI 批量评判 qa / code 题型的答案，写回 is_correct（0/1）和 AI 分析。"""
    from app.services.llm_client import chat_complete, parse_json_output

    items = []
    for sq in pending:
        q = db.get(ExamQuestion, sq.question_id)
        if q and sq.user_answer:
            items.append({
                "seq": sq.seq,
                "type": q.question_type,
                "question": q.question,
                "reference": q.answer or "",
                "analysis": q.analysis or "",
                "user_answer": sq.user_answer,
                "sq_obj": sq,
            })

    if not items:
        return

    sys_prompt = (
        "你是一位专业的技术面试官，需要评判求职者的笔试作答。\n"
        "评判标准：\n"
        "- 如果是 qa（简答题/论述题）：看核心要点是否覆盖、逻辑是否清晰、有没有明显错误观点\n"
        "- 如果是 code（代码题）：看语法是否正确、逻辑是否正确、能否处理边界情况\n"
        "- 不需要逐字与参考答案相同，意思对、要点到位即可判对\n"
        "- 有小瑕疵但主体正确 → 判对（is_correct: 1）\n"
        "- 核心概念错误或完全不相关 → 判错（is_correct: 0）\n"
        "请以 JSON 数组返回每题评判结果，格式："
        '[{"seq": 题号数字, "is_correct": 0或1, "analysis": "简短评语"}]'
    )

    user_parts = []
    for it in items:
        user_parts.append(
            f"--- 第 {it['seq']} 题 [{it['type']}] ---\n"
            f"题目：{it['question']}\n"
            f"参考答案：{it['reference']}\n"
            f"参考答案解析：{it['analysis']}\n"
            f"求职者作答：{it['user_answer']}"
        )
    user_prompt = "\n\n".join(user_parts)

    try:
        raw = await chat_complete(sys_prompt, user_prompt, temperature=0.1, json_mode=True)
        result = parse_json_output(raw)
        judge_list = result.get("results") if isinstance(result, dict) else None
        if not judge_list and isinstance(result, list):
            judge_list = result
    except Exception:
        judge_list = None

    judged_seqs: set[int] = set()
    if judge_list and isinstance(judge_list, list):
        for entry in judge_list:
            try:
                seq = int(entry.get("seq", -1))
                correct = int(entry.get("is_correct", 0))
                comment = entry.get("analysis", "") or ""
                target = next((it for it in items if it["seq"] == seq), None)
                if target:
                    target["sq_obj"].is_correct = 1 if correct == 1 else 0
                    judged_seqs.add(seq)
                    if comment:
                        target["sq_obj"].user_answer = (
                            target["sq_obj"].user_answer + f"\n\n【AI 评判】{comment}"
                        )
            except (ValueError, TypeError):
                continue

    for it in items:
        if it["seq"] not in judged_seqs:
            it["sq_obj"].is_correct = 0

    db.commit()


@router.post("/sessions/{session_id}/finish", response_model=dict)
async def finish_session(session_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """结束笔试，AI 智能判分 + 生成结构化报告。"""
    s = db.get(ExamSession, session_id)
    if not s or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    if s.status == "finished":
        return _session_detail(s, db)

    pending = db.query(ExamSessionQuestion).filter(
        ExamSessionQuestion.session_id == session_id,
        ExamSessionQuestion.is_correct == 2,
    ).all()

    if pending:
        await _ai_judge(s, pending, db)

    s.status = "finished"
    s.finished_at = datetime.now()
    correct_all = db.query(ExamSessionQuestion).filter(
        ExamSessionQuestion.session_id == session_id,
        ExamSessionQuestion.is_correct == 1,
    ).count()
    s.correct_count = correct_all
    s.score = int(round(correct_all / s.total_count * 100)) if s.total_count > 0 else 0

    wrong_list = db.query(ExamSessionQuestion).filter(
        ExamSessionQuestion.session_id == session_id,
        ExamSessionQuestion.is_correct == 0,
    ).order_by(ExamSessionQuestion.seq).all()

    weaknesses = []
    for sq in wrong_list[:5]:
        q = db.get(ExamQuestion, sq.question_id)
        if q:
            weaknesses.append({
                "seq": sq.seq,
                "category": q.category,
                "question": q.question[:120],
                "user_answer": sq.user_answer,
                "reference": q.answer,
            })

    if s.score >= 85:
        summary = "表现优秀！岗位核心知识掌握扎实，准确率高。"
        level = "优秀"
    elif s.score >= 70:
        summary = "整体良好，大部分知识点掌握，少量细节需要巩固。"
        level = "良好"
    elif s.score >= 55:
        summary = "及格水平，存在明显知识盲区，建议针对性复习。"
        level = "及格"
    else:
        summary = "基础较薄弱，建议系统学习岗位核心知识后再挑战。"
        level = "需加强"

    report = {
        "overall_score": s.score,
        "level": level,
        "summary": summary,
        "correct_rate": f"{s.correct_count}/{s.total_count}",
        "accuracy_pct": round(s.correct_count / s.total_count * 100, 1) if s.total_count else 0,
        "weaknesses": weaknesses,
        "suggestions": [
            "针对错题中的薄弱点进行专项练习",
            "深入学习岗位 JD 中要求的核心技能",
            "多做同类岗位真题，提升答题速度和准确率",
        ],
    }
    s.report = json.dumps(report, ensure_ascii=False)
    db.commit()
    db.refresh(s)
    return _session_detail(s, db)


@router.post("/sessions/{session_id}/rejudge", response_model=dict)
async def rejudge_session(session_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """重新评定已完成的笔试会话：重置 qa/code → AI 重判 → 重算分数报告。"""
    s = db.get(ExamSession, session_id)
    if not s or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="会话不存在")
    if s.status != "finished":
        raise HTTPException(status_code=400, detail="会话尚未完成")

    sqs = db.query(ExamSessionQuestion).filter(
        ExamSessionQuestion.session_id == session_id,
    ).all()

    pending = []
    for sq in sqs:
        q = db.get(ExamQuestion, sq.question_id)
        if not q:
            continue
        if q.question_type in ("single", "multiple"):
            correct = _check_option_match(sq.user_answer or "", q.answer or "", q.options)
            sq.is_correct = 1 if correct else 0
        elif q.question_type in ("qa", "code") and sq.user_answer:
            sq.is_correct = 2
            if "【AI 评判】" in (sq.user_answer or ""):
                sq.user_answer = sq.user_answer.split("【AI 评判】")[0].rstrip()
            pending.append(sq)

    if pending:
        await _ai_judge(s, pending, db)

    correct_all = sum(1 for sq in sqs if sq.is_correct == 1)
    s.correct_count = correct_all
    s.score = int(round(correct_all / s.total_count * 100)) if s.total_count > 0 else 0

    wrong_list = [sq for sq in sqs if sq.is_correct == 0]
    wrong_list.sort(key=lambda x: x.seq)

    weaknesses = []
    for sq in wrong_list[:5]:
        q = db.get(ExamQuestion, sq.question_id)
        if q:
            weaknesses.append({
                "seq": sq.seq,
                "category": q.category,
                "question": q.question[:120],
                "user_answer": sq.user_answer,
                "reference": q.answer,
            })

    if s.score >= 85:
        summary = "表现优秀！岗位核心知识掌握扎实，准确率高。"
        level = "优秀"
    elif s.score >= 70:
        summary = "整体良好，大部分知识点掌握，少量细节需要巩固。"
        level = "良好"
    elif s.score >= 55:
        summary = "及格水平，存在明显知识盲区，建议针对性复习。"
        level = "及格"
    else:
        summary = "基础较薄弱，建议系统学习岗位核心知识后再挑战。"
        level = "需加强"

    report = {
        "overall_score": s.score,
        "level": level,
        "summary": summary,
        "correct_rate": f"{s.correct_count}/{s.total_count}",
        "accuracy_pct": round(s.correct_count / s.total_count * 100, 1) if s.total_count else 0,
        "weaknesses": weaknesses,
        "suggestions": [
            "针对错题中的薄弱点进行专项练习",
            "深入学习岗位 JD 中要求的核心技能",
            "多做同类岗位真题，提升答题速度和准确率",
        ],
    }
    s.report = json.dumps(report, ensure_ascii=False)
    db.commit()
    db.refresh(s)
    return _session_detail(s, db)


@router.post("/generate", response_model=dict)
async def generate_question(
    job_id: int | None = Query(None),
    category: str | None = Query(None),
    user: CurrentUser = None,
    db: Session = Depends(get_db),
):
    """AI 笔试出题：根据岗位生成练习题。"""
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    job = db.get(JobPosition, job_id) if job_id else None
    job_dict = {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "requirement": job.requirement,
    } if job else {}
    result = await run_graph("exam", job=job_dict, category=category)
    q = result.get("exam_question", {})
    # 存入题库
    eq = ExamQuestion(
        category=q.get("category", category),
        question_type=q.get("question_type", "qa"),
        question=q.get("question", ""),
        options=json.dumps(q.get("options", []), ensure_ascii=False),
        answer=q.get("answer", ""),
        analysis=q.get("analysis", ""),
        difficulty=q.get("difficulty", "medium"),
    )
    db.add(eq)
    user.ai_quota -= 1
    db.commit()
    db.refresh(eq)
    return _q_to_dict(eq)


@router.get("/questions", response_model=list[dict])
def list_questions(
    category: str | None = None,
    difficulty: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(ExamQuestion)
    if category:
        q = q.filter(ExamQuestion.category == category)
    if difficulty:
        q = q.filter(ExamQuestion.difficulty == difficulty)
    return [_q_to_dict(i) for i in q.order_by(ExamQuestion.id.desc()).limit(100).all()]


@router.post("/questions/{question_id}/answer", response_model=dict)
def answer_question(
    question_id: int,
    payload: ExamAnswerIn,
    user: CurrentUser,
    db: Session = Depends(get_db),
):
    """答题判分。"""
    q = db.get(ExamQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")
    correct = payload.user_answer.strip() == (q.answer or "").strip()
    record = UserExamRecord(
        user_id=user.id,
        question_id=question_id,
        user_answer=payload.user_answer,
        is_correct=1 if correct else 0,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return success({
        "is_correct": correct,
        "answer": q.answer,
        "analysis": q.analysis,
        "record_id": record.id,
    })


@router.post("/records/{record_id}/collect", response_model=dict)
def toggle_collect(record_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """错题收藏。"""
    record = db.get(UserExamRecord, record_id)
    if not record or record.user_id != user.id:
        raise HTTPException(status_code=404, detail="记录不存在")
    record.is_collected = 0 if record.is_collected else 1
    db.commit()
    return success({"is_collected": bool(record.is_collected)})


@router.get("/wrong", response_model=list[dict])
def my_wrong_questions(user: CurrentUser, db: Session = Depends(get_db)):
    """错题集复盘（答错或收藏的题）。"""
    records = (
        db.query(UserExamRecord)
        .filter(UserExamRecord.user_id == user.id, UserExamRecord.is_correct == 0)
        .order_by(UserExamRecord.created_at.desc())
        .all()
    )
    out = []
    for r in records:
        q = db.get(ExamQuestion, r.question_id)
        if q:
            item = _q_to_dict(q)
            item["user_answer"] = r.user_answer
            out.append(item)
    return out
