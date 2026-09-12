import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine
from models import Base
from seed import seed_all
from config import UPLOAD_DIR

# 导入所有模型确保表被注册
import models  # noqa: F401
from routers import auth, jobs, resumes, applications, feedback, interview, ai, admin

# 启动时自动建表 + 种子数据
Base.metadata.create_all(bind=engine)
seed_all()

# ============ 轻量级数据库迁移:给 resume 表加 content 列(兼容旧表) ============
# create_all 只建新表不改旧表,需手动 ALTER 给已存在的 resume 表补列
def _migrate_resume_content_column():
    """如果 resume 表缺 content 列就补上(MySQL)"""
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resume' AND COLUMN_NAME = 'content'"
            ))
            if result.scalar() == 0:
                # MySQL 不允许 TEXT 列设 DEFAULT,用 NULL 默认
                conn.execute(text("ALTER TABLE resume ADD COLUMN content TEXT NULL COMMENT '简历原始文本内容' AFTER filename"))
                conn.commit()
                print("[迁移] resume 表已补 content 列")
    except Exception as e:
        print(f"[迁移] resume 表 content 列检查/补充跳过: {e}")

_migrate_resume_content_column()

app = FastAPI(title="大学生求职与简历优化平台-后端API")

# 跨域(开发环境放开)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 上传文件静态访问(/uploads/xxx.pdf)
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount(f"/{UPLOAD_DIR}", StaticFiles(directory=UPLOAD_DIR), name=UPLOAD_DIR)

# 注册路由
app.include_router(auth.router)
app.include_router(auth.profile_router)
app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(applications.router)
app.include_router(feedback.router)
app.include_router(interview.router)
app.include_router(ai.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"msg": "后端运行中,接口文档见 /docs"}
