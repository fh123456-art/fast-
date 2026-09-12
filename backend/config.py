"""全局配置:所有敏感信息(数据库密码、JWT 密钥、大模型 API Key)
统一从 backend/.env 环境变量文件读取,绝不硬编码在源码里。

首次运行:复制 .env.example 为 .env,按注释填入自己的值即可。
- 不配置数据库时默认使用 SQLite(零配置即可启动);
- 不配置 ZHIPU_API_KEY 时系统可启动,但 AI 相关功能需要补 Key 后才能用。
"""
import os
from dotenv import load_dotenv

# 加载本目录下的 .env(该文件已在 .gitignore 中,不会提交到 GitHub)
load_dotenv()

# ============ 数据库连接配置 ============
# 默认 SQLite 零配置;使用 MySQL 时在 .env 中配置,例如:
# SQLALCHEMY_DATABASE_URL=mysql+pymysql://用户名:密码@localhost:3306/库名?charset=utf8mb4
SQLALCHEMY_DATABASE_URL = os.getenv(
    "SQLALCHEMY_DATABASE_URL", "sqlite:///./fastapi.db"
)

# ============ JWT 登录鉴权配置 ============
# 生产环境务必在 .env 中改成随机长字符串
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-key-please-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # token 有效期 7 天

# ============ 文件上传配置 ============
UPLOAD_DIR = "uploads"

# ============ 智谱 GLM 大模型配置(OpenAI 兼容接口) ============
# glm-4-flash:AI 简历解析/面试评分/岗位匹配;glm-4v-plus:简历截图识别
# Key 申请地址:https://open.bigmodel.cn/
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY", "")
ZHIPU_BASE_URL = os.getenv("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
ZHIPU_MODEL = os.getenv("ZHIPU_MODEL", "glm-4-flash")

# 多模态模型:用于识别上传的简历截图,提取简历文本
ZHIPU_VISION_MODEL = os.getenv("ZHIPU_VISION_MODEL", "glm-4v-plus")
