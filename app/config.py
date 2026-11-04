"""应用配置：使用 pydantic-settings 从环境变量加载。"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "大学生求职与简历优化平台"
    APP_ENV: str = "dev"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # Database
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "123456"
    DB_NAME: str = "job_resume_platform"
    SQLALCHEMY_DATABASE_URI: str = (
        "mysql+pymysql://root:123456@127.0.0.1:3306/job_resume_platform?charset=utf8mb4"
    )

    # JWT
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # LLM (DeepSeek via langchain-deepseek)，密钥只从 .env 读取
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com/v1"
    LLM_MODEL: str = "deepseek-chat"

    # Quota
    DEFAULT_AI_QUOTA: int = 100
    DEFAULT_RESUME_LIMIT: int = 5

    # Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
