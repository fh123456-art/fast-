"""一键启动脚本：python run_all.py

做的事情：
  1. 检查 MySQL 是否运行
  2. 自动创建数据库 job_resume_platform（如果不存在）
  3. 创建所有数据表
  4. 灌入种子数据（admin 账号、企业、职位、AI 模板）
  5. 启动 FastAPI 服务
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(str(ROOT))
sys.path.insert(0, str(ROOT))

VENV_PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"
if not VENV_PYTHON.exists():
    VENV_PYTHON = Path(sys.executable)

BANNER = r"""
╔══════════════════════════════════════════════════╗
║   🎓 大学生求职与简历优化平台 · 一键启动         ║
╚══════════════════════════════════════════════════╝
"""


def step(title: str) -> None:
    print(f"\n{'─' * 50}")
    print(f"▶  {title}")
    print(f"{'─' * 50}")


def check_mysql() -> bool:
    try:
        import pymysql
        from dotenv import load_dotenv
        load_dotenv()
        conn = pymysql.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            connect_timeout=3,
        )
        conn.close()
        print("   ✅ MySQL 连接成功")
        return True
    except Exception as e:
        print(f"   ❌ MySQL 连接失败: {e}")
        return False


def ensure_database() -> None:
    import pymysql
    from dotenv import load_dotenv
    load_dotenv()

    db_name = os.getenv("DB_NAME", "job_resume_platform")
    conn = pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
    )
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = %s",
            (db_name,),
        )
        if cur.fetchone():
            print(f"   ✅ 数据库已存在: {db_name}")
        else:
            cur.execute(
                f"CREATE DATABASE `{db_name}` "
                f"DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci"
            )
            print(f"   ✅ 创建数据库: {db_name}")
        conn.commit()
    finally:
        conn.close()


def run_cmd(cmd: list[str]) -> int:
    print(f"   $ {' '.join(cmd)}")
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    result = subprocess.run(cmd, cwd=str(ROOT), env=env)
    return result.returncode


def main() -> None:
    print(BANNER)

    step("1/5  检查 MySQL 数据库")
    if not check_mysql():
        print("\n💡 请先启动 MySQL 服务后重试")
        print("   Windows: net start mysql  或在服务管理器里启动")
        sys.exit(1)

    step("2/5  确保数据库存在")
    ensure_database()

    step("3/5  创建数据表 + 基础种子数据")
    code = run_cmd([str(VENV_PYTHON), "scripts/seed.py"])
    if code != 0:
        print("   ⚠️  seed.py 有警告，继续...")

    step("4/5  灌入企业和职位 Demo 数据")
    code = run_cmd([str(VENV_PYTHON), "scripts/seed_jobs.py"])
    if code != 0:
        print("   ⚠️  seed_jobs.py 有警告，继续...")

    step("5/5  启动 Web 服务 🚀")
    print("""
   ┌─────────────────────────────────────────────┐
   │  🌐 首页:        http://localhost:8000/      │
   │  🔐 登录页:      http://localhost:8000/login │
   │  ⚙️  管理后台:    http://localhost:8000/admin │
   │  📖 API 文档:    http://localhost:8000/docs  │
   ├─────────────────────────────────────────────┤
   │  👤 admin 账号:   admin / admin123           │
   │  🏢 企业账号:     bytedance / ent123456      │
   │  📝 测试用户:     testuser / test123456      │
   └─────────────────────────────────────────────┘
   按 Ctrl+C 停止服务
""")
    time.sleep(1)
    os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), "run.py"])


if __name__ == "__main__":
    main()
