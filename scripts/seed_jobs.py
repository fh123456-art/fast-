"""给 demo 前端补一些企业和职位数据。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models.user import Enterprise
from app.models.job import JobPosition
from app.utils.security import hash_password

ENTERPRISES = [
    {
        "username": "bytedance",
        "password_hash": hash_password("ent123456"),
        "company_name": "字节跳动",
        "contact_name": "HR 王女士",
        "contact_phone": "13800000001",
        "industry": "互联网",
        "intro": "今日头条、抖音、TikTok 母公司，全球化科技公司。",
        "status": "approved",
        "role": "enterprise",
        "is_active": True,
    },
    {
        "username": "alibaba",
        "password_hash": hash_password("ent123456"),
        "company_name": "阿里巴巴",
        "contact_name": "HR 李先生",
        "contact_phone": "13800000002",
        "industry": "互联网/电商",
        "intro": "以电商、云计算为主业的数字经济生态。",
        "status": "approved",
        "role": "enterprise",
        "is_active": True,
    },
    {
        "username": "baidu",
        "password_hash": hash_password("ent123456"),
        "company_name": "百度",
        "contact_name": "HR 赵女士",
        "contact_phone": "13800000003",
        "industry": "互联网/AI",
        "intro": "中文搜索引擎 + AI 大模型领先企业。",
        "status": "approved",
        "role": "enterprise",
        "is_active": True,
    },
    {
        "username": "tencent",
        "password_hash": hash_password("ent123456"),
        "company_name": "腾讯",
        "contact_name": "HR 孙先生",
        "contact_phone": "13800000004",
        "industry": "互联网/社交游戏",
        "intro": "微信、QQ、王者荣耀母公司。",
        "status": "approved",
        "role": "enterprise",
        "is_active": True,
    },
    {
        "username": "meituan",
        "password_hash": hash_password("ent123456"),
        "company_name": "美团",
        "contact_name": "HR 周女士",
        "contact_phone": "13800000005",
        "industry": "本地生活",
        "intro": "外卖到店、酒旅出行一站式生活服务平台。",
        "status": "approved",
        "role": "enterprise",
        "is_active": True,
    },
]

JOBS_TPL = [
    {"title": "Java 后端开发工程师", "smin": 15, "smax": 25, "city": "北京", "exp": "1-3年", "edu": "本科", "cat": "后端开发", "skills": ["Java","Spring","MySQL","MQ","Redis"]},
    {"title": "前端开发工程师（React）", "smin": 18, "smax": 30, "city": "杭州", "exp": "3-5年", "edu": "本科", "cat": "前端开发", "skills": ["React","TypeScript","Webpack","Node.js"]},
    {"title": "AI 算法工程师（大模型）", "smin": 25, "smax": 45, "city": "北京/上海", "exp": "3-5年", "edu": "硕士", "cat": "算法/AI", "skills": ["LLM","PyTorch","RAG","微调"]},
    {"title": "Python 后端开发", "smin": 14, "smax": 22, "city": "深圳", "exp": "1-3年", "edu": "本科", "cat": "后端开发", "skills": ["Python","FastAPI","Docker"]},
    {"title": "产品经理", "smin": 20, "smax": 35, "city": "北京", "exp": "3-5年", "edu": "本科", "cat": "产品", "skills": ["B端","数据分析","需求设计"]},
    {"title": "Go 后端开发工程师", "smin": 20, "smax": 35, "city": "杭州", "exp": "3-5年", "edu": "本科", "cat": "后端开发", "skills": ["Go","K8s","微服务"]},
    {"title": "测试开发工程师", "smin": 12, "smax": 20, "city": "上海", "exp": "1-3年", "edu": "本科", "cat": "测试", "skills": ["自动化测试","Java","Python"]},
    {"title": "数据分析师", "smin": 13, "smax": 22, "city": "北京", "exp": "1-3年", "edu": "本科", "cat": "数据", "skills": ["SQL","Python","BI"]},
]


def seed():
    db = SessionLocal()
    try:
        for e in ENTERPRISES:
            if db.query(Enterprise).filter(Enterprise.username == e["username"]).first():
                continue
            ent = Enterprise(**e)
            db.add(ent)
        db.commit()

        ents = db.query(Enterprise).all()
        if db.query(JobPosition).count() > 0:
            print(f"已有 {db.query(JobPosition).count()} 条职位，跳过")
            return

        added = 0
        for ent in ents:
            for tpl in JOBS_TPL[:3]:
                job = JobPosition(
                    enterprise_id=ent.id,
                    title=tpl["title"],
                    company=ent.company_name,
                    salary_min=tpl["smin"],
                    salary_max=tpl["smax"],
                    city=tpl["city"],
                    experience=tpl["exp"],
                    education=tpl["edu"],
                    category=tpl["cat"],
                    job_type="全职",
                    skills=json.dumps(tpl["skills"], ensure_ascii=False),
                    description=f"欢迎加入 {ent.company_name}，参与核心业务开发。",
                    requirement=f"• {tpl['edu']}及以上，{tpl['exp']}经验\n• 熟悉 {','.join(tpl['skills'][:3])}\n• 良好沟通与团队协作",
                    status="approved",
                )
                db.add(job)
                added += 1
        db.commit()
        print(f"OK: 企业 {len(ents)} 家，新增职位 {added} 条")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
