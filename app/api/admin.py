"""平台管理员路由：用户/企业/岗位审核、Prompt 模板、题库维护、AI 质量监控、配额、统计、公告、日志。"""
from __future__ import annotations

import io
import json
from datetime import datetime, timedelta

from pathlib import Path

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import cast, Date, func, or_
from sqlalchemy.orm import Session

from app.core.exceptions import success
from app.database import get_db
from app.dependencies import require_admin
from app.models.ai import AiBadCase, AiFeedback, AiPromptTemplate
from app.models.exam import ExamQuestion, ExamSession, ExamSessionQuestion, UserExamRecord
from app.models.interview import InterviewMessage, InterviewQuestionBank, InterviewSession
from app.models.job import JobApply, JobPosition
from app.models.resume import Resume
from app.models.review import Review
from app.models.system import AdminOperationLog, SystemMessage
from app.models.user import Enterprise, User
from app.schemas.ai import AiPromptTemplateOut, SystemMessageCreate, SystemMessageOut

router = APIRouter(dependencies=[Depends(require_admin)])


def log_op(db: Session, admin_id: int, action: str, target: str | None = None, detail: dict | None = None):
    db.add(AdminOperationLog(admin_id=admin_id, action=action, target=target, detail=json.dumps(detail or {}, ensure_ascii=False)))
    db.commit()


# ============ 用户管理：学生账号启用/禁用，简历审核 ============
@router.get("/users", response_model=list[dict])
def list_users(keyword: str | None = None, db: Session = Depends(get_db)):
    q = db.query(User)
    if keyword:
        q = q.filter(User.username.like(f"%{keyword}%"))
    return [
        {
            "id": u.id, "username": u.username, "real_name": u.real_name, "school": u.school,
            "major": u.major, "role": u.role, "is_active": u.is_active, "ai_quota": u.ai_quota,
            "resume_limit": u.resume_limit, "created_at": u.created_at,
        }
        for u in q.all()
    ]


@router.put("/users/{user_id}/toggle", response_model=dict)
def toggle_user(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "用户不存在")
    u.is_active = not u.is_active
    log_op(db, admin.id, "toggle_user", str(user_id), {"is_active": u.is_active})
    return success({"is_active": u.is_active})


@router.put("/users/{user_id}/quota", response_model=dict)
def set_quota(user_id: int, ai_quota: int = Query(..., ge=0), resume_limit: int = Query(..., ge=1), admin=Depends(require_admin), db: Session = Depends(get_db)):
    """用户配额管控（AI 调用次数、简历上限）。"""
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "用户不存在")
    u.ai_quota = ai_quota
    u.resume_limit = resume_limit
    log_op(db, admin.id, "set_quota", str(user_id), {"ai_quota": ai_quota, "resume_limit": resume_limit})
    db.commit()
    return success()


@router.get("/resumes/audit", response_model=list[dict])
def list_resumes_for_audit(status: str | None = None, keyword: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Resume, User).outerjoin(User, User.id == Resume.user_id)
    if status:
        q = q.filter(Resume.status == status)
    if keyword:
        q = q.filter(or_(Resume.title.ilike(f"%{keyword}%"), User.username.ilike(f"%{keyword}%"), User.real_name.ilike(f"%{keyword}%")))
    rows = q.order_by(Resume.created_at.desc()).all()
    out = []
    for r, u in rows:
        summary = ""
        try:
            c = json.loads(r.content) if r.content else {}
            summary = str(c.get("summary") or c.get("objective") or "")[:60]
        except Exception:
            pass
        out.append({
            "id": r.id,
            "user_id": r.user_id,
            "username": u.username if u else "",
            "real_name": u.real_name if u else "",
            "school": u.school if u else "",
            "major": u.major if u else "",
            "title": r.title,
            "version": r.version,
            "is_default": bool(r.is_default),
            "status": r.status,
            "summary": summary,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        })
    return out


@router.get("/resumes/{resume_id}", response_model=dict)
def admin_get_resume(resume_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.services.resume_parser import normalize_resume
    from sqlalchemy.orm import joinedload

    r = db.get(Resume, resume_id)
    if not r:
        raise HTTPException(404, "简历不存在")
    u = db.query(User).filter(User.id == r.user_id).first()
    try:
        parsed = json.loads(r.content) if r.content else {}
    except json.JSONDecodeError:
        parsed = {}
    try:
        normalized = normalize_resume(parsed) if parsed else {}
    except Exception:
        normalized = parsed
    return {
        "id": r.id,
        "user_id": r.user_id,
        "username": u.username if u else "",
        "real_name": u.real_name if u else "",
        "school": u.school if u else "",
        "major": u.major if u else "",
        "phone": u.phone if u else "",
        "title": r.title,
        "version": r.version,
        "is_default": bool(r.is_default),
        "status": r.status,
        "source_file": r.source_file,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "content": normalized or parsed,
        "raw_text": r.raw_text or "",
    }


@router.put("/resumes/{resume_id}/audit", response_model=dict)
def audit_resume(resume_id: int, status: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = db.get(Resume, resume_id)
    if not r:
        raise HTTPException(404, "简历不存在")
    r.status = status
    log_op(db, admin.id, "audit_resume", str(resume_id), {"status": status})
    db.commit()
    return success()


@router.get("/resumes/{resume_id}/source")
def admin_download_resume_source(resume_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.config import settings

    r = db.get(Resume, resume_id)
    if not r:
        raise HTTPException(404, "简历不存在")
    if not r.source_file:
        raise HTTPException(404, "该简历没有上传源文件")
    file_path = Path(settings.UPLOAD_DIR).parent / r.source_file
    if not file_path.exists():
        raise HTTPException(404, "源文件已丢失")
    suffix = file_path.suffix.lower()
    media = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".txt": "text/plain",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(suffix, "application/octet-stream")
    return FileResponse(str(file_path), media_type=media, filename=(r.title or "resume") + suffix)


# ============ 企业账号审核 ============
@router.get("/enterprises", response_model=list[dict])
def list_enterprises(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Enterprise)
    if status:
        q = q.filter(Enterprise.status == status)
    return [
        {"id": e.id, "username": e.username, "company_name": e.company_name, "industry": e.industry, "status": e.status or "pending", "created_at": e.created_at}
        for e in q.all()
    ]


@router.post("/enterprises", response_model=dict)
def create_enterprise(
    username: str,
    password: str,
    company_name: str,
    contact_name: str | None = None,
    contact_phone: str | None = None,
    industry: str | None = None,
    intro: str | None = None,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.utils.security import hash_password
    if db.query(Enterprise).filter(Enterprise.username == username).first():
        raise HTTPException(400, "用户名已存在")
    ent = Enterprise(
        username=username,
        password_hash=hash_password(password),
        company_name=company_name,
        contact_name=contact_name,
        contact_phone=contact_phone,
        industry=industry,
        intro=intro,
        role="enterprise",
        status="pending",
        is_active=True,
    )
    db.add(ent)
    db.commit()
    db.refresh(ent)
    log_op(db, admin.id, "create_enterprise", str(ent.id), {"username": username, "company": company_name})
    return success({"id": ent.id, "status": "pending"})


@router.put("/enterprises/{ent_id}/audit", response_model=dict)
def audit_enterprise(ent_id: int, status: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    e = db.get(Enterprise, ent_id)
    if not e:
        raise HTTPException(404, "企业不存在")
    e.status = status
    log_op(db, admin.id, "audit_enterprise", str(ent_id), {"status": status})
    db.commit()
    return success()


# ============ 岗位审核 / 违规下架 ============
@router.get("/jobs/audit", response_model=list[dict])
def list_jobs_audit(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(JobPosition)
    if status:
        q = q.filter(JobPosition.status == status)
    rows = q.order_by(JobPosition.id.desc()).all()
    return [
        {"id": j.id, "title": j.title, "company": j.company, "status": j.status or "approved", "created_at": j.created_at}
        for j in rows
    ]


@router.post("/jobs", response_model=dict)
def create_job(
    title: str,
    company: str,
    enterprise_id: int | None = None,
    city: str | None = None,
    salary_min: int | None = None,
    salary_max: int | None = None,
    experience: str | None = None,
    education: str | None = None,
    job_type: str | None = None,
    category: str | None = None,
    description: str | None = None,
    requirement: str | None = None,
    skills: str | None = None,
    status: str = "pending",
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not enterprise_id:
        ent = db.query(Enterprise).filter(Enterprise.company_name == company).first()
        if ent:
            enterprise_id = ent.id
    j = JobPosition(
        title=title, company=company, enterprise_id=enterprise_id or 0,
        city=city, salary_min=salary_min, salary_max=salary_max,
        experience=experience, education=education, job_type=job_type,
        category=category, description=description, requirement=requirement,
        skills=skills, status=status,
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    log_op(db, admin.id, "create_job", str(j.id), {"title": title, "company": company})
    return success({"id": j.id, "status": j.status})


@router.put("/jobs/{job_id}/audit", response_model=dict)
def audit_job(job_id: int, status: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    j = db.get(JobPosition, job_id)
    if not j:
        raise HTTPException(404, "岗位不存在")
    j.status = status
    log_op(db, admin.id, "audit_job", str(job_id), {"status": status})
    db.commit()
    return success()


# ============ AI 智能体配置：多套 Prompt 模板管理 ============
@router.get("/prompts", response_model=list[AiPromptTemplateOut])
def list_prompts(agent_name: str | None = None, db: Session = Depends(get_db)):
    q = db.query(AiPromptTemplate)
    if agent_name:
        q = q.filter(AiPromptTemplate.agent_name == agent_name)
    return q.all()


@router.post("/prompts", response_model=dict)
def create_prompt(agent_name: str, name: str, prompt: str, version: str = "v1", admin=Depends(require_admin), db: Session = Depends(get_db)):
    p = AiPromptTemplate(agent_name=agent_name, name=name, prompt=prompt, version=version)
    db.add(p)
    log_op(db, admin.id, "create_prompt", name, {"agent": agent_name})
    db.commit()
    return success({"id": p.id})


@router.put("/prompts/{pid}", response_model=dict)
def update_prompt(pid: int, prompt: str, is_active: bool = True, admin=Depends(require_admin), db: Session = Depends(get_db)):
    p = db.get(AiPromptTemplate, pid)
    if not p:
        raise HTTPException(404, "模板不存在")
    p.prompt = prompt
    p.is_active = 1 if is_active else 0
    db.commit()
    return success()


# ============ 面试题库、笔试题库维护 ============
@router.get("/interview-bank", response_model=list[dict])
def list_interview_bank(category: str | None = None, db: Session = Depends(get_db)):
    q = db.query(InterviewQuestionBank)
    if category:
        q = q.filter(InterviewQuestionBank.category == category)
    return [{"id": i.id, "category": i.category, "question": i.question, "difficulty": i.difficulty} for i in q.all()]


@router.post("/interview-bank", response_model=dict)
def create_interview_question(
    category: str = Body(...),
    question: str = Body(...),
    reference_answer: str | None = Body(default=None),
    difficulty: str = Body(default="medium"),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    iq = InterviewQuestionBank(category=category, question=question, reference_answer=reference_answer, difficulty=difficulty)
    db.add(iq)
    db.commit()
    log_op(db, admin.id, "interview_question_add", target=str(iq.id), detail={"category": category})
    return success({"id": iq.id})


@router.post("/interview-bank/import", response_model=dict)
def import_interview_questions(payload: list[dict] = Body(...), admin=Depends(require_admin), db: Session = Depends(get_db)):
    """批量导入面试题：[{category, question, difficulty?, reference_answer?, tags?}]"""
    if not payload:
        raise HTTPException(400, "导入内容为空")
    if len(payload) > 500:
        raise HTTPException(400, "单次最多导入 500 条")
    created, errors = 0, []
    for i, item in enumerate(payload):
        cat = (item.get("category") or "").strip()
        q = (item.get("question") or "").strip()
        if not cat or not q:
            errors.append(f"第 {i + 1} 条缺少 category 或 question")
            continue
        diff = item.get("difficulty") or "medium"
        if diff not in ("easy", "medium", "hard"):
            diff = "medium"
        db.add(InterviewQuestionBank(
            category=cat, question=q, difficulty=diff,
            reference_answer=item.get("reference_answer") or None,
            tags=item.get("tags") or None,
        ))
        created += 1
    db.commit()
    log_op(db, admin.id, "interview_question_import", detail={"created": created, "failed": len(errors)})
    return success({"created": created, "failed": len(errors), "errors": errors[:20]})


@router.get("/exam-bank", response_model=list[dict])
def list_exam_bank(category: str | None = None, db: Session = Depends(get_db)):
    q = db.query(ExamQuestion)
    if category:
        q = q.filter(ExamQuestion.category == category)
    return [{"id": e.id, "category": e.category, "question": e.question, "difficulty": e.difficulty} for e in q.all()]


@router.post("/exam-bank", response_model=dict)
def create_exam_question(
    category: str = Body(...),
    question: str = Body(...),
    question_type: str = Body(default="qa"),
    options: list[str] | None = Body(default=None),
    answer: str | None = Body(default=None),
    analysis: str | None = Body(default=None),
    difficulty: str = Body(default="medium"),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if question_type not in ("single", "multiple", "code", "qa"):
        raise HTTPException(400, "question_type 必须是 single/multiple/code/qa")
    if question_type in ("single", "multiple") and not options:
        raise HTTPException(400, "选择题必须提供 options")
    eq = ExamQuestion(
        category=category, question=question, question_type=question_type,
        options=json.dumps(options, ensure_ascii=False) if options else None,
        answer=answer, analysis=analysis, difficulty=difficulty,
    )
    db.add(eq)
    db.commit()
    log_op(db, admin.id, "exam_question_add", target=str(eq.id), detail={"category": category, "type": question_type})
    return success({"id": eq.id})


@router.post("/exam-bank/import", response_model=dict)
def import_exam_questions(payload: list[dict] = Body(...), admin=Depends(require_admin), db: Session = Depends(get_db)):
    """批量导入笔试题：[{category, question_type, question, options?, answer?, analysis?, difficulty?}]"""
    if not payload:
        raise HTTPException(400, "导入内容为空")
    if len(payload) > 500:
        raise HTTPException(400, "单次最多导入 500 条")
    created, errors = 0, []
    for i, item in enumerate(payload):
        cat = (item.get("category") or "").strip()
        q = (item.get("question") or "").strip()
        qt = item.get("question_type") or "qa"
        if not cat or not q:
            errors.append(f"第 {i + 1} 条缺少 category 或 question")
            continue
        if qt not in ("single", "multiple", "code", "qa"):
            errors.append(f"第 {i + 1} 条 question_type 非法: {qt}")
            continue
        opts = item.get("options")
        if qt in ("single", "multiple"):
            if not isinstance(opts, list) or not opts:
                errors.append(f"第 {i + 1} 条选择题必须提供 options 数组")
                continue
        diff = item.get("difficulty") or "medium"
        if diff not in ("easy", "medium", "hard"):
            diff = "medium"
        db.add(ExamQuestion(
            category=cat, question=q, question_type=qt,
            options=json.dumps(opts, ensure_ascii=False) if opts else None,
            answer=item.get("answer") or None,
            analysis=item.get("analysis") or None,
            difficulty=diff,
        ))
        created += 1
    db.commit()
    log_op(db, admin.id, "exam_question_import", detail={"created": created, "failed": len(errors)})
    return success({"created": created, "failed": len(errors), "errors": errors[:20]})


# ============ 用户点评（点赞/点踩/评论） ============
@router.get("/reviews/stats", response_model=dict)
def review_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(func.count(Review.id)).scalar() or 0
    ent_total = db.query(func.count(Review.id)).filter(Review.target_type == "enterprise").scalar() or 0
    job_total = db.query(func.count(Review.id)).filter(Review.target_type == "job").scalar() or 0

    like_cnt = db.query(func.count(Review.id)).filter(Review.rating == 1).scalar() or 0
    dislike_cnt = db.query(func.count(Review.id)).filter(Review.rating == -1).scalar() or 0
    pure_cnt = db.query(func.count(Review.id)).filter(Review.rating == 0).scalar() or 0

    pending_cnt = db.query(func.count(Review.id)).filter(Review.status == "pending").scalar() or 0
    approved_cnt = db.query(func.count(Review.id)).filter(Review.status == "approved").scalar() or 0
    rejected_cnt = db.query(func.count(Review.id)).filter(Review.status == "rejected").scalar() or 0

    def _by_type(tt: str):
        t = db.query(func.count(Review.id)).filter(Review.target_type == tt).scalar() or 0
        l = db.query(func.count(Review.id)).filter(Review.target_type == tt, Review.rating == 1).scalar() or 0
        d = db.query(func.count(Review.id)).filter(Review.target_type == tt, Review.rating == -1).scalar() or 0
        p = db.query(func.count(Review.id)).filter(Review.target_type == tt, Review.status == "pending").scalar() or 0
        rate = round(l / t * 100, 1) if t else 0.0
        return {"total": t, "like": l, "dislike": d, "pending": p, "like_rate": rate}

    return {
        "total": total,
        "enterprise": _by_type("enterprise"),
        "job": _by_type("job"),
        "like": like_cnt,
        "dislike": dislike_cnt,
        "pure_comment": pure_cnt,
        "pending": pending_cnt,
        "approved": approved_cnt,
        "rejected": rejected_cnt,
    }


@router.get("/reviews", response_model=list[dict])
def list_reviews(
    target_type: str | None = Query(default=None, description="enterprise / job"),
    rating: int | None = Query(default=None, ge=-1, le=1, description="1 点赞 / -1 点踩 / 0 仅点评"),
    status: str | None = Query(default=None, description="approved / pending / rejected"),
    keyword: str | None = Query(default=None, description="按用户名或点评内容模糊搜索"),
    db: Session = Depends(get_db),
):
    q = db.query(Review)
    if target_type:
        q = q.filter(Review.target_type == target_type)
    if rating is not None:
        q = q.filter(Review.rating == rating)
    if status:
        q = q.filter(Review.status == status)
    rows = q.order_by(Review.created_at.desc()).all()

    user_ids = {r.user_id for r in rows}
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    ent_ids = {r.target_id for r in rows if r.target_type == "enterprise"}
    ent_map = {e.id: e for e in db.query(Enterprise).filter(Enterprise.id.in_(ent_ids)).all()} if ent_ids else {}

    job_ids = {r.target_id for r in rows if r.target_type == "job"}
    job_map = {j.id: j for j in db.query(JobPosition).filter(JobPosition.id.in_(job_ids)).all()} if job_ids else {}

    result = []
    for r in rows:
        u = users_map.get(r.user_id)
        if keyword:
            hit_user = (u.username or "") + (u.real_name or "") if u else ""
            if keyword not in hit_user and keyword not in (r.content or ""):
                continue

        target_name = ""
        if r.target_type == "enterprise":
            e = ent_map.get(r.target_id)
            target_name = e.company_name if e else f"企业#{r.target_id}"
        elif r.target_type == "job":
            j = job_map.get(r.target_id)
            target_name = f"{j.title}（{j.company}）" if j else f"岗位#{r.target_id}"
        else:
            target_name = f"{r.target_type}#{r.target_id}"

        rating_label = {1: "👍 点赞", -1: "👎 点踩", 0: "💬 仅点评"}.get(r.rating, str(r.rating))

        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "username": u.username if u else "",
            "real_name": u.real_name if u else "",
            "target_type": r.target_type,
            "target_id": r.target_id,
            "target_name": target_name,
            "rating": r.rating,
            "rating_label": rating_label,
            "content": r.content or "",
            "status": r.status,
            "created_at": r.created_at,
        })

    return result


@router.put("/reviews/{rid}/status", response_model=dict)
def update_review_status(rid: int, status: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    review = db.get(Review, rid)
    if not review:
        raise HTTPException(404, "点评不存在")
    if status not in ("approved", "pending", "rejected"):
        raise HTTPException(400, "status 必须是 approved / pending / rejected")
    review.status = status
    db.commit()
    log_op(db, admin.id, "update_review_status", f"review#{rid}", {"status": status})
    return success()


@router.delete("/reviews/{rid}", response_model=dict)
def delete_review_by_admin(rid: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    review = db.get(Review, rid)
    if not review:
        raise HTTPException(404, "点评不存在")
    db.delete(review)
    db.commit()
    log_op(db, admin.id, "delete_review", f"review#{rid}")
    return success()


# ============ AI 质量监控：点赞点踩、坏案例库 ============
@router.get("/feedback", response_model=list[dict])
def list_feedback(target_type: str | None = None, db: Session = Depends(get_db)):
    q = db.query(AiFeedback)
    if target_type:
        q = q.filter(AiFeedback.target_type == target_type)
    rows = q.order_by(AiFeedback.created_at.desc()).all()

    user_ids = {f.user_id for f in rows}
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    job_ids = {f.target_id for f in rows if f.target_type in ("resume_diagnose", "job_match") and f.target_id}
    job_map = {j.id: j for j in db.query(JobPosition).filter(JobPosition.id.in_(job_ids)).all()} if job_ids else {}

    resume_ids = {f.target_id for f in rows if f.target_type == "resume_diagnose" and f.target_id}
    resume_map = {r.id: r for r in db.query(Resume).filter(Resume.id.in_(resume_ids)).all()} if resume_ids else {}

    interview_ids = {f.target_id for f in rows if f.target_type == "interview" and f.target_id}
    from app.models.interview import InterviewSession
    interview_map = {s.id: s for s in db.query(InterviewSession).filter(InterviewSession.id.in_(interview_ids)).all()} if interview_ids else {}

    exam_ids = {f.target_id for f in rows if f.target_type == "exam" and f.target_id}
    from app.models.exam import ExamSession
    exam_map = {s.id: s for s in db.query(ExamSession).filter(ExamSession.id.in_(exam_ids)).all()} if exam_ids else {}

    type_labels = {
        "resume_diagnose": "📄 简历诊断",
        "resume_polish": "✨ 简历润色",
        "job_match": "💼 岗位匹配",
        "interview": "🎙️ AI 面试",
        "exam": "📝 AI 笔试",
        "mock_test": "🎯 模拟题",
    }

    result = []
    for f in rows:
        u = users_map.get(f.user_id)
        target_label = type_labels.get(f.target_type, f.target_type)
        target_name = ""
        if f.target_type == "resume_diagnose" and f.target_id:
            r = resume_map.get(f.target_id)
            target_name = r.title if r else f"简历#{f.target_id}"
        elif f.target_type == "job_match" and f.target_id:
            j = job_map.get(f.target_id)
            target_name = f"{j.title}（{j.company}）" if j else f"岗位#{f.target_id}"
        elif f.target_type == "interview" and f.target_id:
            s = interview_map.get(f.target_id)
            target_name = f"岗位#{s.job_id}" if s else f"会话#{f.target_id}"
        elif f.target_type == "exam" and f.target_id:
            s = exam_map.get(f.target_id)
            target_name = f"岗位#{s.job_id}" if s else f"笔试#{f.target_id}"
        else:
            target_name = f"#{f.target_id}" if f.target_id else "-"

        feedback_label = {"like": "👍 喜欢", "dislike": "👎 点踩"}.get(f.feedback, f.feedback)

        result.append({
            "id": f.id,
            "user_id": f.user_id,
            "username": u.username if u else "",
            "real_name": u.real_name if u else "",
            "target_type": f.target_type,
            "target_label": target_label,
            "target_id": f.target_id,
            "target_name": target_name,
            "feedback": f.feedback,
            "feedback_label": feedback_label,
            "comment": f.comment or "",
            "created_at": f.created_at,
        })

    return result


@router.get("/bad-cases", response_model=list[dict])
def list_bad_cases(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(AiBadCase)
    if status:
        q = q.filter(AiBadCase.status == status)
    return [
        {"id": b.id, "agent_name": b.agent_name, "request": b.request, "response": b.response, "reason": b.reason, "status": b.status, "created_at": b.created_at}
        for b in q.order_by(AiBadCase.created_at.desc()).all()
    ]


@router.put("/bad-cases/{bid}/fix", response_model=dict)
def mark_bad_case_fixed(bid: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    b = db.get(AiBadCase, bid)
    if not b:
        raise HTTPException(404, "坏案例不存在")
    b.status = "fixed"
    db.commit()
    return success()


# ============ 平台统计可视化，数据导出 Excel ============
@router.get("/stats", response_model=dict)
def platform_stats(db: Session = Depends(get_db)):
    interview_total = db.query(func.count(InterviewSession.id)).scalar()
    interview_msgs = db.query(func.count(InterviewMessage.id)).scalar()
    interview_scores = db.query(InterviewSession.score).filter(InterviewSession.score.isnot(None)).all()
    interview_avg_score = round(sum(s or 0 for (s,) in interview_scores) / len(interview_scores), 1) if interview_scores else 0

    exam_sessions = db.query(func.count(ExamSession.id)).scalar()
    exam_total_q = db.query(func.count(UserExamRecord.id)).scalar()
    exam_correct = db.query(func.count(UserExamRecord.id)).filter(UserExamRecord.is_correct == 1).scalar()
    exam_correct_rate = round(exam_correct / exam_total_q * 100, 1) if exam_total_q else 0

    feedback_like = db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "like").scalar()
    feedback_dislike = db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "dislike").scalar()
    feedback_total = feedback_like + feedback_dislike
    feedback_like_rate = round(feedback_like / feedback_total * 100, 1) if feedback_total else 0

    return success({
        "user_count": db.query(func.count(User.id)).scalar(),
        "enterprise_count": db.query(func.count(Enterprise.id)).scalar(),
        "job_count": db.query(func.count(JobPosition.id)).scalar(),
        "resume_count": db.query(func.count(Resume.id)).scalar(),
        "apply_count": db.query(func.count(JobApply.id)).scalar(),
        "interview_count": interview_total,
        "feedback_like": feedback_like,
        "feedback_dislike": feedback_dislike,
        "interview_msgs": interview_msgs,
        "interview_avg_score": interview_avg_score,
        "exam_sessions": exam_sessions,
        "exam_total_q": exam_total_q,
        "exam_correct_rate": exam_correct_rate,
        "feedback_like_rate": feedback_like_rate,
        "bad_case_count": db.query(func.count(AiBadCase.id)).scalar(),
    })


@router.get("/stats/overview", response_model=dict)
def stats_overview(db: Session = Depends(get_db)):
    """数据大屏聚合：8 项 KPI + 4 组图表数据（近7天新增学生 / 岗位分类 / 投递状态 / 热门城市 TOP8）。"""
    like = db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "like").scalar()
    dislike = db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "dislike").scalar()

    days = []
    now = datetime.now()
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).date()
        cnt = db.query(func.count(User.id)).filter(
            User.role == "student", cast(User.created_at, Date) == d
        ).scalar()
        days.append({"date": d.strftime("%m-%d"), "count": cnt})

    cats = (
        db.query(JobPosition.category, func.count(JobPosition.id))
        .filter(JobPosition.status == "approved")
        .group_by(JobPosition.category)
        .all()
    )
    sts = db.query(JobApply.status, func.count(JobApply.id)).group_by(JobApply.status).all()
    city_rows = (
        db.query(JobPosition.city, func.count(JobPosition.id))
        .filter(JobPosition.status == "approved", JobPosition.city.isnot(None))
        .group_by(JobPosition.city)
        .order_by(func.count(JobPosition.id).desc())
        .limit(8)
        .all()
    )

    return success({
        "kpis": {
            "student_count": db.query(func.count(User.id)).filter(User.role == "student").scalar(),
            "enterprise_count": db.query(func.count(Enterprise.id)).scalar(),
            "job_count": db.query(func.count(JobPosition.id)).filter(JobPosition.status == "approved").scalar(),
            "resume_count": db.query(func.count(Resume.id)).scalar(),
            "apply_count": db.query(func.count(JobApply.id)).scalar(),
            "interview_done": db.query(func.count(InterviewSession.id)).filter(InterviewSession.status == "finished").scalar(),
            "exam_done": db.query(func.count(ExamSession.id)).filter(ExamSession.status == "finished").scalar(),
            "ai_like_rate": round(like / (like + dislike) * 100, 1) if (like + dislike) else 0,
        },
        "new_students_7d": days,
        "job_categories": [{"name": c or "其他", "count": n} for c, n in cats],
        "apply_status": [{"name": s, "count": n} for s, n in sts],
        "top_cities": [{"name": c, "count": n} for c, n in city_rows],
    })


@router.get("/ai-usage", response_model=dict)
def ai_usage(db: Session = Depends(get_db)):
    """AI 使用详细统计：总览 + 按 Agent 类型分布 + 最近 7 天趋势 + TOP 用户。"""

    # === 总览 ===
    interview_total = db.query(func.count(InterviewSession.id)).scalar()
    interview_msgs = db.query(func.count(InterviewMessage.id)).scalar()
    exam_sessions = db.query(func.count(ExamSession.id)).scalar()
    exam_q_count = db.query(func.count(ExamSessionQuestion.id)).scalar()
    feedback_like = db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "like").scalar()
    feedback_dislike = db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "dislike").scalar()
    bad_case = db.query(func.count(AiBadCase.id)).scalar()
    resume_count = db.query(func.count(Resume.id)).scalar()

    # === 按 Agent 类型分布 ===
    by_agent = [
        {"agent": "AI 面试", "count": interview_total, "detail": f"{interview_msgs} 轮问答"},
        {"agent": "AI 笔试", "count": exam_sessions, "detail": f"{exam_q_count} 道题目"},
        {"agent": "AI 简历", "count": resume_count, "detail": "解析 / 诊断 / 润色"},
        {"agent": "AI 反馈", "count": feedback_like + feedback_dislike, "detail": f"👍{feedback_like}  👎{feedback_dislike}"},
        {"agent": "AI 质量问题", "count": bad_case, "detail": "坏案例待修复"},
    ]

    # === 最近 7 天趋势（按天聚合）===
    days = []
    now = datetime.now()
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        day_str = d.strftime("%m-%d")

        iv_cnt = db.query(func.count(InterviewSession.id)).filter(cast(InterviewSession.created_at, Date) == d.date()).scalar()
        ex_cnt = db.query(func.count(ExamSession.id)).filter(cast(ExamSession.created_at, Date) == d.date()).scalar()
        fd_cnt = db.query(func.count(AiFeedback.id)).filter(cast(AiFeedback.created_at, Date) == d.date()).scalar()
        bd_cnt = db.query(func.count(AiBadCase.id)).filter(cast(AiBadCase.created_at, Date) == d.date()).scalar()

        days.append({"date": day_str, "interview": iv_cnt, "exam": ex_cnt, "feedback": fd_cnt, "bad_case": bd_cnt})

    # === TOP 用户：按 AI 使用次数（面试 + 笔试 + 简历）聚合 ===
    interview_top = db.query(InterviewSession.user_id, func.count(InterviewSession.id).label("cnt")).group_by(InterviewSession.user_id).subquery()
    exam_top = db.query(ExamSession.user_id, func.count(ExamSession.id).label("cnt")).group_by(ExamSession.user_id).subquery()
    resume_top = db.query(Resume.user_id, func.count(Resume.id).label("cnt")).group_by(Resume.user_id).subquery()

    all_users = set()
    interview_map = {uid: cnt for uid, cnt in db.query(InterviewSession.user_id, func.count(InterviewSession.id)).group_by(InterviewSession.user_id).all()}
    exam_map = {uid: cnt for uid, cnt in db.query(ExamSession.user_id, func.count(ExamSession.id)).group_by(ExamSession.user_id).all()}
    resume_map = {uid: cnt for uid, cnt in db.query(Resume.user_id, func.count(Resume.id)).group_by(Resume.user_id).all()}

    top_map = {}
    for m in (interview_map, exam_map, resume_map):
        for uid, cnt in m.items():
            top_map.setdefault(uid, {"user_id": uid, "interview": 0, "exam": 0, "resume": 0, "total": 0})
    for uid, cnt in interview_map.items():
        top_map[uid]["interview"] = cnt; top_map[uid]["total"] += cnt
    for uid, cnt in exam_map.items():
        top_map[uid]["exam"] = cnt; top_map[uid]["total"] += cnt
    for uid, cnt in resume_map.items():
        top_map[uid]["resume"] = cnt; top_map[uid]["total"] += cnt

    top_list = sorted(top_map.values(), key=lambda x: -x["total"])[:10]
    user_ids = [t["user_id"] for t in top_list]
    if user_ids:
        user_rows = db.query(User.id, User.username, User.real_name, User.school).filter(User.id.in_(user_ids)).all()
        user_dict = {r.id: {"username": r.username, "real_name": r.real_name, "school": r.school} for r in user_rows}
        for t in top_list:
            u = user_dict.get(t["user_id"], {})
            t.update(u)

    return success({
        "overview": {
            "interview_total": interview_total,
            "interview_msgs": interview_msgs,
            "exam_sessions": exam_sessions,
            "exam_q_count": exam_q_count,
            "feedback_like": feedback_like,
            "feedback_dislike": feedback_dislike,
            "bad_case": bad_case,
            "resume_count": resume_count,
            "total_ai_actions": interview_total + exam_sessions + resume_count + feedback_like + feedback_dislike,
        },
        "by_agent": by_agent,
        "daily_trend": days,
        "top_users": top_list,
    })


@router.get("/export/users")
def export_users_excel(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """数据导出 Excel（用户清单）。浏览器新窗口下载通过 query 传 token，由统一 auth 处理。"""
    try:
        from openpyxl import Workbook
    except ImportError:
        raise HTTPException(500, "openpyxl 未安装")
    wb = Workbook()
    ws = wb.active
    ws.title = "用户"
    ws.append(["ID", "用户名", "姓名", "学校", "专业", "角色", "状态", "AI配额", "简历上限", "注册时间"])
    for u in db.query(User).all():
        ws.append([u.id, u.username, u.real_name, u.school, u.major, u.role, "启用" if u.is_active else "禁用", u.ai_quota, u.resume_limit, str(u.created_at)])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="users_{datetime.now():%Y%m%d}.xlsx"'},
    )


# ============ 系统公告、操作审计日志 ============
@router.get("/messages", response_model=list[SystemMessageOut])
def list_messages(db: Session = Depends(get_db)):
    return db.query(SystemMessage).order_by(SystemMessage.created_at.desc()).all()


@router.post("/messages", response_model=dict)
def create_message(payload: SystemMessageCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    m = SystemMessage(title=payload.title, content=payload.content, target_role=payload.target_role)
    db.add(m)
    log_op(db, admin.id, "create_message", payload.title)
    db.commit()
    return success({"id": m.id})


@router.get("/logs", response_model=list[dict])
def operation_logs(db: Session = Depends(get_db)):
    rows = db.query(AdminOperationLog).order_by(AdminOperationLog.created_at.desc()).limit(200).all()
    return [
        {"id": l.id, "admin_id": l.admin_id, "action": l.action, "target": l.target, "detail": l.detail, "ip": l.ip, "created_at": l.created_at}
        for l in rows
    ]
