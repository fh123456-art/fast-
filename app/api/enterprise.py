"""企业账号路由：发布管理岗位、查看本岗位投递列表、筛选投递简历。"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import success
from app.database import get_db
from app.dependencies import CurrentUser, require_enterprise
from app.models.job import JobApply, JobPosition
from app.models.resume import Resume
from app.models.user import User
from app.schemas.job import JobPositionCreate, JobPositionOut

router = APIRouter()


def _job_to_dict(job: JobPosition) -> dict:
    d = JobPositionOut.model_validate(job).model_dump()
    try:
        d["skills"] = json.loads(job.skills) if job.skills else []
    except json.JSONDecodeError:
        d["skills"] = job.skills
    return d


def _get_enterprise_id(user) -> int:
    return getattr(user, "_enterprise", None).id if hasattr(user, "_enterprise") else user.id


@router.post("/jobs", response_model=dict)
def publish_job(
    payload: JobPositionCreate,
    user=Depends(require_enterprise),
    db: Session = Depends(get_db),
):
    """发布管理招聘岗位。"""
    ent_id = _get_enterprise_id(user)
    job = JobPosition(
        enterprise_id=ent_id,
        title=payload.title,
        company=payload.company or getattr(user, "_enterprise", None).company_name if hasattr(user, "_enterprise") else payload.company,
        city=payload.city,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        experience=payload.experience,
        education=payload.education,
        job_type=payload.job_type,
        category=payload.category,
        description=payload.description,
        requirement=payload.requirement,
        skills=json.dumps(payload.skills or [], ensure_ascii=False),
        status="approved",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return success({"id": job.id})


@router.get("/jobs", response_model=list[dict])
def my_jobs(user=Depends(require_enterprise), db: Session = Depends(get_db)):
    ent_id = _get_enterprise_id(user)
    rows = db.query(JobPosition).filter(JobPosition.enterprise_id == ent_id).order_by(JobPosition.created_at.desc()).all()
    return [_job_to_dict(j) for j in rows]


@router.put("/jobs/{job_id}", response_model=dict)
def update_job(job_id: int, payload: JobPositionCreate, user=Depends(require_enterprise), db: Session = Depends(get_db)):
    ent_id = _get_enterprise_id(user)
    job = db.get(JobPosition, job_id)
    if not job or job.enterprise_id != ent_id:
        raise HTTPException(status_code=404, detail="岗位不存在")
    for k, v in payload.model_dump().items():
        if k == "skills":
            setattr(job, k, json.dumps(v or [], ensure_ascii=False))
        elif v is not None:
            setattr(job, k, v)
    db.commit()
    return success()


@router.get("/jobs/{job_id}/applications", response_model=list[dict])
def job_applications(job_id: int, status: str | None = None, user=Depends(require_enterprise), db: Session = Depends(get_db)):
    """查看本岗位简历投递列表，并支持按状态筛选投递简历。"""
    ent_id = _get_enterprise_id(user)
    job = db.get(JobPosition, job_id)
    if not job or job.enterprise_id != ent_id:
        raise HTTPException(status_code=404, detail="岗位不存在")
    q = db.query(JobApply).filter(JobApply.job_id == job_id)
    if status:
        q = q.filter(JobApply.status == status)
    rows = q.order_by(JobApply.created_at.desc()).all()
    out = []
    for a in rows:
        u = db.get(User, a.user_id)
        r = db.get(Resume, a.resume_id)
        out.append({
            "apply_id": a.id,
            "user": {"id": u.id, "real_name": u.real_name, "school": u.school, "major": u.major} if u else None,
            "resume_id": a.resume_id,
            "resume_title": r.title if r else None,
            "status": a.status,
            "created_at": a.created_at,
        })
    return out


@router.put("/applications/{apply_id}/status", response_model=dict)
def update_apply_status(apply_id: int, status: str, user=Depends(require_enterprise), db: Session = Depends(get_db)):
    ent_id = _get_enterprise_id(user)
    apply = db.get(JobApply, apply_id)
    if not apply:
        raise HTTPException(status_code=404, detail="投递记录不存在")
    job = db.get(JobPosition, apply.job_id)
    if not job or job.enterprise_id != ent_id:
        raise HTTPException(status_code=403, detail="无权操作")
    apply.status = status
    db.commit()
    return success()
