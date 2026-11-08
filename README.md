# 🎓 大学生求职与简历优化平台

> 面向大学生的 **AI 驱动** 求职生态 —— 从找工作、做简历、练面试到模拟笔试，全程由 AI Agent 辅助。

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-blue)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.3-purple)](https://langchain-ai.github.io/langgraph/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)](https://www.mysql.com/)
[![Python](https://img.shields.io/badge/Python-3.11-green)](https://www.python.org/)

---

## 🚀 快速启动

```powershell
# 1. 确保 MySQL 已启动（默认 root/123456，端口 3306）
# 2. 一键启动（自动建库 + seed + 启动服务）
python run_all.py
```

启动完成后：

| 入口 | URL |
|------|-----|
| 🏠 学生端首页 | http://localhost:8000/ |
| 🔐 登录/注册 | http://localhost:8000/login |
| 🛠️ 管理后台 | http://localhost:8000/admin |
| 📖 API 文档 | http://localhost:8000/docs |
| ❤️ 健康检查 | http://localhost:8000/health |

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 👤 学生 | testuser | test123456 |
| 🏢 企业 | bytedance | ent123456 |
| 🛠️ 管理员 | admin | admin123 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    前端 SPA                         │
│          index.html · login.html · admin.html       │
│          原生 HTML/CSS/JS · Fetch API               │
└────────────────────────┬────────────────────────────┘
                         │ HTTP / REST / SSE
┌────────────────────────▼────────────────────────────┐
│                  FastAPI 后端                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  auth    │  │  jobs    │  │ resumes  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │interview │  │  exams   │  │  admin   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │         AI Service Layer             │          │
│  │  ┌────────┐ ┌────────┐ ┌────────┐   │          │
│  │  │resume  │ │resume  │ │job     │   │          │
│  │  │parser  │ │diagnose│ │match   │   │          │
│  │  └────────┘ └────────┘ └────────┘   │          │
│  │  ┌────────┐ ┌────────┐ ┌────────┐   │          │
│  │  │job     │ │hr      │ │exam    │   │          │
│  │  │search  │ │interview│ │gen     │   │          │
│  │  └────────┘ └────────┘ └────────┘   │          │
│  │         LangGraph State Machine      │          │
│  └────────────────┬─────────────────────┘          │
│                   │                                 │
└───────────────────┼─────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐    ┌─────────┐    ┌─────────────┐
│  MySQL  │    │DeepSeek │    │  文件存储    │
│ 8.0     │    │ API     │    │ uploads/    │
└─────────┘    └─────────┘    └─────────────┘
```

### 技术栈

| 层 | 技术 |
|----|------|
| **前端** | 原生 HTML/CSS/JS（无框架依赖）|
| **后端** | FastAPI 0.115 + SQLAlchemy 2.x + Pydantic v2 |
| **AI** | LangGraph + LangChain-DeepSeek（deepseek-chat）|
| **数据库** | MySQL 8（utf8mb4）|
| **认证** | JWT（python-jose + passlib/bcrypt）|
| **简历解析** | pypdf + python-docx |
| **部署** | uvicorn（热重载开发模式）|

---

## ✨ 功能全景

### ① 用户系统

| API | 说明 |
|-----|------|
| `POST /api/auth/register` | 学生注册（用户名、密码、学校、专业、毕业年份）|
| `POST /api/auth/login` | 登录返回 JWT Token |
| `GET /api/auth/me` | 获取当前登录用户信息 |
| `PUT /api/auth/me` | 更新个人资料 |

### ② 简历中心（AI 核心）

| API | 说明 |
|-----|------|
| `POST /api/resumes/upload` | 上传 PDF / DOCX 简历文件 |
| `POST /api/resumes/parse` | **AI 简历解析** → 自动提取教育经历、工作经历、技能、项目等结构化字段 |
| `POST /api/resumes/diagnose` | **AI 简历诊断** → 多维评分（内容/结构/亮点）+ 优势/劣势分析 + 修改建议 |
| `POST /api/resumes/polish` | AI 润色简历措辞（更专业、更有亮点）|
| `POST /api/resumes/compare` | 两份简历 AI 对比分析 |
| `GET /api/resumes` | 我的简历列表 |
| `POST /api/resumes` | 新建空白简历 |
| `PUT /api/resumes/{id}` | 编辑简历内容 |
| `POST /api/resumes/{id}/set-default` | 设为默认简历（投递时自动使用）|
| `GET /api/resumes/templates` | 简历模板列表 |
| `GET /api/resumes/{id}` | 简历详情 |
| `DELETE /api/resumes/{id}` | 删除简历 |

### ③ 职位市场 & 求职投递

| API | 说明 |
|-----|------|
| `GET /api/jobs` | 职位列表（分页、城市/薪资/经验/学历筛选）|
| `GET /api/jobs/{id}` | 职位详情 |
| `GET /api/jobs/ai-recommend` | **AI 个性化推荐**（基于我的简历技能画像）|
| `GET /api/jobs/recommend` | 推荐职位（热门榜）|
| `POST /api/jobs/{id}/match` | **AI 职位匹配**（简历技能 vs JD 逐项对比，返回匹配度分数 + 缺失技能）|
| `GET /api/jobs/{id}/similar` | 相似职位推荐 |
| `POST /api/applies` | 投递简历（自动使用默认简历）|
| `GET /api/applies/mine` | 我的投递记录 |
| `PUT /api/applies/{id}` | 撤回/修改投递 |
| `GET /api/applies/board` | 投递看板 |

### ④ AI 面试（LangGraph 多轮对话）

| API | 说明 |
|-----|------|
| `POST /api/interviews` | 创建面试会话（指定职位、难度、模式）|
| `GET /api/interviews/sessions` | 历史面试列表 |
| `GET /api/interviews/{id}` | 面试详情（所有轮次）|
| `POST /api/interviews/{id}/answer` | 回答当前问题（AI 即时评分 0-10 + 点评 + 追问/下一题）|
| `POST /api/interviews/{id}/finish` | 结束面试 → AI 生成综合评分 + 能力雷达 + 改进建议 |
| `POST /api/interviews/sessions/{id}/rejudge` | 重新评判某次面试 |
| `GET /api/interviews/wrong/questions` | 面试错题本（答不好的问题归档）|
| `GET /api/interviews/{id}/messages` | 面试完整对话流 |

**AI Agent 流程**：读取 JD → 生成针对性问题 → 用户回答 → AI 评分+点评 → 追问或下一题 → 结束生成面试报告

### ⑤ AI 笔试

| API | 说明 |
|-----|------|
| `POST /api/exams/sessions` | 创建笔试（指定岗位、难度、题数）|
| `GET /api/exams/sessions` | 历史笔试列表 |
| `GET /api/exams/sessions/{id}` | 笔试详情（逐题）|
| `POST /api/exams/sessions/{id}/submit` | 提交单题答案 |
| `POST /api/exams/sessions/{id}/finish` | 结束笔试 → AI 自动判分 + 解析 |
| `POST /api/exams/sessions/{id}/rejudge` | 重新判分 |
| `POST /api/exams/generate` | AI 实时生成新题目 |
| `GET /api/exams/questions` | 题库列表 |
| `POST /api/exams/questions/{id}/answer` | 对单题作答 |
| `POST /api/exams/records/{id}/collect` | 收藏好题 |
| `GET /api/exams/wrong` | 我的错题本 |

### ⑥ 企业端

| API | 说明 |
|-----|------|
| `POST /api/enterprise/register` | 企业入驻（需 admin 审核）|
| `GET /api/enterprise/jobs` | 我发布的职位列表 |
| `POST /api/enterprise/jobs` | 发布新职位 |
| `PUT /api/enterprise/jobs/{id}` | 编辑职位信息 |
| `GET /api/enterprise/jobs/{id}/applications` | 某职位的投递列表 |
| `PUT /api/enterprise/applications/{id}/status` | 更改投递状态（待处理/面试邀请/通过/拒绝）|

### ⑦ 平台管理端

| 分类 | API |
|------|-----|
| **用户** | `GET /api/admin/users` · `PUT /toggle` 启禁用 · `PUT /quota` 设置 AI 额度 |
| **企业审核** | `GET /enterprises` · `POST` 新建 · `PUT /audit` 审核 |
| **职位审核** | `GET /jobs/audit` · `POST` 新建 · `PUT /audit` 审核 |
| **简历审核** | `GET /resumes/audit` · `GET /resumes/{id}` · `PUT /audit` |
| **AI Prompt** | `GET/POST/PUT /api/admin/prompts` |
| **面试题库** | `GET/POST /interview-bank` · `POST /import` 批量导入 |
| **笔试题库** | `GET/POST /exam-bank` · `POST /import` 批量导入 |
| **系统公告** | `GET/POST /messages` |
| **反馈管理** | `GET /feedback` |
| **Bad Case** | `GET /bad-cases` · `PUT /fix` |
| **数据统计** | `GET /stats` · `GET /stats/overview` · `GET /ai-usage` |
| **导出** | `GET /export/users` → Excel 文件 |
| **操作日志** | `GET /logs` |

### ⑧ 互动 & 反馈

| API | 说明 |
|-----|------|
| `POST /api/feedback` | 用户反馈（对 AI 结果的纠错举报）|
| `GET/POST/DELETE /api/reviews` | 点赞 / 点评 |
| `GET /api/reviews/summary` | 目标总体评分汇总 |
| `GET /api/reviews/mine` | 我的点评历史 |

---

## 🤖 AI Agent 架构

平台核心采用 **LangGraph** 状态机编排 6 个 AI Agent：

```
                    ┌─────────────────────┐
                    │   LLM Client         │
                    │ (deepseek-chat)      │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ resume_parser│    │ resume_diag  │    │ job_match    │
  │ Agent        │    │ nose Agent   │    │ Agent        │
  │ PDF/DOCX →   │    │ 评分+建议    │    │ 简历 vs JD   │
  │ 结构化 JSON  │    │              │    │ 匹配度分析    │
  └──────────────┘    └──────────────┘    └──────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ hr_interview │    │ exam_gen     │    │ job_search   │
  │ Agent        │    │ erator Agent │    │ Agent        │
  │ 多轮面试     │    │ 智能出题      │    │ 语义搜职位   │
  └──────────────┘    └──────────────┘    └──────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   LangGraph State   │
                    │   (graph.py)        │
                    └─────────────────────┘
```

每个 Agent 继承 `BaseAgent`，封装 prompt 模板、LLM 调用、结构化输出解析。

---

## 📁 项目目录

```
bs/
├── run_all.py                  # 🚀 一键启动（建库+seed+服务）
├── run.py                      # uvicorn 入口
├── requirements.txt            # 依赖清单（20 个包）
├── .env                        # 环境配置
│
├── app/                        # FastAPI 后端
│   ├── main.py                 # 应用入口 + middleware
│   ├── config.py               # 配置读取
│   ├── database.py             # SQLAlchemy 引擎 + init_db()
│   ├── agents/                 # 🤖 6 个 AI Agent
│   │   ├── base.py
│   │   ├── graph.py
│   │   ├── resume_parser_agent.py
│   │   ├── resume_diagnose_agent.py
│   │   ├── job_match_agent.py
│   │   ├── job_search_agent.py
│   │   ├── hr_interview_agent.py
│   │   └── exam_generator_agent.py
│   ├── services/               # 业务逻辑层
│   │   ├── llm_client.py
│   │   ├── resume_parser.py
│   │   ├── resume_diagnose.py
│   │   ├── job_match.py
│   │   ├── job_recommend.py
│   │   ├── job_search.py
│   │   ├── interview_service.py
│   │   ├── exam_generator.py
│   │   └── cover_letter.py
│   ├── api/                    # 路由层（12 个模块）
│   │   ├── auth.py
│   │   ├── job.py
│   │   ├── resume.py
│   │   ├── apply.py
│   │   ├── interview.py
│   │   ├── exam.py
│   │   ├── enterprise.py
│   │   ├── admin.py
│   │   ├── review.py
│   │   ├── feedback.py
│   │   └── messages.py
│   ├── models/                 # ORM 模型（9 个文件）
│   ├── schemas/                # Pydantic 请求/响应
│   ├── core/                   # 安全、JWT、依赖
│   └── utils/                  # 工具函数
│
├── scripts/                    # 种子数据脚本
│   ├── seed.py                 # admin 账号 + 模板 + AI prompts
│   └── seed_jobs.py            # 6 企业 + 30 职位 Demo
│
├── static/                     # 前端
│   ├── index.html              # 学生端 SPA
│   ├── login.html              # 登录/注册
│   ├── admin.html              # 管理后台
│   ├── js/app.js               # 全部前端逻辑
│   └── css/                    # 样式
│
├── uploads/                    # 用户上传的简历文件
│
└── certs/                       # 证书（可选）
```

---

## 🗄️ 数据模型

| 模型 | 说明 | 关键字段 |
|------|------|----------|
| **User** | 学生 / admin 用户 | username, password_hash, school, major, education, role, ai_quota |
| **Enterprise** | 企业账号 | company_name, contact_name, industry, status(待审核/通过) |
| **Resume** | 简历 | title, content(JSON), template_id, source_file, is_default |
| **ResumeTemplate** | 简历模板 | name, category, layout |
| **JobPosition** | 职位 | title, company, city, salary_min/max, skills, risk_hint |
| **Apply** | 投递记录 | job_id, resume_id, status(待处理/面试/通过/拒绝) |
| **InterviewSession** | AI 面试会话 | job_id, mode, difficulty, score |
| **ExamSession** | AI 笔试会话 | job_id, difficulty, score |
| **AiPromptTemplate** | AI Prompt 版本管理 | agent_name, name, prompt, version |
| **Review** | 点赞 / 点评 | target_type, target_id, rating, comment |
| **SystemMessage** | 系统公告 | title, content, target_role |
| **Feedback** | 用户反馈 | target_type, target_id, feedback, comment |

---

## ⚙️ 环境配置（.env）

```ini
# ===== 应用 =====
APP_NAME=大学生求职与简历优化平台
APP_ENV=dev
APP_HOST=0.0.0.0
APP_PORT=8000

# ===== MySQL =====
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=job_resume_platform

# ===== JWT =====
JWT_SECRET_KEY=please-change-this-to-a-long-random-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ===== AI =====
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# ===== 配额 =====
DEFAULT_AI_QUOTA=100
DEFAULT_RESUME_LIMIT=5

# ===== 文件上传 =====
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=20
```

---

## 📦 种子数据

`run_all.py` 自动执行两个种子脚本：

| 脚本 | 内容 |
|------|------|
| `scripts/seed.py` | admin 账号、3 个简历模板、5 个 AI Prompt 模板 |
| `scripts/seed_jobs.py` | 6 家企业（字节/阿里/百度/腾讯/美团/网易）、30 个职位 |

职位覆盖：AI/算法、后端开发、前端开发、客户端、硬件/嵌入式、产品、运营、设计 等方向。

---

## 🔧 开发命令

```powershell
# 一键启动（推荐）
python run_all.py

# 仅启动服务（数据库和 seed 已就绪）
python run.py

# 仅建表 + seed
python scripts/seed.py
python scripts/seed_jobs.py

# 安装依赖
pip install -r requirements.txt

# 查看 API 文档
# 启动后访问 http://localhost:8000/docs
```

---

## 🌟 项目亮点

| # | 亮点 | 说明 |
|---|------|------|
| 1 | **AI Agent 全链路** | 从简历解析、诊断、匹配、面试到笔试，6 个 LangGraph Agent 覆盖求职全流程 |
| 2 | **多角色体系** | 学生 + 企业 + 管理员三种角色，完整的 C 端 + B 端 + 管理端闭环 |
| 3 | **个性化推荐** | 基于简历技能画像的 AI 职位推荐，不是简单的关键词匹配 |
| 4 | **动态 Prompt 管理** | admin 后台可在线编辑 AI Prompt，实时生效无需重启 |
| 5 | **Bad Case 闭环** | 用户可反馈 AI 结果错误，admin 后台查看并标记修复 |
| 6 | **响应式前端** | 原生 JS SPA，无需构建，打开即用 |
| 7 | **一键部署** | `python run_all.py` 自动完成检查 MySQL → 建库 → 建表 → seed → 启动 |

---

## 📄 License

MIT
