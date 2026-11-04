from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.agents import run_graph
from app.core.exceptions import success
from app.database import get_db
from app.dependencies import CurrentUser
from app.models.job import JobPosition, UserCollectJob
from app.models.resume import Resume
from app.models.user import Enterprise
from app.schemas.job import JobMatchOut, JobPositionOut
from app.services.job_recommend import recommend_for_resume

router = APIRouter()


def _job_to_dict(job: JobPosition) -> dict:
    d = JobPositionOut.model_validate(job).model_dump()
    try:
        d["skills"] = json.loads(job.skills) if job.skills else []
    except json.JSONDecodeError:
        d["skills"] = job.skills
    return d


def _keyword_expand(keyword: str) -> list[str]:
    kw = keyword.strip().lower()
    if not kw:
        return []
    mapping = {
        "前端": ["前端", "fe", "frontend", "react", "vue", "angular", "页面"],
        "后端": ["后端", "be", "backend", "server", "接口", "api"],
        "算法": ["算法", "ai", "ml", "机器学习", "深度学习", "大模型", "llm", "智能"],
        "java": ["java", "spring", "jvm"],
        "python": ["python", "django", "fastapi", "flask"],
        "go": ["go", "golang"],
        "测试": ["测试", "qa", "test", "自动化"],
        "数据": ["数据", "bi", "数分", "数据分析"],
        "小米": ["小米", "xiaomi", "雷军", "mi "],
        "腾讯": ["腾讯", "tencent", "微信", "qq", "王者"],
        "阿里": ["阿里", "alibaba", "淘宝", "天猫"],
        "字节": ["字节", "bytedance", "抖音", "头条"],
        "美团": ["美团", "meituan", "外卖"],
        "百度": ["百度", "baidu", "搜索"],
    }
    expanded = {kw}
    for key, aliases in mapping.items():
        if key in kw or any(a in kw for a in aliases):
            expanded.add(key)
            expanded.update(aliases)
    return list(expanded)


@router.get("", response_model=list[dict])
def search_jobs(
    keyword: str | None = None,
    city: str | None = None,
    category: str | None = None,
    job_type: str | None = None,
    salary_min: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(JobPosition).filter(JobPosition.status == "approved")
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(or_(JobPosition.title.like(like), JobPosition.description.like(like)))
    if city:
        q = q.filter(JobPosition.city == city)
    if category:
        q = q.filter(JobPosition.category == category)
    if job_type:
        q = q.filter(JobPosition.job_type == job_type)
    if salary_min is not None:
        q = q.filter(JobPosition.salary_max >= salary_min)
    rows = q.order_by(JobPosition.created_at.desc()).limit(100).all()
    return [_job_to_dict(j) for j in rows]


def _ensure_enterprise(db: Session, company: str) -> Enterprise:
    ent = db.query(Enterprise).filter(Enterprise.company_name == company).first()
    if ent:
        return ent
    base = company.lower().replace(" ", "")[:20]
    suffix = ""
    while True:
        username = f"ai_{base}{suffix}"
        if not db.query(Enterprise).filter(Enterprise.username == username).first():
            break
        suffix = (suffix or 1) + 1
    import bcrypt
    ent = Enterprise(
        username=username,
        password_hash=bcrypt.hashpw(b"ent123456", bcrypt.gensalt()).decode(),
        company_name=company,
        contact_name="AI 搜索",
        industry="互联网/科技",
        intro="由 AI 联网搜索自动入库的岗位信息。",
        role="enterprise",
        status="approved",
        is_active=True,
    )
    db.add(ent)
    db.flush()
    return ent


def _extract_company(keyword: str) -> str | None:
    kw = keyword.lower()
    companies = [
        "小米", "xiaomi", "雷军", "华为", "huawei", "阿里", "alibaba", "淘宝", "天猫",
        "腾讯", "tencent", "微信", "qq", "字节", "bytedance", "抖音", "今日头条",
        "美团", "meituan", "百度", "baidu", "网易", "netease", "京东", "jd",
        "拼多多", "pdd", "shopee", "temu", "蚂蚁", "蚂蚁金服", "蚂蚁集团",
        "滴滴", "快手", "b站", "哔哩哔哩", "bing", "微软", "google", "苹果",
        "amazon", "facebook", "meta", "tesla", "三星", "oppo", "vivo", "荣耀",
    ]
    for c in companies:
        if c.lower() in kw:
            return c.lower()
    return None


def _local_has_company(db: Session, company: str) -> bool:
    rows = db.query(JobPosition.company).filter(JobPosition.status == "approved").all()
    companies = {r[0].lower() for r in rows if r[0]}
    for stored in companies:
        if company in stored or stored in company:
            return True
    return False


def _local_search(db: Session, keyword: str) -> list[JobPosition]:
    expanded = _keyword_expand(keyword)
    rows = (
        db.query(JobPosition)
        .filter(JobPosition.status == "approved")
        .filter(
            or_(
                *[JobPosition.title.like(f"%{k}%") for k in expanded],
                *[JobPosition.company.like(f"%{k}%") for k in expanded],
                *[JobPosition.description.like(f"%{k}%") for k in expanded],
                *[JobPosition.requirement.like(f"%{k}%") for k in expanded],
            )
        )
        .order_by(JobPosition.created_at.desc())
        .limit(50)
        .all()
    )
    seen: set[int] = set()
    uniq: list[JobPosition] = []
    for j in rows:
        if j.id not in seen:
            seen.add(j.id)
            uniq.append(j)
    return uniq


@router.get("/ai-search", response_model=list[dict])
async def ai_search_jobs(
    keyword: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """AI 联网搜职位：跳过本地数据库，直接调用 LLM 联网搜索最新真实岗位并入库缓存。"""
    try:
        result = await run_graph("job_search", keyword=keyword)
    except Exception:
        result = {}
    raw_jobs = result.get("job_search_results") or []
    if not raw_jobs:
        return []

    new_rows: list[JobPosition] = []
    for item in raw_jobs:
        company = item.get("company") or ""
        if not company:
            continue
        existing = (
            db.query(JobPosition)
            .filter(
                JobPosition.company == company,
                JobPosition.title == item.get("title", ""),
            )
            .first()
        )
        if existing:
            continue
        ent = _ensure_enterprise(db, company)
        new_rows.append(
            JobPosition(
                enterprise_id=ent.id,
                title=item.get("title", ""),
                company=company,
                city=item.get("city") or None,
                salary_min=item.get("salary_min") or None,
                salary_max=item.get("salary_max") or None,
                experience=item.get("experience") or None,
                education=item.get("education") or None,
                job_type=item.get("job_type") or None,
                category=item.get("category") or None,
                description=item.get("description") or None,
                requirement=item.get("requirement") or None,
                skills=item.get("skills") or None,
                status="approved",
            )
        )
    if new_rows:
        db.add_all(new_rows)
        db.commit()
        for r in new_rows:
            db.refresh(r)

    return [_job_to_dict(j) for j in new_rows] or []


@router.get("/ai-recommend", response_model=list[dict])
async def ai_recommend_jobs(
    resume_id: int | None = Query(None, description="简历ID，不传则用用户最新简历"),
    user: CurrentUser = None,
    db: Session = Depends(get_db),
):
    """AI 智能推荐：根据简历联网搜岗 + 逐岗位匹配打分 + 排序返回。"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录")

    resume = None
    if resume_id:
        resume = db.get(Resume, resume_id)
        if resume and resume.user_id != user.id:
            resume = None
    if resume is None:
        resume = (
            db.query(Resume)
            .filter(Resume.user_id == user.id)
            .order_by(Resume.is_default.desc(), Resume.created_at.desc())
            .first()
        )
    if resume is None:
        raise HTTPException(status_code=404, detail="未找到简历，请先上传")

    try:
        content = json.loads(resume.content) if resume.content else {}
    except (json.JSONDecodeError, TypeError):
        content = {"raw_text": resume.raw_text or resume.content or ""}

    content.setdefault("education", user.education or "")
    content.setdefault("major", user.major or "")

    results = await recommend_for_resume(content)
    return results


@router.get("/recommend", response_model=list[dict])
async def recommend_jobs(user: CurrentUser, db: Session = Depends(get_db)):
    rows = db.query(JobPosition).filter(JobPosition.status == "approved").limit(50).all()
    major = (user.major or "").lower()
    education = user.education or ""
    scored = []
    for j in rows:
        score = 0
        text = f"{j.title} {j.description or ''} {j.requirement or ''}".lower()
        if major and major in text:
            score += 3
        if education and (j.education or "") in (education, ""):
            score += 1
        scored.append((score, j))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [_job_to_dict(j) for _, j in scored[:10]]


@router.get("/me/collected", response_model=list[dict])
def my_collected_jobs(user: CurrentUser, db: Session = Depends(get_db)):
    ids = [c.job_id for c in db.query(UserCollectJob).filter(UserCollectJob.user_id == user.id).all()]
    if not ids:
        return []
    rows = db.query(JobPosition).filter(JobPosition.id.in_(ids)).all()
    return [_job_to_dict(j) for j in rows]


@router.get("/{job_id}", response_model=dict)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(JobPosition, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    return _job_to_dict(job)


@router.post("/{job_id}/collect", response_model=dict)
def collect_job(job_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    existing = db.query(UserCollectJob).filter(
        UserCollectJob.user_id == user.id, UserCollectJob.job_id == job_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return success("已取消收藏")
    db.add(UserCollectJob(user_id=user.id, job_id=job_id))
    db.commit()
    return success("已收藏")


@router.post("/{job_id}/match", response_model=JobMatchOut)
async def match_job(job_id: int, resume_id: int = Query(...), user: CurrentUser = None, db: Session = Depends(get_db)):
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    job = db.get(JobPosition, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    content = json.loads(resume.content) if resume.content else {}
    result = await run_graph("match", resume_content=content, job=_job_to_dict(job))
    match = result.get("match", {})
    user.ai_quota -= 1
    db.commit()
    return JobMatchOut(
        job_id=job_id,
        match_score=match.get("match_score", 0),
        matched_skills=match.get("matched_skills", []),
        missing_skills=match.get("missing_skills", []),
        analysis=match.get("analysis", ""),
    )


@router.get("/{job_id}/risk", response_model=dict)
async def job_risk_hint(job_id: int, resume_id: int = Query(...), user: CurrentUser = None, db: Session = Depends(get_db)):
    job = db.get(JobPosition, job_id)
    resume = db.get(Resume, resume_id)
    if not job or not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="数据不存在")
    from app.services.job_match import keyword_risk_hint

    content = json.loads(resume.content) if resume.content else {}
    hint = keyword_risk_hint(content, _job_to_dict(job))
    return success({"risk_hint": hint or "暂未发现明显风险"})
