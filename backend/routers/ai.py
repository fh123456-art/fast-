"""AI 能力路由:简历解析 + 岗位匹配(均调用智谱 GLM-4-Flash 真实大模型)"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Resume, User, Job, AiFeedback
from security import get_current_user
from llm import chat_json, chat, LLMError

router = APIRouter(prefix="/ai", tags=["AI能力"])


def _parse_json(s, default):
    try:
        return json.loads(s) if s else default
    except Exception:
        return default


@router.post("/resumes/{resume_id}/parse")
def parse_resume(resume_id: int, db: Session = Depends(get_db),
                 current: User = Depends(get_current_user)):
    """AI 简历解析:用大模型从简历文本提取结构化信息 + 给出诊断建议"""
    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="简历不存在")

    text = r.content or ""
    if len(text) < 10:
        raise HTTPException(status_code=400, detail="简历内容为空或太短,请先填写简历内容")

    # === 第一步:大模型提取结构化信息 ===
    parse_system = (
        "你是一名专业的简历解析助手。请从用户提供的简历文本中提取结构化信息,"
        "严格以 JSON 格式返回,字段如下:\n"
        '- "name": 姓名(字符串)\n'
        '- "phone": 电话(字符串,没有则空)\n'
        '- "email": 邮箱(字符串,没有则空)\n'
        '- "school": 学校(字符串)\n'
        '- "major": 专业(字符串)\n'
        '- "degree": 学历(如 本科/硕士/大专,字符串)\n'
        '- "skills": 技能列表(字符串数组,如 ["Vue","JavaScript","MySQL"])\n'
        '- "experience": 工作/实习/项目经历摘要(字符串,200字以内)\n'
        '- "evaluation": 自我评价摘要(字符串,100字以内,没有则空)\n'
        "只返回 JSON,不要有多余解释。"
    )
    try:
        parsed = chat_json(parse_system, f"简历文本:\n{text[:3000]}")
    except LLMError as e:
        raise HTTPException(status_code=500, detail=f"AI 解析失败,请重试: {e}")

    # 兜底:确保字段完整
    parsed.setdefault("name", current.name or current.username)
    parsed.setdefault("phone", "")
    parsed.setdefault("email", "")
    parsed.setdefault("school", "")
    parsed.setdefault("major", "")
    parsed.setdefault("degree", "本科")
    parsed.setdefault("skills", [])
    parsed.setdefault("experience", "")
    parsed.setdefault("evaluation", "")
    if not isinstance(parsed.get("skills"), list):
        parsed["skills"] = []

    r.parsed_content = json.dumps(parsed, ensure_ascii=False)
    r.status = "已解析"
    db.commit()

    # === 第二步:大模型给出诊断建议(优势/不足/优化建议) ===
    diag_system = (
        "你是一名资深校招简历顾问。请根据用户提供的简历结构化信息和原始文本,"
        "给出简历诊断建议。严格以 JSON 格式返回,字段如下:\n"
        '- "strengths": 简历优势列表(字符串数组,3条)\n'
        '- "weaknesses": 待改进点列表(字符串数组,3条)\n'
        '- "suggestions": 具体优化建议列表(字符串数组,3条)\n'
        "每条建议要具体、可操作。只返回 JSON。"
    )
    diag_user = (
        f"简历结构化信息:\n{json.dumps(parsed, ensure_ascii=False, indent=2)}\n\n"
        f"简历原始文本:\n{text[:2000]}"
    )
    try:
        diag = chat_json(diag_system, diag_user)
    except LLMError:
        diag = {"strengths": [], "weaknesses": [], "suggestions": []}

    return {
        "parsed": parsed, "isRealParse": True,
        "strengths": diag.get("strengths", []),
        "weaknesses": diag.get("weaknesses", []),
        "suggestions": diag.get("suggestions", []),
    }


@router.post("/match")
def match_resume_job(resume_id: int, job_id: int,
                     db: Session = Depends(get_db),
                     current: User = Depends(get_current_user)):
    """简历-岗位匹配度计算:用大模型综合分析,返回匹配分 + 匹配点 + 差距 + 建议"""
    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="简历不存在")

    # 优先用解析后的内容,回退到原始文本
    if r.parsed_content:
        parsed = json.loads(r.parsed_content)
        resume_info = json.dumps(parsed, ensure_ascii=False)
        resume_text = r.content or ""
    else:
        parsed = {}
        resume_info = r.content or "简历未解析"
        resume_text = r.content or ""

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")

    job_requirements = _parse_json(job.requirements, [])
    job_tags = _parse_json(job.tags, [])
    job_info = json.dumps({
        "title": job.title, "company": job.company,
        "city": job.city, "salary": job.salary,
        "experience": job.experience, "education": job.education,
        "tags": job_tags, "requirements": job_requirements,
        "description": job.description,
    }, ensure_ascii=False)

    system = (
        "你是一名专业的校招简历与岗位匹配分析师。请根据用户的简历信息和岗位 JD,"
        "综合评估匹配度。严格以 JSON 格式返回,字段如下:\n"
        '- "score": 匹配总分(0-100 整数)\n'
        '- "matchPoints": 匹配的优势点列表(字符串数组)\n'
        '- "gapPoints": 差距/不足点列表(字符串数组)\n'
        '- "suggestions": 提升匹配度的建议列表(字符串数组,3条)\n'
        "评分要综合考虑:技能匹配度、学历匹配、经验匹配、地域意向等。只返回 JSON。"
    )
    user = f"简历信息:\n{resume_info}\n\n岗位JD:\n{job_info}\n\n简历原文(参考):\n{resume_text[:1500]}"
    try:
        result = chat_json(system, user)
    except LLMError as e:
        raise HTTPException(status_code=500, detail=f"AI 匹配分析失败,请重试: {e}")

    # 兜底处理
    score = result.get("score", 70)
    if not isinstance(score, (int, float)):
        try:
            score = int(score)
        except Exception:
            score = 70
    score = max(0, min(100, int(score)))

    return {
        "score": score,
        "matchPoints": result.get("matchPoints", []),
        "gapPoints": result.get("gapPoints", []),
        "suggestions": result.get("suggestions", []),
        "jobTitle": job.title, "company": job.company,
    }


@router.post("/feedback")
def submit_feedback(source_type: str, source_id: int, feedback_type: str = "like",
                     comment: str = "",
                     db: Session = Depends(get_db),
                     current: User = Depends(get_current_user)):
    """用户对 AI 输出点赞/点踩"""
    fb = AiFeedback(
        user_id=current.id, source_type=source_type, source_id=source_id,
        feedback_type=feedback_type, comment=comment,
    )
    db.add(fb)
    db.commit()
    return {"msg": "反馈已提交"}
