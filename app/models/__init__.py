"""ORM 模型注册：导入所有模型以便 Base.metadata 收集。"""
from app.models.user import User, Enterprise
from app.models.resume import Resume, ResumeTemplate
from app.models.job import JobPosition, UserCollectJob, JobApply
from app.models.interview import InterviewSession, InterviewMessage, InterviewQuestionBank
from app.models.exam import ExamQuestion, UserExamRecord
from app.models.ai import AiPromptTemplate, AiFeedback, AiBadCase
from app.models.system import SystemMessage, AdminOperationLog
from app.models.review import Review

__all__ = [
    "User",
    "Enterprise",
    "Resume",
    "ResumeTemplate",
    "JobPosition",
    "UserCollectJob",
    "JobApply",
    "InterviewSession",
    "InterviewMessage",
    "InterviewQuestionBank",
    "ExamQuestion",
    "UserExamRecord",
    "AiPromptTemplate",
    "AiFeedback",
    "AiBadCase",
    "SystemMessage",
    "AdminOperationLog",
    "Review",
]
