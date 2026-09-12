import json
import os
import io
import uuid
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database import get_db
from models import Resume, User
from security import get_current_user
from schemas import ResumeCreateIn
from config import UPLOAD_DIR
from llm import chat_vision, LLMError

# 允许上传的扩展名 + 大小上限
ALLOWED_EXT = {"jpg", "jpeg", "png", "pdf"}
MAX_UPLOAD_SIZE = 15 * 1024 * 1024  # 15MB


def _extract_pdf_text(path: str) -> str:
    """用 pypdf 逐页提取 PDF 文本并拼接"""
    from pypdf import PdfReader
    reader = PdfReader(path)
    parts = []
    for page in reader.pages:
        t = page.extract_text() or ""
        if t.strip():
            parts.append(t.strip())
    return "\n\n".join(parts)


def _extract_image_text(path: str) -> str:
    """用 GLM-4V 多模态识别图片简历,转写为结构化简历纯文本"""
    from PIL import Image
    img = Image.open(path)
    # 大图缩放到长边 ≤ 2000px,降低多模态 token 消耗
    max_side = 2000
    if max(img.size) > max_side:
        ratio = max_side / max(img.size)
        img = img.resize((int(img.size[0] * ratio), int(img.size[1] * ratio)))
    # 统一转 JPEG RGB,避免 PNG RGBA 等模式问题
    if img.mode != "RGB":
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    b64 = base64.b64encode(buf.getvalue()).decode()
    data_url = f"data:image/jpeg;base64,{b64}"

    prompt = (
        "这是一份简历的截图/照片。请仔细识别图片中的全部文字内容,"
        "并按如下结构化格式整理成纯文本返回(不要返回 JSON,直接返回可读的简历文本):\n\n"
        "姓名:xxx\n电话:xxx\n邮箱:xxx\n学校:xxx\n专业:xxx\n学历:xxx\n\n"
        "技能:\n- xxx\n\n"
        "实习/工作经历:\n时间 公司 岗位\n- 职责描述\n\n"
        "项目经历:\n...\n\n"
        "自我评价:\n...\n\n"
        "请尽可能完整地识别图片里所有信息,不要遗漏,识别不出的留空。只返回整理后的简历文本。"
    )
    return chat_vision(data_url, prompt)

router = APIRouter(prefix="/resumes", tags=["简历"])


def resume_to_dict(r: Resume) -> dict:
    parsed = None
    if r.parsed_content:
        try:
            parsed = json.loads(r.parsed_content)
        except Exception:
            parsed = None
    return {
        "id": r.id,
        "name": r.filename,
        "type": r.filetype,
        "content": r.content or "",
        "updatedAt": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
        "status": r.status,
        "isDefault": bool(r.is_default),
        "parsed": parsed,
    }


@router.get("")
def list_resumes(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(Resume).filter(Resume.user_id == current.id).order_by(Resume.id.desc()).all()
    return [resume_to_dict(r) for r in rows]


@router.post("")
def create_resume(data: ResumeCreateIn, db: Session = Depends(get_db),
                  current: User = Depends(get_current_user)):
    """创建简历(纯文本输入,不再上传文件)"""
    content = (data.content or "").strip()
    if len(content) < 10:
        raise HTTPException(status_code=400, detail="简历内容太短,请至少输入 10 个字符")

    # 第一份简历自动设为默认
    has_any = db.query(Resume).filter(Resume.user_id == current.id).count() > 0
    resume = Resume(
        user_id=current.id,
        filename=data.filename.strip() or "我的简历",
        content=content,
        filetype="文本",
        is_default=not has_any,
        status="待解析",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume_to_dict(resume)


@router.put("/{resume_id}")
def update_resume(resume_id: int, data: ResumeCreateIn, db: Session = Depends(get_db),
                 current: User = Depends(get_current_user)):
    """修改简历文本内容"""
    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="简历不存在")
    content = (data.content or "").strip()
    if len(content) < 10:
        raise HTTPException(status_code=400, detail="简历内容太短,请至少输入 10 个字符")
    r.filename = data.filename.strip() or r.filename
    r.content = content
    # 内容改了,解析结果作废,需重新解析
    r.status = "待解析"
    r.parsed_content = ""
    db.commit()
    return {"msg": "保存成功"}


@router.post("/{resume_id}/default")
def set_default(resume_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(Resume).filter(Resume.user_id == current.id).all()
    target = next((r for r in rows if r.id == resume_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="简历不存在")
    for r in rows:
        r.is_default = (r.id == resume_id)
    db.commit()
    return {"msg": "已设为默认简历"}


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="简历不存在")
    db.delete(r)
    db.commit()
    return {"msg": "删除成功"}


@router.post("/upload")
def upload_resume(file: UploadFile = File(...), filename: str = Form(default=""),
                  db: Session = Depends(get_db),
                  current: User = Depends(get_current_user)):
    """上传简历附件(PDF/图片截图),后端自动提取文本并创建简历记录。

    - PDF:用 pypdf 提取文本
    - 图片:用 GLM-4V 多模态识别转写为结构化简历文本
    提取后存入 Resume.content,status=待解析,后续可复用 AI 解析流程。
    """
    src_name = file.filename or ""
    ext = src_name.rsplit(".", 1)[-1].lower() if "." in src_name else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="仅支持 jpg/jpeg/png/pdf 格式的简历文件")

    raw = file.file.read()
    if len(raw) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="文件过大,请压缩到 15MB 以内")
    if not raw:
        raise HTTPException(status_code=400, detail="文件为空")

    # 保存到 uploads,文件名用 uuid 防冲突
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(stored_path, "wb") as f:
        f.write(raw)

    # 按类型提取文本
    try:
        if ext == "pdf":
            content = _extract_pdf_text(stored_path)
        else:
            content = _extract_image_text(stored_path)
    except LLMError as e:
        raise HTTPException(status_code=500, detail=f"简历内容识别失败,请重试或改用文本输入: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {e}")

    if len(content.strip()) < 10:
        raise HTTPException(status_code=400, detail="未能从文件中提取到有效简历内容,请确认是简历文件或改用文本输入")

    # 简历名称:优先用户传入,回退原文件名(去扩展名)
    name = (filename or src_name).strip()
    if "." in name:
        name = name.rsplit(".", 1)[0]
    if not name:
        name = "我的简历"

    has_any = db.query(Resume).filter(Resume.user_id == current.id).count() > 0
    filetype = "PDF" if ext == "pdf" else "图片"
    resume = Resume(
        user_id=current.id,
        filename=name,
        content=content,
        stored_path=stored_path,
        filetype=filetype,
        is_default=not has_any,
        status="待解析",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return {
        "id": resume.id,
        "filename": resume.filename,
        "filetype": resume.filetype,
        "content": resume.content,
    }
