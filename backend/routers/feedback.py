from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Feedback, User
from security import get_current_user
from schemas import FeedbackIn

router = APIRouter(prefix="/feedback", tags=["反馈"])


@router.get("")
def list_feedback(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(Feedback).filter(Feedback.user_id == current.id).order_by(Feedback.id.desc()).all()
    return [{
        "id": f.id,
        "category": f.fb_type + " · " + f.category if f.fb_type else f.category,
        "content": f.content,
        "status": f.status,
        "date": f.created_at.strftime("%Y-%m-%d") if f.created_at else "",
    } for f in rows]


@router.post("")
def submit_feedback(data: FeedbackIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    fb = Feedback(user_id=current.id, category=data.category, fb_type=data.fb_type, content=data.content)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"msg": "反馈提交成功", "id": fb.id}
