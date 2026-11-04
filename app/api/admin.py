"""平台管理员路由：用户/企业/岗位审核、Prompt 模板、题库维护、AI 质量监控、配额、统计、公告、日志。"""
from __future__ import annotations

import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import success
from app.database import get_db
from app.dependencies import require_admin
from app.models.ai import AiBadCase, AiFeedback, AiPromptTemplate
from app.models.exam import ExamQuestion
from app.models.interview import InterviewQuestionBank, InterviewSession
from app.models.job import JobApply, JobPosition
from app.models.resume import Resume
from app.models.system import AdminOperationLog, SystemMessage
from app.models.user import Enterprise, User
from app.schemas.ai import AiPromptTemplateOut, SystemMessageOut

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
def list_resumes_for_audit(status: str = "draft", db: Session = Depends(get_db)):
    rows = db.query(Resume).filter(Resume.status == status).all()
    return [{"id": r.id, "user_id": r.user_id, "title": r.title, "status": r.status, "created_at": r.created_at} for r in rows]


@router.put("/resumes/{resume_id}/audit", response_model=dict)
def audit_resume(resume_id: int, status: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = db.get(Resume, resume_id)
    if not r:
        raise HTTPException(404, "简历不存在")
    r.status = status
    log_op(db, admin.id, "audit_resume", str(resume_id), {"status": status})
    db.commit()
    return success()


# ============ 企业账号审核 ============
@router.get("/enterprises", response_model=list[dict])
def list_enterprises(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Enterprise)
    if status:
        q = q.filter(Enterprise.status == status)
    return [
        {"id": e.id, "username": e.username, "company_name": e.company_name, "industry": e.industry, "status": e.status, "created_at": e.created_at}
        for e in q.all()
    ]


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
def list_jobs_audit(status: str = "pending", db: Session = Depends(get_db)):
    rows = db.query(JobPosition).filter(JobPosition.status == status).all()
    return [{"id": j.id, "title": j.title, "company": j.company, "status": j.status, "created_at": j.created_at} for j in rows]


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
def create_interview_question(category: str, question: str, reference_answer: str | None = None, difficulty: str = "medium", admin=Depends(require_admin), db: Session = Depends(get_db)):
    iq = InterviewQuestionBank(category=category, question=question, reference_answer=reference_answer, difficulty=difficulty)
    db.add(iq)
    db.commit()
    return success({"id": iq.id})


@router.get("/exam-bank", response_model=list[dict])
def list_exam_bank(category: str | None = None, db: Session = Depends(get_db)):
    q = db.query(ExamQuestion)
    if category:
        q = q.filter(ExamQuestion.category == category)
    return [{"id": e.id, "category": e.category, "question": e.question, "difficulty": e.difficulty} for e in q.all()]


# ============ AI 质量监控：点赞点踩、坏案例库 ============
@router.get("/feedback", response_model=list[dict])
def list_feedback(target_type: str | None = None, db: Session = Depends(get_db)):
    q = db.query(AiFeedback)
    if target_type:
        q = q.filter(AiFeedback.target_type == target_type)
    return [
        {"id": f.id, "user_id": f.user_id, "target_type": f.target_type, "feedback": f.feedback, "comment": f.comment, "created_at": f.created_at}
        for f in q.order_by(AiFeedback.created_at.desc()).all()
    ]


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
    return success({
        "user_count": db.query(func.count(User.id)).scalar(),
        "enterprise_count": db.query(func.count(Enterprise.id)).scalar(),
        "job_count": db.query(func.count(JobPosition.id)).scalar(),
        "resume_count": db.query(func.count(Resume.id)).scalar(),
        "apply_count": db.query(func.count(JobApply.id)).scalar(),
        "interview_count": db.query(func.count(InterviewSession.id)).scalar(),
        "feedback_like": db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "like").scalar(),
        "feedback_dislike": db.query(func.count(AiFeedback.id)).filter(AiFeedback.feedback == "dislike").scalar(),
    })


@router.get("/export/users")
def export_users_excel(db: Session = Depends(get_db)):
    """数据导出 Excel（用户清单）。"""
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
def create_message(title: str, content: str, target_role: str = "all", admin=Depends(require_admin), db: Session = Depends(get_db)):
    m = SystemMessage(title=title, content=content, target_role=target_role)
    db.add(m)
    log_op(db, admin.id, "create_message", title)
    db.commit()
    return success({"id": m.id})


@router.get("/logs", response_model=list[dict])
def operation_logs(db: Session = Depends(get_db)):
    rows = db.query(AdminOperationLog).order_by(AdminOperationLog.created_at.desc()).limit(200).all()
    return [
        {"id": l.id, "admin_id": l.admin_id, "action": l.action, "target": l.target, "detail": l.detail, "ip": l.ip, "created_at": l.created_at}
        for l in rows
    ]
