"""简历管理路由：上传解析、多版本 CRUD、模板、敏感检测、AI 润色、导出 PDF。"""
from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.agents import run_graph
from app.config import settings
from app.core.exceptions import success
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.models.resume import Resume, ResumeTemplate
from app.schemas.resume import (
    ResumeCreate,
    ResumeDiagnoseOut,
    ResumeOut,
    ResumeParseOut,
    ResumeTemplateOut,
    ResumeUpdate,
)
from app.utils.pdf_export import render_resume_pdf

router = APIRouter()


def _to_dict(resume: Resume) -> dict:
    from app.services.resume_parser import normalize_resume

    data = ResumeOut.model_validate(resume).model_dump()
    try:
        raw = json.loads(resume.content) if resume.content else {}
    except json.JSONDecodeError:
        raw = {}
    data["content"] = normalize_resume(raw)
    return data


@router.get("/templates", response_model=list[ResumeTemplateOut])
def list_templates(db: Session = Depends(get_db)):
    return db.query(ResumeTemplate).filter(ResumeTemplate.is_active == 1).all()


@router.post("/templates", response_model=dict)
def create_template(
    name: str,
    layout: str = "classic",
    category: str | None = None,
    content: str | None = None,
    user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    tpl = ResumeTemplate(name=name, layout=layout, category=category, content=content)
    db.add(tpl)
    db.commit()
    return success({"id": tpl.id})


@router.get("", response_model=list[dict])
def list_resumes(user: CurrentUser, db: Session = Depends(get_db)):
    rows = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.updated_at.desc()).all()
    return [_to_dict(r) for r in rows]


@router.post("", response_model=dict)
def create_resume(payload: ResumeCreate, user: CurrentUser, db: Session = Depends(get_db)):
    from app.services.resume_parser import normalize_resume

    count = db.query(Resume).filter(Resume.user_id == user.id).count()
    if count >= user.resume_limit:
        raise HTTPException(status_code=400, detail=f"简历数量已达上限 {user.resume_limit}")
    version = (db.query(Resume).filter(Resume.user_id == user.id).count()) + 1
    normalized = normalize_resume(payload.content)
    resume = Resume(
        user_id=user.id,
        title=payload.title,
        version=version,
        template_id=payload.template_id,
        content=json.dumps(normalized, ensure_ascii=False),
        source_file=payload.source_file,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return success({"id": resume.id})


@router.get("/{resume_id}", response_model=dict)
def get_resume(resume_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    return _to_dict(resume)


@router.put("/{resume_id}", response_model=dict)
def update_resume(resume_id: int, payload: ResumeUpdate, user: CurrentUser, db: Session = Depends(get_db)):
    from app.services.resume_parser import normalize_resume

    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    if payload.title is not None:
        resume.title = payload.title
    if payload.template_id is not None:
        resume.template_id = payload.template_id
    if payload.content is not None:
        resume.content = json.dumps(normalize_resume(payload.content), ensure_ascii=False)
    if payload.is_default is not None:
        db.query(Resume).filter(Resume.user_id == user.id, Resume.is_default == 1).update({Resume.is_default: 0})
        resume.is_default = 1 if payload.is_default else 0
    db.commit()
    return success()


@router.delete("/{resume_id}", response_model=dict)
def delete_resume(resume_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    from app.models.job import JobApply
    db.query(JobApply).filter(JobApply.resume_id == resume_id).delete(synchronize_session=False)
    db.delete(resume)
    db.commit()
    return success()


@router.post("/parse", response_model=ResumeParseOut)
async def parse_uploaded_resume(
    file: UploadFile = File(...),
    user: CurrentUser = None,
    db: Session = Depends(get_db),
):
    """上传 PDF/Word 简历自动解析（思维导图：上传PDF/Word简历自动解析 + 敏感信息检测）。"""
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in (".pdf", ".docx", ".doc", ".txt"):
        raise HTTPException(status_code=400, detail="仅支持 PDF / Word / TXT")
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    save_path = upload_dir / f"{uuid.uuid4().hex}{suffix}"
    with open(save_path, "wb") as f:
        f.write(file.file.read())

    from app.services.resume_parser import extract_text_from_file, normalize_resume

    raw_text = extract_text_from_file(str(save_path))
    result = await run_graph("parse", resume_text=raw_text)
    structured = normalize_resume(result.get("parsed_resume", {}))
    hits = result.get("sensitive_hits", [])

    user.ai_quota -= 1
    db.commit()
    return ResumeParseOut(
        raw_text=raw_text,
        structured=structured,
        sensitive_hits=hits,
        source_file=str(save_path.relative_to(upload_dir.parent)).replace("\\", "/"),
        original_filename=file.filename or f"resume{suffix}",
    )


@router.post("/{resume_id}/diagnose", response_model=ResumeDiagnoseOut)
async def diagnose_resume(resume_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """简历诊断 Agent：分析优缺点、修改建议、AI 润色片段。"""
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    content = json.loads(resume.content) if resume.content else {}
    result = await run_graph("diagnose", resume_content=content)
    user.ai_quota -= 1
    db.commit()
    return result.get("diagnose", {})


@router.post("/{resume_id}/polish", response_model=dict)
async def polish_resume_segment(
    resume_id: int,
    segment: str = Query(...),
    user: CurrentUser = None,
    db: Session = Depends(get_db),
):
    """AI 一键润色改写简历片段。"""
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    from app.services.resume_diagnose import polish_segment

    polished = await polish_segment(segment)
    user.ai_quota -= 1
    db.commit()
    return success({"polished": polished})


@router.post("/{resume_id}/cover-letter", response_model=dict)
async def generate_cover_letter_for_job(
    resume_id: int,
    job_id: int = Query(...),
    user: CurrentUser = None,
    db: Session = Depends(get_db),
):
    """AI 定制求职信：结合简历真实经历与岗位 JD 生成，扣 1 次 AI 配额，不落库。"""
    if user.ai_quota <= 0:
        raise HTTPException(status_code=403, detail="AI 调用次数已用尽")
    from app.models.job import JobPosition
    from app.services.cover_letter import generate_cover_letter

    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    job = db.get(JobPosition, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    job_info = {
        "title": job.title,
        "company": job.company,
        "city": job.city,
        "job_type": job.job_type,
        "description": job.description,
        "requirement": job.requirement,
    }
    content = json.loads(resume.content) if resume.content else {}
    result = await generate_cover_letter(content, job_info)
    user.ai_quota -= 1
    db.commit()
    return success(result)


@router.get("/{resume_id}/export")
def export_resume_pdf(resume_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """简历预览、导出 PDF。"""
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    content = json.loads(resume.content) if resume.content else {}
    pdf_bytes = render_resume_pdf(content)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="resume_{resume_id}.pdf"'
    })


@router.get("/{resume_id}/source")
def download_source_file(resume_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """下载用户上传的原简历文件（PDF/Word/TXT）。"""
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    if not resume.source_file:
        raise HTTPException(status_code=404, detail="该简历没有上传源文件")
    upload_dir = Path(settings.UPLOAD_DIR).parent
    file_path = upload_dir / resume.source_file
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="源文件已丢失")
    suffix = file_path.suffix.lower()
    media = {".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".doc": "application/msword", ".txt": "text/plain"}.get(suffix, "application/octet-stream")
    return FileResponse(str(file_path), media_type=media, filename=resume.title + suffix)

SKILLS_PROMPT = """你是资深招聘专家。阅读下面的简历，从招聘视角给出 6 项核心能力维度评分 + 详细文字诊断。

6 项能力维度（根据简历灵活措辞，但数量固定为 6 项）：
- 技术栈熟练度（编程语言/框架/工具的掌握深度）
- 项目实战经验（项目复杂度、个人贡献、产出质量）
- 教育背景（学校层次、专业匹配度、学历）
- 实习/工作经历（公司质量、岗位相关性、时长与密度）
- 软技能（沟通、协作、学习能力、领导力体现）
- 行业/岗位适配度（当前技能与目标岗位的契合程度）

严格只返回 JSON，字段如下：
{
  "dimensions": ["技术熟练度", "项目经验", "教育背景", "实习经历", "软技能", "岗位匹配"],
  "scores": [85, 72, 90, 60, 78, 82],
  "level": "初级",
  "summary": "一句话总结候选人整体竞争力画像",
  "strengths": ["技术栈覆盖面广，Python/Java 均有实际项目落地", "项目经验丰富，有多端开发完整作品"],
  "improvements": ["缺少大厂实习经历，背书较弱", "系统架构设计经验不足，可深入学习"],
  "advice": "建议补充 1-2 份与目标岗位高度相关的实习，或通过开源项目/竞赛补强项目背书；在技术栈上聚焦 1-2 门深挖底层原理。"
}

level 取值（参考 6 维度平均分）：
- 平均分 >= 80 → "准高级"
- 平均分 >= 65 且 < 80 → "中级"
- 平均分 >= 50 且 < 65 → "初级"
- 平均分 < 50 → "入门"
"""


@router.get("/{resume_id}/skills", response_model=dict)
async def analyze_resume_skills(resume_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    """AI 分析简历能力画像，返回雷达图数据（维度+分数+一句话总结）。"""
    resume = db.get(Resume, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="简历不存在")
    content = json.loads(resume.content) if resume.content else {}
    text = json.dumps(content, ensure_ascii=False)[:4000]

    defaults = {
        "dimensions": ["技术熟练度", "项目经验", "教育背景", "实习经历", "软技能", "岗位匹配"],
        "scores": [60, 60, 60, 60, 60, 60],
        "summary": "AI 暂时不可用，已给出默认评分。请稍后重试。",
        "level": "初级",
        "avg_score": 60,
        "strengths": [],
        "improvements": [],
        "advice": "",
    }

    try:
        from app.services.llm_client import chat_complete, parse_json_output
        raw = await chat_complete(SKILLS_PROMPT, text, temperature=0.3, json_mode=True)
        parsed = parse_json_output(raw)
        if not isinstance(parsed, dict):
            parsed = {}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("AI skills analyze failed: %s", e)
        return success(defaults)

    dims = parsed.get("dimensions") or []
    scores = parsed.get("scores") or []
    if len(dims) != 6 or len(scores) != 6:
        dims = (list(dims) + defaults["dimensions"])[:6]
        scores = [int(s) if isinstance(s, (int, float)) else 60 for s in (list(scores) + [60] * 6)[:6]]
    else:
        scores = [max(0, min(100, int(s))) for s in scores]

    avg = sum(scores) / len(scores) if scores else 60
    lvl = parsed.get("level") if parsed.get("level") else (
        "准高级" if avg >= 80 else "中级" if avg >= 65 else "初级" if avg >= 50 else "入门"
    )

    strengths = parsed.get("strengths") or []
    improvements = parsed.get("improvements") or []
    if not isinstance(strengths, list): strengths = []
    if not isinstance(improvements, list): improvements = []
    strengths = [str(s) for s in strengths][:4]
    improvements = [str(s) for s in improvements][:4]
    advice = str(parsed.get("advice", ""))[:500]

    return success({
        "dimensions": dims,
        "scores": scores,
        "summary": str(parsed.get("summary", ""))[:200] or defaults["summary"],
        "level": lvl,
        "avg_score": round(avg, 1),
        "strengths": strengths,
        "improvements": improvements,
        "advice": advice,
    })
