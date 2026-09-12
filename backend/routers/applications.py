from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Application, Job, Resume, User
from security import get_current_user
from schemas import ApplyIn

router = APIRouter(prefix="/applications", tags=["投递"])

STEPS = ["已投递", "简历通过", "笔试", "面试中", "Offer"]


def to_dict(a: Application, job: Job, resume: Resume | None) -> dict:
    return {
        "id": a.id,
        "job_id": a.job_id,
        "jobTitle": job.title if job else "",
        "company": job.company if job else "",
        "logo": job.logo if job else "岗",
        "logoColor": job.logo_color if job else "#4f6ef7",
        "salary": job.salary if job else "",
        "resumeName": resume.filename if resume else "默认简历",
        "step": a.step,
        "steps": STEPS,
        "appliedAt": a.applied_at.strftime("%Y-%m-%d %H:%M") if a.applied_at else "",
    }


@router.get("")
def list_applications(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(Application).filter(Application.user_id == current.id).order_by(Application.id.desc()).all()
    result = []
    for a in rows:
        job = db.query(Job).filter(Job.id == a.job_id).first()
        resume = db.query(Resume).filter(Resume.id == a.resume_id).first() if a.resume_id else None
        result.append(to_dict(a, job, resume))
    return result


@router.post("")
def apply(data: ApplyIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    # 重复投递校验
    exists = db.query(Application).filter(
        Application.user_id == current.id, Application.job_id == data.job_id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="你已经投递过该岗位")

    # 未指定简历则用默认简历
    resume_id = data.resume_id
    if not resume_id:
        dft = db.query(Resume).filter(Resume.user_id == current.id, Resume.is_default == True).first()
        resume_id = dft.id if dft else None

    app = Application(user_id=current.id, job_id=data.job_id, resume_id=resume_id, step=0)
    db.add(app)
    db.commit()
    db.refresh(app)
    resume = db.query(Resume).filter(Resume.id == resume_id).first() if resume_id else None
    return {"msg": "投递成功", "application": to_dict(app, job, resume)}
