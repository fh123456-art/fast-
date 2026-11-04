"""种子数据脚本：创建管理员账号、示例简历模板、示例岗位。"""
from __future__ import annotations

import json

from app.database import SessionLocal, init_db
from app.models.ai import AiPromptTemplate
from app.models.job import JobPosition
from app.models.resume import ResumeTemplate
from app.models.user import Enterprise, User
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

        # 测试企业与岗位
        if db.query(JobPosition).count() == 0:
            companies = [
                ("字节跳动", "互联网/科技"),
                ("腾讯", "互联网/科技"),
                ("阿里巴巴", "互联网/电商"),
                ("小米", "智能硬件"),
                ("美团", "本地生活"),
            ]
            ent_map = {}
            for name, industry in companies:
                ent = Enterprise(
                    username="ent_" + name.lower(),
                    password_hash=hash_password("ent123456"),
                    company_name=name,
                    contact_name="HR",
                    industry=industry,
                    intro=name + " 测试企业账号",
                    role="enterprise",
                    status="approved",
                    is_active=True,
                )
                db.add(ent)
                ent_map[name] = ent
            db.flush()

            jobs = [
                ("字节跳动", "前端开发工程师", "北京", 20000, 35000, "1-3年", "本科", "全职", "技术",
                 "负责抖音 Web 端页面开发与性能优化。", "熟悉 React / Vue，了解工程化与性能优化。",
                 ["React", "Vue", "JavaScript", "Webpack"]),
                ("字节跳动", "后端开发工程师", "上海", 25000, 40000, "3-5年", "本科", "全职", "技术",
                 "负责推荐系统服务端接口设计与高并发优化。", "熟悉 Go / Python，掌握 MySQL、Redis。",
                 ["Go", "Python", "MySQL", "Redis"]),
                ("腾讯", "算法工程师", "深圳", 30000, 50000, "3-5年", "硕士", "全职", "算法",
                 "负责微信搜一搜的排序与大模型优化。", "熟悉机器学习 / 深度学习，有 LLM 实践经验。",
                 ["Python", "PyTorch", "LLM", "机器学习"]),
                ("腾讯", "产品实习生", "深圳", 6000, 9000, "不限", "本科", "实习", "产品",
                 "参与微信小程序产品需求整理与原型设计。", "有良好的沟通与文档能力，每周到岗 4 天。",
                 ["Axure", "需求分析", "原型设计"]),
                ("阿里巴巴", "Java 开发工程师", "杭州", 22000, 38000, "1-3年", "本科", "全职", "技术",
                 "负责淘宝交易链路的服务端开发。", "熟悉 Java / Spring，了解分布式架构。",
                 ["Java", "Spring", "MySQL", "分布式"]),
                ("阿里巴巴", "数据分析师", "杭州", 18000, 30000, "1-3年", "本科", "全职", "数据",
                 "负责电商业务指标体系搭建与报表分析。", "熟悉 SQL，掌握 Python 数据分析库。",
                 ["SQL", "Python", "Pandas", "BI"]),
                ("小米", "测试开发工程师", "北京", 18000, 28000, "1-3年", "本科", "全职", "测试",
                 "负责手机系统自动化测试框架维护。", "熟悉 Python 自动化测试，了解 CI/CD。",
                 ["Python", "Pytest", "自动化测试"]),
                ("小米", "嵌入式开发实习生", "北京", 5000, 8000, "不限", "本科", "实习", "技术",
                 "参与 IoT 设备固件开发与调试。", "熟悉 C / C++，了解嵌入式系统。",
                 ["C", "C++", "嵌入式"]),
                ("美团", "后端开发工程师", "上海", 20000, 32000, "1-3年", "本科", "全职", "技术",
                 "负责外卖订单系统服务端开发。", "熟悉 Java / Go，掌握消息队列。",
                 ["Java", "Go", "Kafka", "MySQL"]),
                ("美团", "运营实习生", "广州", 4000, 6000, "不限", "大专", "实习", "运营",
                 "参与本地生活商家运营活动执行。", "执行力强，熟练使用 Office。",
                 ["Excel", "活动运营"]),
                ("腾讯", "UI 设计师", "成都", 15000, 25000, "1-3年", "本科", "全职", "设计",
                 "负责游戏界面视觉设计。", "熟练使用 Figma / PS，有作品集。",
                 ["Figma", "Photoshop", "UI设计"]),
                ("阿里巴巴", "前端开发工程师", "广州", 18000, 30000, "1-3年", "本科", "全职", "技术",
                 "负责天猫商家后台前端开发。", "熟悉 React，了解 TypeScript。",
                 ["React", "TypeScript", "CSS"]),
            ]
            for company, title, city, smin, smax, exp, edu, jtype, cat, desc, req, skills in jobs:
                db.add(JobPosition(
                    enterprise_id=ent_map[company].id,
                    title=title,
                    company=company,
                    city=city,
                    salary_min=smin,
                    salary_max=smax,
                    experience=exp,
                    education=edu,
                    job_type=jtype,
                    category=cat,
                    description=desc,
                    requirement=req,
                    skills=json.dumps(skills, ensure_ascii=False),
                    status="approved",
                ))
            print("[seed] 已创建 %d 个测试岗位" % len(jobs))

        db.commit()
        print("[seed] 种子数据初始化完成")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
