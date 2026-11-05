"""API 路由聚合。"""
from fastapi import APIRouter

from app.api import (
    admin,
    apply,
    auth,
    enterprise,
    exam,
    feedback,
    interview,
    job,
    messages,
    resume,
    review,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(resume.router, prefix="/resumes", tags=["简历管理"])
api_router.include_router(job.router, prefix="/jobs", tags=["岗位模块"])
api_router.include_router(apply.router, prefix="/applies", tags=["求职投递"])
api_router.include_router(interview.router, prefix="/interviews", tags=["AI 面试"])
api_router.include_router(exam.router, prefix="/exams", tags=["AI 笔试"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["用户反馈"])
api_router.include_router(review.router, prefix="/reviews", tags=["点赞/点评"])
api_router.include_router(admin.router, prefix="/admin", tags=["平台管理端"])
api_router.include_router(enterprise.router, prefix="/enterprise", tags=["企业账号"])
api_router.include_router(messages.router, prefix="/messages", tags=["系统公告"])
