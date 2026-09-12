from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, Float
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """用户表(学生 + 管理员)"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True, comment="登录账号")
    password_hash = Column(String(255), nullable=False)
    name = Column(String(50), default="", comment="姓名/昵称")
    gender = Column(String(10), default="")
    phone = Column(String(20), default="")
    email = Column(String(100), default="")
    school = Column(String(100), default="", comment="学校")
    major = Column(String(100), default="", comment="专业")
    degree = Column(String(20), default="本科", comment="学历")
    graduate_year = Column(String(10), default="2026", comment="毕业年份")
    intention = Column(String(100), default="", comment="求职意向")
    expect_city = Column(String(100), default="", comment="期望城市")
    expect_salary = Column(String(50), default="", comment="期望薪资")
    role = Column(String(20), default="student", comment="student/admin")
    is_active = Column(Boolean, default=True, comment="账号是否启用")
    created_at = Column(DateTime, default=datetime.now)


class Job(Base):
    """招聘岗位表"""
    __tablename__ = "job_position"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False, comment="岗位名称")
    company = Column(String(100), default="")
    logo = Column(String(10), default="岗", comment="logo 文字")
    logo_color = Column(String(20), default="#4f6ef7")
    salary = Column(String(50), default="")
    city = Column(String(50), default="")
    experience = Column(String(50), default="", comment="经验要求")
    education = Column(String(50), default="", comment="学历要求")
    tags = Column(Text, default="[]", comment="福利标签 JSON 数组")
    description = Column(Text, default="", comment="岗位描述")
    requirements = Column(Text, default="[]", comment="任职要求 JSON 数组字符串")
    status = Column(String(20), default="online", comment="online/offline/pending")
    is_reviewed = Column(Boolean, default=True, comment="是否已审核")
    created_at = Column(DateTime, default=datetime.now)


class Resume(Base):
    """简历版本表"""
    __tablename__ = "resume"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False, comment="简历名称")
    content = Column(Text, default="", comment="简历原始文本内容")
    stored_path = Column(String(255), default="", comment="服务器存储路径(兼容旧数据)")
    filetype = Column(String(10), default="文本", comment="文本/PDF/Word")
    is_default = Column(Boolean, default=False, comment="是否默认简历")
    status = Column(String(20), default="待解析", comment="待解析/已解析")
    parsed_content = Column(Text, default="", comment="AI 解析出的结构化内容 JSON")
    review_status = Column(String(20), default="已通过", comment="待审核/已通过/未通过")
    review_comment = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.now)


class Collect(Base):
    """用户岗位收藏表"""
    __tablename__ = "user_collect_job"
    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_user_job"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("job_position.id"), nullable=False, index=True)


class Application(Base):
    """求职投递记录表"""
    __tablename__ = "job_apply"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("job_position.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resume.id"), nullable=True)
    step = Column(Integer, default=0, comment="进度 0已投递 1简历通过 2笔试 3面试中 4Offer")
    status = Column(String(30), default="已投递", comment="状态文字")
    applied_at = Column(DateTime, default=datetime.now)


class Feedback(Base):
    """用户反馈表"""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(50), default="其他问题", comment="相关模块")
    fb_type = Column(String(20), default="建议", comment="建议/Bug/表扬")
    content = Column(Text, default="")
    status = Column(String(20), default="处理中", comment="处理中/已采纳")
    created_at = Column(DateTime, default=datetime.now)


class InterviewSession(Base):
    """AI 面试会话表"""
    __tablename__ = "interview_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("job_position.id"), nullable=True)
    resume_id = Column(Integer, ForeignKey("resume.id"), nullable=True)
    mode = Column(String(30), default="HR面", comment="HR面/技术面")
    score = Column(Float, default=0, comment="面试总分")
    report = Column(Text, default="", comment="结构化面试报告 JSON")
    status = Column(String(20), default="进行中", comment="进行中/已结束")
    started_at = Column(DateTime, default=datetime.now)
    ended_at = Column(DateTime, nullable=True)


class InterviewMessage(Base):
    """面试问答记录表"""
    __tablename__ = "interview_message"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("interview_session.id"), nullable=False, index=True)
    role = Column(String(20), default="assistant", comment="user/assistant")
    content = Column(Text, default="")
    score = Column(Float, default=0, comment="AI 对回答的评分")
    suggestion = Column(Text, default="", comment="AI 对回答的点评")
    created_at = Column(DateTime, default=datetime.now)


class AiPromptTemplate(Base):
    """AI 提示词模板表"""
    __tablename__ = "ai_prompt_template"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="模板名称")
    scene = Column(String(50), default="简历诊断", comment="简历诊断/面试打分/岗位匹配")
    template = Column(Text, default="", comment="提示词模板内容")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)


class InterviewQuestionBank(Base):
    """面试题库"""
    __tablename__ = "interview_question_bank"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(Text, default="")
    category = Column(String(50), default="技术", comment="技术/行为/项目")
    difficulty = Column(Integer, default=1, comment="1简单2中等3困难")
    tags = Column(String(255), default="", comment="标签,逗号分隔")
    created_at = Column(DateTime, default=datetime.now)


class AiFeedback(Base):
    """用户对 AI 输出的点赞/点踩反馈"""
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    source_type = Column(String(30), default="简历解析", comment="简历解析/面试点评/岗位匹配")
    source_id = Column(Integer, default=0, comment="关联记录 ID")
    feedback_type = Column(String(10), default="like", comment="like/dislike")
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)


class AdminOperationLog(Base):
    """管理员操作日志"""
    __tablename__ = "admin_operation_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(50), default="", comment="操作类型")
    target = Column(String(100), default="", comment="操作对象")
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)
