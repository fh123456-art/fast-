from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import SQLALCHEMY_DATABASE_URL

# 连接参数:MySQL 需要设 charset;SQLite 不需要
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite 需要 this 才能多线程访问(vite 代理请求并发时使用)
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # 每次取连接前检测有效性,避免 MySQL 断连报错
)

# 会话工厂:每个请求一个 session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 所有模型表的基类
Base = declarative_base()


# 依赖项:给接口用的数据库会话,请求结束自动关闭
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
