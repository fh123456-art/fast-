import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import Job, Collect, User
from security import get_current_user

router = APIRouter(prefix="/jobs", tags=["岗位"])


def parse_json(s, default):
    try:
        return json.loads(s) if s else default
    except Exception:
        return default


def job_to_dict(job: Job, collected: bool = False) -> dict:
    return {
        "id": job.id, "title": job.title, "company": job.company, "logo": job.logo,
        "logo_color": job.logo_color, "salary": job.salary, "city": job.city,
        "experience": job.experience, "education": job.education,
        "tags": parse_json(job.tags, []), "description": job.description,
        "requirements": parse_json(job.requirements, []), "collected": collected,
    }


def collected_ids(db: Session, user_id: int) -> set:
    return {c.job_id for c in db.query(Collect).filter(Collect.user_id == user_id).all()}


@router.get("")
def list_jobs(keyword: str = "", city: str = "", education: str = "",
              db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    q = db.query(Job)
    if city:
        q = q.filter(Job.city == city)
    if education:
        q = q.filter(Job.education == education)
    jobs = q.all()
    if keyword:
        kw = keyword.strip()
        jobs = [j for j in jobs if kw in j.title or kw in j.company
                or kw in parse_json(j.tags, []) and any(kw in t for t in parse_json(j.tags, []))]
    cids = collected_ids(db, current.id)
    return [job_to_dict(j, j.id in cids) for j in jobs]


@router.get("/collected")
def list_collected(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    cids = collected_ids(db, current.id)
    jobs = db.query(Job).filter(Job.id.in_(cids)).all() if cids else []
    return [job_to_dict(j, True) for j in jobs]


@router.get("/{job_id}")
def job_detail(job_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    cids = collected_ids(db, current.id)
    return job_to_dict(job, job.id in cids)


@router.post("/{job_id}/collect")
def collect(job_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if not db.query(Job).filter(Job.id == job_id).first():
        raise HTTPException(status_code=404, detail="岗位不存在")
    exists = db.query(Collect).filter(Collect.user_id == current.id, Collect.job_id == job_id).first()
    if not exists:
        db.add(Collect(user_id=current.id, job_id=job_id))
        db.commit()
    return {"msg": "已收藏", "collected": True}


@router.delete("/{job_id}/collect")
def uncollect(job_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    db.query(Collect).filter(Collect.user_id == current.id, Collect.job_id == job_id).delete()
    db.commit()
    return {"msg": "已取消收藏", "collected": False}
