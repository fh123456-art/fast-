import json
from models import Job, User, InterviewQuestionBank, AiPromptTemplate
from database import SessionLocal
from security import hash_password

SEED_JOBS = [
    {"title": "前端开发工程师(校招)", "company": "字节跳动", "logo": "字", "logo_color": "#3b55d9",
     "salary": "12K-18K", "city": "深圳", "experience": "应届生", "education": "本科及以上",
     "tags": ["Vue", "React", "TypeScript", "五险一金"],
     "description": "参与公司核心业务 Web 前端开发,负责 PC/移动端页面的架构设计与性能优化,与产品、后端、设计紧密配合,打造极致用户体验。",
     "requirements": ["本科及以上学历,计算机、软件工程相关专业", "熟练掌握 HTML/CSS/JavaScript,熟悉 Vue 或 React 框架",
                      "了解前端工程化工具链(Webpack/Vite、Git、CI/CD)", "有良好的沟通能力和团队协作精神"]},
    {"title": "Java 后端开发工程师", "company": "腾讯", "logo": "腾", "logo_color": "#0f9d58",
     "salary": "13K-20K", "city": "广州", "experience": "应届生", "education": "本科及以上",
     "tags": ["Java", "Spring Boot", "MySQL", "微服务"],
     "description": "负责微信生态相关业务后端系统开发,参与高并发服务架构设计与优化。",
     "requirements": ["扎实的 Java 基础,熟悉 JVM、并发编程", "熟悉 Spring Boot / Spring Cloud 微服务生态", "熟悉 MySQL、Redis,了解消息队列"]},
    {"title": "前端开发实习生", "company": "网易", "logo": "网", "logo_color": "#e6462d",
     "salary": "4K-6K", "city": "广州", "experience": "每周4天以上", "education": "本科在读",
     "tags": ["Vue", "实习", "转正机会", "餐补"],
     "description": "参与网易云音乐相关前端项目开发,导师一对一带教,表现优秀可转正。",
     "requirements": ["熟练使用 HTML/CSS/JavaScript", "了解 Vue 或 React 框架,有个人项目优先", "实习期 3 个月以上,每周到岗 4 天以上"]},
    {"title": "产品经理(校招)", "company": "阿里巴巴", "logo": "阿", "logo_color": "#ff6a00",
     "salary": "11K-16K", "city": "杭州", "experience": "应届生", "education": "本科及以上",
     "tags": ["产品设计", "数据分析", "用户增长"],
     "description": "负责核心产品线的需求分析、功能设计与项目推进,用数据驱动产品迭代。",
     "requirements": ["逻辑清晰,具备优秀的沟通与推动力", "有产品实习经历或校园项目经历优先", "熟练使用 Axure、SQL 等工具优先"]},
    {"title": "数据分析工程师", "company": "美团", "logo": "美", "logo_color": "#eab308",
     "salary": "10K-15K", "city": "北京", "experience": "应届生", "education": "硕士优先",
     "tags": ["Python", "SQL", "数据建模", "BI"],
     "description": "构建业务指标体系,通过数据分析支持业务决策,搭建可视化报表。",
     "requirements": ["熟练使用 SQL/Python 进行数据分析", "熟悉常用统计模型与数据可视化工具", "对业务敏感,具备良好的报告撰写能力"]},
    {"title": "Web 前端开发(Vue 方向)", "company": "广州某某科技", "logo": "科", "logo_color": "#7c3aed",
     "salary": "8K-12K", "city": "广州", "experience": "1年以内", "education": "大专及以上",
     "tags": ["Vue", "Element UI", "双休", "弹性工作"],
     "description": "负责公司 SaaS 管理后台前端开发,技术栈 Vue3 + Element Plus,团队氛围好。",
     "requirements": ["熟练 Vue2/Vue3 及周边生态", "熟悉 Element UI/Plus 组件库", "有后台管理系统项目经验优先"]},
]

SEED_QUESTIONS = [
    {"question": "请做一下自我介绍,重点介绍与本岗位相关的经历。", "category": "行为", "difficulty": 1, "tags": "自我介绍,沟通"},
    {"question": "你为什么选择我们公司?", "category": "行为", "difficulty": 1, "tags": "动机,了解公司"},
    {"question": "请介绍一个你最有成就感的项目。", "category": "项目", "difficulty": 2, "tags": "项目经验,STAR法则"},
    {"question": "遇到过的最大技术挑战是什么?你是如何解决的?", "category": "技术", "difficulty": 2, "tags": "问题解决,抗压能力"},
    {"question": "Vue 和 React 有什么区别?你更倾向用哪个,为什么?", "category": "技术", "difficulty": 2, "tags": "前端框架,原理理解"},
    {"question": "HTTP 和 HTTPS 的区别是什么?", "category": "技术", "difficulty": 1, "tags": "网络基础"},
    {"question": "如何理解前端工程化?你用过哪些工具?", "category": "技术", "difficulty": 2, "tags": "工程化,构建工具"},
    {"question": "你对未来 3-5 年的职业规划是怎样的?", "category": "行为", "difficulty": 2, "tags": "职业规划,稳定性"},
    {"question": "你有什么想问我的吗?", "category": "行为", "difficulty": 1, "tags": "反向提问,积极性"},
]

SEED_PROMPTS = [
    {"name": "简历诊断-默认模板", "scene": "简历诊断",
     "template": "你是一名资深 HR 招聘专家,请根据以下简历内容,从教育背景、技术栈、项目经历、自我认知四个维度进行诊断,输出结构化的优缺点和修改建议。\n\n简历内容:\n{resume_content}\n\n请输出 JSON 格式,包含:strengths(优势数组)、weaknesses(劣势数组)、suggestions(修改建议数组)",
     "is_default": True},
    {"name": "岗位匹配-默认模板", "scene": "岗位匹配",
     "template": "你是一名招聘匹配专家,请根据候选人简历和岗位 JD,计算匹配度得分(0-100),并给出匹配点和差距点。\n\n候选人简历:\n{resume_content}\n\n岗位 JD:\n{job_content}\n\n请输出 JSON 格式,包含:score(数字)、match_points(匹配点数组)、gap_points(差距点数组)、suggestions(改进建议数组)",
     "is_default": True},
    {"name": "面试打分-默认模板", "scene": "面试打分",
     "template": "你是一名面试官,请对候选人的回答进行评分(0-100)和点评。\n\n问题:\n{question}\n\n候选人回答:\n{answer}\n\n请输出 JSON 格式,包含:score(数字)、点评(suggestion字符串)、改进建议(improvement字符串)",
     "is_default": True},
]


def seed_jobs():
    db = SessionLocal()
    try:
        if db.query(Job).count() == 0:
            for j in SEED_JOBS:
                db.add(Job(
                    title=j["title"], company=j["company"], logo=j["logo"], logo_color=j["logo_color"],
                    salary=j["salary"], city=j["city"], experience=j["experience"], education=j["education"],
                    tags=json.dumps(j["tags"], ensure_ascii=False),
                    description=j["description"],
                    requirements=json.dumps(j["requirements"], ensure_ascii=False),
                ))
            db.commit()
            print(f"[种子数据] 已插入 {len(SEED_JOBS)} 个岗位")
    finally:
        db.close()


def seed_admin():
    """创建默认管理员账号 admin/123456"""
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.role == "admin").first():
            admin = User(
                username="admin", password_hash=hash_password("123456"),
                name="系统管理员", role="admin", is_active=True,
            )
            db.add(admin)
            db.commit()
            print("[种子数据] 已创建默认管理员 admin/123456")
    finally:
        db.close()


def seed_questions():
    db = SessionLocal()
    try:
        if db.query(InterviewQuestionBank).count() == 0:
            for q in SEED_QUESTIONS:
                db.add(InterviewQuestionBank(
                    question=q["question"], category=q["category"],
                    difficulty=q["difficulty"], tags=q["tags"],
                ))
            db.commit()
            print(f"[种子数据] 已插入 {len(SEED_QUESTIONS)} 道面试题")
    finally:
        db.close()


def seed_prompts():
    db = SessionLocal()
    try:
        if db.query(AiPromptTemplate).count() == 0:
            for p in SEED_PROMPTS:
                db.add(AiPromptTemplate(
                    name=p["name"], scene=p["scene"],
                    template=p["template"], is_default=p["is_default"],
                ))
            db.commit()
            print(f"[种子数据] 已插入 {len(SEED_PROMPTS)} 个 Prompt 模板")
    finally:
        db.close()


def seed_all():
    seed_jobs()
    seed_admin()
    seed_questions()
    seed_prompts()
