"""点赞 / 点踩 / 点评 路由。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, or_

from app.core.exceptions import success
from app.dependencies import CurrentUser, DBSession
from app.models.review import Review
from app.models.user import Enterprise

router = APIRouter()


@router.get("/targets", response_model=dict)
def review_targets(db: DBSession = None):
    """公开接口：返回可点评的企业列表和岗位列表（均为已通过审核的）。"""
    ents = db.query(Enterprise.id, Enterprise.company_name, Enterprise.industry).filter(Enterprise.status == "approved").all()
    ent_list = [{"id": e.id, "name": e.company_name, "industry": e.industry or ""} for e in ents]

    from app.models.job import JobPosition

    jobs = db.query(JobPosition.id, JobPosition.title, JobPosition.company, JobPosition.city).filter(JobPosition.status == "approved").all()
    job_list = [{"id": j.id, "title": j.title, "company": j.company, "city": j.city or ""} for j in jobs]

    return success({"enterprises": ent_list, "jobs": job_list})


def _serialize(r: Review) -> dict:
    return {
        "id": r.id,
        "user_id": r.user_id,
        "target_type": r.target_type,
        "target_id": r.target_id,
        "rating": r.rating,
        "content": r.content or "",
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else "",
    }


def _enrich(db, items: list[dict]) -> list[dict]:
    """给点评结果补上目标名称（企业名 或 岗位名）。"""
    ent_ids = {i["target_id"] for i in items if i["target_type"] == "enterprise"}
    job_ids = {i["target_id"] for i in items if i["target_type"] == "job"}

    ent_map = {}
    if ent_ids:
        for e in db.query(Enterprise.id, Enterprise.company_name).filter(Enterprise.id.in_(ent_ids)).all():
            ent_map[e.id] = e.company_name

    job_map = {}
    if job_ids:
        from app.models.job import JobPosition

        for j in db.query(JobPosition.id, JobPosition.title, JobPosition.company).filter(
            JobPosition.id.in_(job_ids)
        ).all():
            job_map[j.id] = {"title": j.title, "company": j.company}

    for it in items:
        if it["target_type"] == "enterprise":
            it["target_name"] = ent_map.get(it["target_id"], f"企业#{it['target_id']}")
        else:
            info = job_map.get(it["target_id"])
            if info:
                it["target_name"] = info["title"]
                it["target_company"] = info["company"]
            else:
                it["target_name"] = f"岗位#{it['target_id']}"
    return items


@router.post("", response_model=dict)
def create_review(
    target_type: str,
    target_id: int,
    rating: int = 0,
    content: str | None = None,
    user: CurrentUser = None,
    db: DBSession = None,
):
    if target_type not in ("enterprise", "job"):
        raise HTTPException(400, "target_type 必须是 enterprise 或 job")
    if rating not in (1, -1, 0):
        raise HTTPException(400, "rating 必须是 1(点赞) / -1(点踩) / 0(仅点评)")

    if target_type == "enterprise":
        ent = db.get(Enterprise, target_id)
        if not ent:
            raise HTTPException(404, "企业不存在")
    else:
        from app.models.job import JobPosition

        j = db.get(JobPosition, target_id)
        if not j:
            raise HTTPException(404, "岗位不存在")

    existing = (
        db.query(Review)
        .filter(Review.user_id == user.id, Review.target_type == target_type, Review.target_id == target_id)
        .first()
    )
    if existing:
        existing.rating = rating
        existing.content = content
        db.commit()
        db.refresh(existing)
        return success(_serialize(existing))

    r = Review(
        user_id=user.id, target_type=target_type, target_id=target_id,
        rating=rating, content=content, status="approved",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return success(_serialize(r))


@router.get("", response_model=dict)
def list_target_reviews(
    target_type: str,
    target_id: int,
    db: DBSession = None,
):
    rows = (
        db.query(Review)
        .filter(Review.target_type == target_type, Review.target_id == target_id, Review.status == "approved")
        .order_by(Review.created_at.desc())
        .all()
    )
    items = [_serialize(r) for r in rows]
    total = len(items)
    likes = sum(1 for i in items if i["rating"] == 1)
    dislikes = sum(1 for i in items if i["rating"] == -1)
    return success({"items": items, "total": total, "likes": likes, "dislikes": dislikes})


@router.get("/mine", response_model=dict)
def list_my_reviews(user: CurrentUser = None, db: DBSession = None):
    rows = (
        db.query(Review)
        .filter(Review.user_id == user.id)
        .order_by(Review.created_at.desc())
        .all()
    )
    items = [_serialize(r) for r in rows]
    return success({"items": _enrich(db, items), "total": len(items)})


@router.delete("/{review_id}", response_model=dict)
def delete_review(review_id: int, user: CurrentUser = None, db: DBSession = None):
    r = db.get(Review, review_id)
    if not r:
        raise HTTPException(404, "点评不存在")
    if r.user_id != user.id and getattr(user, "role", None) != "admin":
        raise HTTPException(403, "无权删除他人的点评")
    db.delete(r)
    db.commit()
    return success()


@router.get("/summary", response_model=dict)
def review_summary(
    target_type: str,
    target_id: int,
    db: DBSession = None,
):
    likes = (
        db.query(func.count(Review.id))
        .filter(Review.target_type == target_type, Review.target_id == target_id, Review.rating == 1, Review.status == "approved")
        .scalar() or 0
    )
    dislikes = (
        db.query(func.count(Review.id))
        .filter(Review.target_type == target_type, Review.target_id == target_id, Review.rating == -1, Review.status == "approved")
        .scalar() or 0
    )
    comments = (
        db.query(func.count(Review.id))
        .filter(Review.target_type == target_type, Review.target_id == target_id, Review.content.isnot(None), Review.status == "approved")
        .scalar() or 0
    )
    return success({"likes": likes, "dislikes": dislikes, "comments": comments})
