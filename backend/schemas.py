from pydantic import BaseModel
from typing import Optional


# ---------- 认证 ----------
class RegisterIn(BaseModel):
    username: str
    password: str
    name: str = ""
    email: str = ""


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------- 用户/个人信息 ----------
class UserOut(BaseModel):
    id: int
    username: str
    name: str = ""
    gender: str = ""
    phone: str = ""
    email: str = ""
    school: str = ""
    major: str = ""
    degree: str = "本科"
    graduate_year: str = "2026"
    intention: str = ""
    expect_city: str = ""
    expect_salary: str = ""
    role: str = "student"
    is_active: bool = True

    class Config:
        from_attributes = True


class ProfileIn(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    school: Optional[str] = None
    major: Optional[str] = None
    degree: Optional[str] = None
    graduate_year: Optional[str] = None
    intention: Optional[str] = None
    expect_city: Optional[str] = None
    expect_salary: Optional[str] = None


# ---------- 岗位 ----------
class JobOut(BaseModel):
    id: int
    title: str
    company: str = ""
    logo: str = "岗"
    logo_color: str = "#4f6ef7"
    salary: str = ""
    city: str = ""
    experience: str = ""
    education: str = ""
    tags: list = []
    description: str = ""
    requirements: list = []
    collected: bool = False  # 当前用户是否已收藏(由接口填充)

    class Config:
        from_attributes = True


# ---------- 简历 ----------
class ResumeOut(BaseModel):
    id: int
    filename: str
    filetype: str = "PDF"
    is_default: bool = False
    status: str = "待解析"
    parsed: Optional[dict] = None
    updatedAt: str = ""

    class Config:
        from_attributes = True


class ResumeEditIn(BaseModel):
    name: str = ""
    school: str = ""
    major: str = ""
    skills: str = ""
    experience: str = ""
    evaluation: str = ""


class ResumeCreateIn(BaseModel):
    """简历文本创建(不再上传文件)"""
    filename: str = "我的简历"
    content: str


# ---------- 投递 ----------
class ApplyIn(BaseModel):
    job_id: int
    resume_id: Optional[int] = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    jobTitle: str = ""
    company: str = ""
    logo: str = "岗"
    logo_color: str = "#4f6ef7"
    salary: str = ""
    resumeName: str = ""
    step: int = 0
    steps: list = ["已投递", "简历通过", "笔试", "面试中", "Offer"]
    appliedAt: str = ""

    class Config:
        from_attributes = True


# ---------- 反馈 ----------
class FeedbackIn(BaseModel):
    category: str = "其他问题"
    fb_type: str = "建议"
    content: str


class FeedbackOut(BaseModel):
    id: int
    category: str = ""
    fb_type: str = ""
    content: str = ""
    status: str = "处理中"
    date: str = ""

    class Config:
        from_attributes = True


TokenOut.model_rebuild()
