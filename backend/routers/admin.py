import io
import csv
import re
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User, Job, Resume, Feedback, AiFeedback, InterviewSession,
    AiPromptTemplate, InterviewQuestionBank, AdminOperationLog
)
from security import get_current_user, hash_password

router = APIRouter(prefix="/admin", tags=["管理员后台"])


def _is_admin(current: User = Depends(get_current_user)):
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return current


def _log_action(db: Session, admin_id: int, action: str, target: str, detail: str = ""):
    db.add(AdminOperationLog(admin_id=admin_id, action=action, target=target, detail=detail))
    db.commit()


# ============== 仪表盘 ==============
@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    """平台数据统计"""
    stats = {
        "users": db.query(User).filter(User.role == "student").count(),
        "active_users": db.query(User).filter(User.role == "student", User.is_active == True).count(),
        "jobs": db.query(Job).filter(Job.status == "online").count(),
        "resumes": db.query(Resume).count(),
        "interviews": db.query(InterviewSession).count(),
        "feedbacks": db.query(Feedback).count(),
    }
    # 最近 7 天趋势
    from datetime import timedelta
    week_ago = datetime.now() - timedelta(days=7)
    stats["week_interviews"] = db.query(InterviewSession).filter(InterviewSession.started_at >= week_ago).count()
    stats["week_feedbacks"] = db.query(Feedback).filter(Feedback.created_at >= week_ago).count()

    # 岗位热度 Top5
    from models import Collect
    hot_jobs = db.query(Job.id, Job.title, Job.company, func.count(Collect.id).label("collect_count")) \
        .outerjoin(Collect, Collect.job_id == Job.id) \
        .group_by(Job.id).order_by(func.count(Collect.id).desc()).limit(5).all()
    stats["hot_jobs"] = [{"id": j.id, "title": j.title, "company": j.company, "collects": j.collect_count or 0} for j in hot_jobs]

    return stats


# ============== 用户管理 ==============
@router.get("/users")
def list_users(keyword: str = "", is_active: bool | None = None,
               db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(User).filter(User.role == "student")
    if keyword:
        q = q.filter((User.username.contains(keyword)) | (User.name.contains(keyword)))
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    users = q.order_by(User.created_at.desc()).all()
    return [{
        "id": u.id, "username": u.username, "name": u.name, "phone": u.phone,
        "school": u.school, "major": u.major, "is_active": u.is_active,
        "created_at": u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "",
    } for u in users]


@router.post("/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    u = db.query(User).filter(User.id == user_id, User.role == "student").first()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    u.is_active = not u.is_active
    db.commit()
    _log_action(db, admin.id, "toggle_user", f"user_{user_id}", f"is_active={u.is_active}")
    return {"msg": f"账号已{'启用' if u.is_active else '禁用'}", "is_active": u.is_active}


# ============== 岗位管理 ==============
@router.get("/jobs")
def admin_list_jobs(keyword: str = "", status: str = "",
                    db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(Job)
    if keyword:
        q = q.filter((Job.title.contains(keyword)) | (Job.company.contains(keyword)))
    if status:
        q = q.filter(Job.status == status)
    jobs = q.order_by(Job.created_at.desc()).all()
    return [{
        "id": j.id, "title": j.title, "company": j.company, "salary": j.salary,
        "city": j.city, "status": j.status, "is_reviewed": j.is_reviewed,
        "created_at": j.created_at.strftime("%Y-%m-%d %H:%M") if j.created_at else "",
    } for j in jobs]


@router.post("/jobs/{job_id}/toggle")
def toggle_job(job_id: int, db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    j = db.query(Job).filter(Job.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="岗位不存在")
    j.status = "online" if j.status != "online" else "offline"
    db.commit()
    _log_action(db, admin.id, "toggle_job", f"job_{job_id}", f"status={j.status}")
    return {"msg": f"已{'上架' if j.status == 'online' else '下架'}", "status": j.status}


@router.post("/jobs")
def create_job(data: dict, db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    """管理员发布岗位"""
    tags = data.get("tags", [])
    reqs = data.get("requirements", [])
    j = Job(
        title=data.get("title", ""), company=data.get("company", ""),
        salary=data.get("salary", ""), city=data.get("city", ""),
        experience=data.get("experience", ""), education=data.get("education", ""),
        description=data.get("description", ""),
        tags=json.dumps(tags, ensure_ascii=False) if isinstance(tags, list) else tags,
        requirements=json.dumps(reqs, ensure_ascii=False) if isinstance(reqs, list) else reqs,
        logo=data.get("logo", "岗"), logo_color=data.get("logo_color", "#4f6ef7"),
        status="online", is_reviewed=True,
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    _log_action(db, admin.id, "create_job", f"job_{j.id}", j.title)
    return {"id": j.id, "msg": "岗位发布成功"}


# 批量导入模板的列顺序(表头必须一致)
JOB_IMPORT_HEADERS = [
    "岗位名称", "公司名称", "薪资范围", "城市", "经验要求", "学历要求",
    "标签", "岗位职责", "任职要求",
]
# 导入示例行
JOB_IMPORT_EXAMPLE = [
    "前端开发工程师", "字节跳动", "15-25K", "深圳", "1-3年", "本科",
    "Vue,React,TypeScript",
    "1.负责 Web 前端产品开发与维护\n2.与后端协作完成接口联调\n3.持续优化页面性能与用户体验",
    "1.本科及以上学历,计算机相关专业\n2.熟练掌握 Vue/React 至少一个框架\n3.有良好的编码习惯",
]


@router.get("/jobs/template")
def download_job_template(admin: User = Depends(_is_admin)):
    """下载岗位批量导入 Excel 模板(含表头 + 一行示例)"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = Workbook()
    ws = wb.active
    ws.title = "岗位导入"
    ws.append(JOB_IMPORT_HEADERS)
    ws.append(JOB_IMPORT_EXAMPLE)

    # 表头加粗 + 底色
    head_font = Font(bold=True, color="FFFFFF")
    head_fill = PatternFill("solid", fgColor="4F6EF7")
    for cell in ws[1]:
        cell.font = head_font
        cell.fill = head_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
    # 列宽
    widths = [18, 18, 12, 10, 12, 10, 24, 40, 40]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[chr(64 + i)].width = w
    ws.row_dimensions[2].height = 60
    for row in ws.iter_rows(min_row=2, max_row=2):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=job_import_template.xlsx"},
    )


def _parse_job_rows(raw: bytes, filename: str) -> list[list[str]]:
    """解析 xlsx/csv 文件为二维数组(含表头),统一返回字符串单元格"""
    name = (filename or "").lower()
    if name.endswith(".csv"):
        # utf-8-sig 兼容 Excel 导出的带 BOM 的 CSV
        text = raw.decode("utf-8-sig", errors="ignore")
        reader = csv.reader(io.StringIO(text))
        return [[(c or "").strip() for c in row] for row in reader]
    if name.endswith(".xlsx") or name.endswith(".xls"):
        from openpyxl import load_workbook
        wb = load_workbook(io.BytesIO(raw), data_only=True)
        ws = wb.active
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([("" if c is None else str(c)).strip() for c in row])
        return rows
    raise HTTPException(status_code=400, detail="仅支持 .xlsx / .csv 格式文件")


@router.post("/jobs/batch")
def batch_create_jobs(file: UploadFile = File(...),
                      db: Session = Depends(get_db),
                      admin: User = Depends(_is_admin)):
    """批量导入岗位:上传按模板填写的 Excel/CSV,一次创建多个岗位。

    规则:岗位名称、公司名称必填,缺失的行跳过并记录;
    标签按逗号/顿号分隔,任职要求按换行分隔。
    """
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="文件为空")
    rows = _parse_job_rows(raw, file.filename)
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="文件中没有数据行,请按模板填写岗位后再导入")

    # 校验表头
    header = rows[0][:len(JOB_IMPORT_HEADERS)]
    if header != JOB_IMPORT_HEADERS:
        raise HTTPException(
            status_code=400,
            detail="表头与模板不一致,请先下载导入模板并按模板列顺序填写",
        )

    success, skipped = 0, []
    for idx, row in enumerate(rows[1:], start=2):  # 行号从 2 开始(第 1 行表头)
        # 缺列补齐
        row = (row + [""] * len(JOB_IMPORT_HEADERS))[:len(JOB_IMPORT_HEADERS)]
        title, company, salary, city, exp, edu, tags, desc, reqs = row

        if not title or not company:
            skipped.append({"row": idx, "reason": "岗位名称或公司名称为空"})
            continue

        # 标签:中英文逗号、顿号切分
        tag_list = [t.strip() for t in _split_tags(tags) if t.strip()]
        # 任职要求:换行切分
        req_list = [r.strip(" -·\t") for r in reqs.replace("；", "\n").split("\n") if r.strip()]

        db.add(Job(
            title=title, company=company, salary=salary, city=city,
            experience=exp, education=edu,
            tags=json.dumps(tag_list, ensure_ascii=False),
            requirements=json.dumps(req_list, ensure_ascii=False),
            description=desc,
            logo="岗", logo_color="#4f6ef7",
            status="online", is_reviewed=True,
        ))
        success += 1

    if success == 0:
        raise HTTPException(status_code=400, detail="没有可导入的有效数据行,请检查必填列")

    db.commit()
    _log_action(db, admin.id, "batch_create_job", "jobs", f"批量导入 {success} 个岗位,跳过 {len(skipped)} 行")
    return {"success": success, "skipped_count": len(skipped), "skipped": skipped[:20],
            "msg": f"成功导入 {success} 个岗位" + (f",{len(skipped)} 行被跳过" if skipped else "")}


def _split_tags(text: str):
    """按中英文逗号、顿号、分号切分标签"""
    return re.split(r"[,，、;；]", text)


# ============== 简历审核 ==============
@router.get("/resumes")
def admin_list_resumes(review_status: str = "",
                       db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(Resume)
    if review_status:
        q = q.filter(Resume.review_status == review_status)
    resumes = q.order_by(Resume.created_at.desc()).all()
    result = []
    for r in resumes:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id, "filename": r.filename, "filetype": r.filetype,
            "status": r.status, "review_status": r.review_status,
            "review_comment": r.review_comment or "",
            "username": user.username if user else "",
            "user_name": user.name if user else "",
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
        })
    return result


@router.post("/resumes/{resume_id}/review")
def review_resume(resume_id: int, body: dict = Body(...),
                  db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    r = db.query(Resume).filter(Resume.id == resume_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="简历不存在")
    # 兼容前端 approved/rejected 和中文 已通过/未通过
    status = body.get("review_status") or body.get("status") or ""
    comment = body.get("comment") or body.get("remark") or ""
    if status in ("approved", "已通过"):
        r.review_status = "已通过"
    elif status in ("rejected", "未通过"):
        r.review_status = "未通过"
    else:
        r.review_status = "待审核"
    r.review_comment = comment
    db.commit()
    _log_action(db, admin.id, "review_resume", f"resume_{resume_id}", f"status={r.review_status}")
    return {"msg": "审核完成", "review_status": r.review_status}


# ============== AI 提示词模板 ==============
@router.get("/prompts")
def list_prompts(scene: str = "", db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(AiPromptTemplate)
    if scene:
        q = q.filter(AiPromptTemplate.scene == scene)
    prompts = q.order_by(AiPromptTemplate.id.desc()).all()
    return [{
        "id": p.id, "name": p.name, "scene": p.scene,
        "template": p.template, "is_default": p.is_default,
        "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else "",
    } for p in prompts]


@router.post("/prompts")
def create_prompt(data: dict, db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    p = AiPromptTemplate(
        name=data.get("name", ""), scene=data.get("scene", "简历诊断"),
        template=data.get("template", ""), is_default=data.get("is_default", False),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    _log_action(db, admin.id, "create_prompt", f"prompt_{p.id}", p.name)
    return {"id": p.id, "msg": "创建成功"}


@router.put("/prompts/{prompt_id}")
def update_prompt(prompt_id: int, data: dict,
                  db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    p = db.query(AiPromptTemplate).filter(AiPromptTemplate.id == prompt_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="模板不存在")
    for k in ("name", "scene", "template"):
        if k in data:
            setattr(p, k, data[k])
    if "is_default" in data:
        p.is_default = data["is_default"]
    db.commit()
    _log_action(db, admin.id, "update_prompt", f"prompt_{prompt_id}", p.name)
    return {"msg": "更新成功"}


@router.delete("/prompts/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    p = db.query(AiPromptTemplate).filter(AiPromptTemplate.id == prompt_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="模板不存在")
    db.delete(p)
    db.commit()
    _log_action(db, admin.id, "delete_prompt", f"prompt_{prompt_id}", "")
    return {"msg": "删除成功"}


# ============== 面试题库 ==============
@router.get("/questions")
def list_questions(category: str = "", db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(InterviewQuestionBank)
    if category:
        q = q.filter(InterviewQuestionBank.category == category)
    return [{
        "id": q.id, "question": q.question, "category": q.category,
        "difficulty": q.difficulty, "tags": q.tags,
    } for q in q.order_by(InterviewQuestionBank.id.desc()).all()]


@router.post("/questions")
def create_question(data: dict, db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = InterviewQuestionBank(
        question=data.get("question", ""), category=data.get("category", "技术"),
        difficulty=data.get("difficulty", 1), tags=data.get("tags", ""),
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    _log_action(db, admin.id, "create_question", f"question_{q.id}", "")
    return {"id": q.id, "msg": "添加成功"}


@router.delete("/questions/{qid}")
def delete_question(qid: int, db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(InterviewQuestionBank).filter(InterviewQuestionBank.id == qid).first()
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")
    db.delete(q)
    db.commit()
    return {"msg": "删除成功"}


# ============== AI 反馈/质量监控 ==============
@router.get("/ai-feedbacks")
def list_ai_feedbacks(source_type: str = "", db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(AiFeedback)
    if source_type:
        q = q.filter(AiFeedback.source_type == source_type)
    return [{
        "id": f.id, "source_type": f.source_type, "source_id": f.source_id,
        "feedback_type": f.feedback_type, "comment": f.comment or "",
        "created_at": f.created_at.strftime("%Y-%m-%d %H:%M") if f.created_at else "",
    } for f in q.order_by(AiFeedback.created_at.desc()).all()]


# ============== 操作日志 ==============
@router.get("/logs")
def list_logs(action: str = "", db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(AdminOperationLog)
    if action:
        q = q.filter(AdminOperationLog.action.contains(action))
    return [{
        "id": l.id, "action": l.action, "target": l.target,
        "detail": l.detail or "",
        "created_at": l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else "",
    } for l in q.order_by(AdminOperationLog.id.desc()).limit(100).all()]


# ============== 反馈管理 ==============
@router.get("/feedbacks")
def admin_list_feedbacks(status: str = "", db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    q = db.query(Feedback)
    if status:
        q = q.filter(Feedback.status == status)
    result = []
    for f in q.order_by(Feedback.created_at.desc()).all():
        u = db.query(User).filter(User.id == f.user_id).first()
        result.append({
            "id": f.id, "username": u.username if u else "",
            "category": f.category, "fb_type": f.fb_type, "content": f.content,
            "status": f.status,
            "created_at": f.created_at.strftime("%Y-%m-%d %H:%M") if f.created_at else "",
        })
    return result


@router.post("/feedbacks/{fb_id}/handle")
def handle_feedback(fb_id: int, status: str = "已采纳",
                    db: Session = Depends(get_db), admin: User = Depends(_is_admin)):
    f = db.query(Feedback).filter(Feedback.id == fb_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="反馈不存在")
    f.status = status
    db.commit()
    _log_action(db, admin.id, "handle_feedback", f"feedback_{fb_id}", status)
    return {"msg": "处理完成"}
