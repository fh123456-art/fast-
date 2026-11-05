"""种子数据脚本：创建管理员账号、示例简历模板、示例岗位。"""
from __future__ import annotations

import json

from app.database import SessionLocal, init_db
from app.models.ai import AiPromptTemplate
from app.models.resume import ResumeTemplate
from app.models.user import User
from app.utils.security import hash_password


def seed():
    init_db()
    db = SessionLocal()
    try:
        # 管理员账号
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                real_name="系统管理员",
                role="admin",
                is_active=True,
            )
            db.add(admin)
            print("[seed] 已创建管理员账号 admin / admin123")

        # 简历模板
        if db.query(ResumeTemplate).count() == 0:
            templates = [
                ResumeTemplate(name="经典单栏", category="校招", layout="classic"),
                ResumeTemplate(name="技术双栏", category="技术岗", layout="tech"),
                ResumeTemplate(name="创意设计", category="设计岗", layout="creative"),
            ]
            db.add_all(templates)
            print("[seed] 已创建 3 个简历模板")

        # AI Prompt 模板
        if db.query(AiPromptTemplate).count() == 0:
            prompts = [
                AiPromptTemplate(agent_name="resume_parser", name="简历解析默认", prompt="抽取简历结构化字段", version="v1"),
                AiPromptTemplate(agent_name="resume_diagnose", name="简历诊断默认", prompt="分析简历优缺点", version="v1"),
                AiPromptTemplate(agent_name="job_match", name="岗位匹配默认", prompt="对比简历与JD", version="v1"),
                AiPromptTemplate(agent_name="hr_interview", name="面试出题默认", prompt="动态面试出题", version="v1"),
                AiPromptTemplate(agent_name="exam_generator", name="笔试出题默认", prompt="生成笔试题", version="v1"),
            ]
            db.add_all(prompts)
            print("[seed] 已创建 5 套 AI Prompt 模板")

        db.commit()
        print("[seed] 种子数据初始化完成")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
