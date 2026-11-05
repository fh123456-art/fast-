"""FastAPI 应用入口。"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.database import init_db
from app.api import api_router


STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动：建表
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="大学生求职与简历优化平台后端（FastAPI + SQLAlchemy + LangGraph）",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_cache_static(request, call_next):
    response = await call_next(request)
    p = request.url.path
    if p.startswith("/static/") or p.endswith(".html") or p in ("/",):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

register_exception_handlers(app)

app.include_router(api_router, prefix="/api")

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def index() -> FileResponse:
    html_path = STATIC_DIR / "index.html"
    js_ts = int((STATIC_DIR / "js" / "app.js").stat().st_mtime)
    html = html_path.read_text(encoding="utf-8")
    html = html.replace("app.js?v=20261026e", f"app.js?v={js_ts}")
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@app.get("/login")
def login() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "login.html"))


@app.get("/admin")
def admin() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "admin.html"))


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME}
