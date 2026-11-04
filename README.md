# 大学生求职与简历优化平台（后端）

基于思维导图实现的 Python 后端项目，技术栈：**FastAPI + SQLAlchemy + MySQL + JWT + LangGraph 多智能体 + SSE**。

## 功能模块（对应思维导图）

### 学生端
- **账号登录**：学校、专业信息
- **简历管理**：上传 PDF/Word 自动解析、在线表单多版本简历、模板套用、敏感信息检测脱敏、AI 一键润色、预览/导出 PDF
- **岗位模块**：多条件搜索筛选、收藏、AI 简历-JD 匹配打分（技能点对比）、个性化推荐、求职风险提示
- **求职投递管理**：投递绑定简历版本、进度追踪（求职日历）、笔记/标签、个人求职看板
- **AI 求职练习**：AI 模拟面试（多模式、动态难度）、结构化面试报告、面试错题集、AI 笔试刷题/错题收藏
- **用户反馈**：AI 简历/面试点评点赞点踩（点踩自动进入坏案例库）

### 管理端
- **平台管理员**：学生账号启用/禁用与简历审核、企业账号审核、岗位审核/违规下架、AI 智能体 Prompt 模板管理、面试/笔试题库维护、AI 质量监控（点赞点踩/坏案例库）、用户配额管控（AI 次数/简历上限）、平台统计可视化 + Excel 导出、系统公告、操作审计日志
- **企业账号**：发布管理招聘岗位、查看本岗位投递列表、筛选投递简历

### 求职辅导多智能体（LangGraph）
- 简历解析 Agent、简历诊断 Agent、岗位匹配 Agent、HR 面试 Agent、笔试出题 Agent
- 会话记忆压缩、JSON 结构化输出校验

### 数据表（MySQL）
users、enterprise、resume、resume_template、job_position、user_collect_job、job_apply、
interview_session、interview_message、exam_question、user_exam_record、ai_prompt_template、
interview_question_bank、ai_feedback、ai_bad_case、system_message、admin_operation_log

## 项目结构

```
bs/
├── app/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置
│   ├── database.py          # SQLAlchemy 引擎/会话
│   ├── dependencies.py      # JWT 鉴权依赖
│   ├── models/              # ORM 模型（17 张表）
│   ├── schemas/             # Pydantic 模型
│   ├── api/                 # API 路由
│   │   ├── auth.py          # 认证
│   │   ├── resume.py        # 简历管理
│   │   ├── job.py           # 岗位模块
│   │   ├── apply.py         # 求职投递
│   │   ├── interview.py     # AI 面试
│   │   ├── exam.py          # AI 笔试
│   │   ├── feedback.py      # 用户反馈
│   │   ├── admin.py         # 平台管理员
│   │   └── enterprise.py    # 企业账号
│   ├── services/            # 业务逻辑（LLM 调用）
│   ├── agents/              # LangGraph 多智能体
│   ├── utils/               # JWT/脱敏/PDF/SSE
│   └── core/                # 异常与响应
├── scripts/seed.py          # 种子数据
├── run.py                   # 启动入口
├── requirements.txt
└── .env.example
```

## 快速开始

```bash
# 1. 创建虚拟环境并安装依赖
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# 2. 配置环境变量
copy .env.example .env          # 编辑 MySQL / LLM 配置

# 3. 建表 + 种子数据
python scripts/seed.py

# 4. 启动服务
python run.py
# 访问 http://127.0.0.1:8000/docs 查看 Swagger 文档
```

## 默认账号
- 管理员：`admin` / `admin123`（由 seed.py 创建）

## 说明
- AI 相关功能（简历解析/诊断/岗位匹配/面试/笔试）需要在 `.env` 中配置可用的 `OPENAI_API_KEY` 与 `OPENAI_BASE_URL`。
- 简历解析支持 `.pdf` / `.docx` / `.txt`。
- 未配置 LLM 时，上传解析等 AI 接口会返回错误，但其余 CRUD 接口正常可用。
