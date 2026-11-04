"""用户反馈路由：AI 简历、面试点评点赞点踩。"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.exceptions import success
from app.database import get_db
from app.dependencies import CurrentUser
from app.models.ai import AiBadCase, AiFeedback
from app.schemas.ai import AiFeedbackCreate

router = APIRouter()


@router.post("", response_model=dict)
def submit_feedback(payload: AiFeedbackCreate, user: CurrentUser, db: Session = Depends(get_db)):
    fb = AiFeedback(
        user_id=user.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        feedback=payload.feedback,
        comment=payload.comment,
    )
    db.add(fb)
    # 点踩的 AI 输出自动进入坏案例库
    if payload.feedback == "dislike":
        db.add(
            AiBadCase(
                agent_name=payload.target_type,
                request=str(payload.target_id),
                response=payload.comment or "",
                reason="用户点踩",
            )
        )
    db.commit()
    return success()
