"""求职投递管理路由：投递、进度追踪、笔记标签、求职看板。"""
from __future__ import annotations

import json
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import success
from app.database import get_db
from app.dependencies import CurrentUser
from app.models.job import JobApply, JobPosition
from app.models.resume import Resume
from app.schemas.job import JobApplyCreate, JobApplyOut, JobApplyUpdate

router = APIRouter()


def _apply_to_dict(a: JobApply, job_title: str | None = None, company: str | None = None) -> dict:
    d = JobApplyOut.model_validate(a).model_dump()
    try:
        d["tags"] = json.loads(a.tags) if a.tags else []
    except json.JSONDecodeError:
        d["tags"] = a.tags
    d["job_title"] = job_title or ""
    d["company"] = company or ""
    return d


@router.post("", response_model=dict)
def apply_job(payload: JobApplyCreate, user: CurrentUser, db: Session = Depends(get_db)):
    """岗位投递，绑定对应简历版本。"""
    job = db.get(JobPosition, payload.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    resume_id = payload.resume_id
    if resume_id is None:
        latest = (
            db.query(Resume)
            .filter(Resume.user_id == user.id)
            .order_by(Resume.updated_at.desc())
            .first()
        )
        if not latest:
            raise HTTPException(status_code=400, detail="请先上传简历后再投递")
        resume_id = latest.id
    else:
        resume = db.get(Resume, resume_id)
        if not resume or resume.user_id != user.id:
            raise HTTPException(status_code=404, detail="简历不存在")
    existing = db.query(JobApply).filter(
        JobApply.user_id == user.id, JobApply.job_id == payload.job_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="已投递过该岗位")
    apply = JobApply(user_id=user.id, job_id=payload.job_id, resume_id=resume_id)
    db.add(apply)
    db.commit()
    return success({"id": apply.id})


@router.get("", response_model=list[dict])
def my_applies(user: CurrentUser, db: Session = Depends(get_db)):
    """投递进度追踪。"""
    rows = (
        db.query(JobApply, JobPosition.title, JobPosition.company)
        .outerjoin(JobPosition, JobApply.job_id == JobPosition.id)
        .filter(JobApply.user_id == user.id)
        .order_by(JobApply.created_at.desc())
        .all()
    )
    return [_apply_to_dict(a, title, company) for a, title, company in rows]


@router.put("/{apply_id}", response_model=dict)
def update_apply(apply_id: int, payload: JobApplyUpdate, user: CurrentUser, db: Session = Depends(get_db)):
    """更新投递状态、笔记、标签、面试时间（求职日历提醒数据源）。"""
    apply = db.get(JobApply, apply_id)
    if not apply or apply.user_id != user.id:
        raise HTTPException(status_code=404, detail="投递记录不存在")
    if payload.status is not None:
        apply.status = payload.status
    if payload.note is not None:
        apply.note = payload.note
    if payload.tags is not None:
        apply.tags = json.dumps(payload.tags, ensure_ascii=False)
    if payload.interview_date is not None:
        apply.interview_date = payload.interview_date
    db.commit()
    return success()


@router.get("/board", response_model=dict)
def apply_board(user: CurrentUser, db: Session = Depends(get_db)):
    """个人求职看板：按状态聚合投递数量。"""
    rows = (
        db.query(JobApply, JobPosition.title, JobPosition.company)
        .outerjoin(JobPosition, JobApply.job_id == JobPosition.id)
        .filter(JobApply.user_id == user.id)
        .all()
    )
    counter = Counter(a.status for a, _, _ in rows)
    return success({
        "total": len(rows),
        "status_count": dict(counter),
        "items": [_apply_to_dict(a, title, company) for a, title, company in rows],
    })
