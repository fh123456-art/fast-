"""一键启动脚本：自动完成依赖检查 → 数据库初始化 → 种子数据 → 启动服务。

用法：python start.py
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
APP_DIR = ROOT
REQUIRED_IMPORTS = "import fastapi, uvicorn, pymysql, sqlalchemy"

PY: str = sys.executable


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> int:
    print(f"\n>>> {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(cwd) if cwd else None)
    if check and result.returncode != 0:
        print(f"[ERROR] 命令执行失败，退出码: {result.returncode}")
        sys.exit(result.returncode)
    return result.returncode


def _python_ok(exe: str) -> bool:
    try:
        r = subprocess.run(
            [exe, "-c", REQUIRED_IMPORTS],
            capture_output=True, text=True, timeout=60,
        )
        return r.returncode == 0
    except Exception:
        return False


def check_python() -> None:
    global PY
    candidates = [
        str(APP_DIR / ".venv" / "Scripts" / "python.exe"),
        str(APP_DIR / ".venv" / "bin" / "python"),
        sys.executable,
    ]
    for exe in candidates:
        if not Path(exe).exists():
            continue
        if _python_ok(exe):
            PY = exe
            print(f"[OK] 使用 Python: {exe}")
            return
        print(f"[SKIP] {exe} 缺少依赖或不可用")
    print("[ERROR] 未找到可用的 Python（需要 fastapi/uvicorn/pymysql/sqlalchemy）。")
    print(f"        请先执行: {sys.executable} -m pip install -r requirements.txt")
    sys.exit(1)


def _parse_env() -> dict[str, str]:
    data: dict[str, str] = {}
    env_file = APP_DIR / ".env"
    if env_file.exists():
        for raw in env_file.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            data[k.strip()] = v.strip().strip("\"'")
    return data


def ensure_database() -> None:
    env = _parse_env()
    host = env.get("DB_HOST", "127.0.0.1")
    port = int(env.get("DB_PORT", 3306))
    user = env.get("DB_USER", "root")
    password = env.get("DB_PASSWORD", "")
    db_name = env.get("DB_NAME", "job_resume_platform")

    check_code = (
        "import pymysql\n"
        f"conn = pymysql.connect(host='{host}', port={port}, user='{user}', password='{password}')\n"
        f"with conn.cursor() as cur:\n"
        f"    cur.execute(\"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci\")\n"
        "conn.commit(); conn.close(); print('[OK] 数据库已就绪: " + db_name + "')\n"
    )
    result = subprocess.run([PY, "-c", check_code], capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout.strip())
    else:
        print(f"[ERROR] 数据库连接失败: {result.stderr.strip().splitlines()[-1] if result.stderr else '未知错误'}")
        print("        请确认 MySQL 已启动，且 .env 中 DB_USER/DB_PASSWORD 正确。")
        sys.exit(1)


def seed() -> None:
    print("\n========== [1/2] 初始化种子数据 ==========")
    env = {**os.environ, "PYTHONPATH": str(APP_DIR)}
    for script in ("seed.py", "seed_jobs.py"):
        path = APP_DIR / "scripts" / script
        if path.exists():
            subprocess.run([PY, str(path)], cwd=str(APP_DIR), env=env, check=True)
    print("[OK] 种子数据初始化完成")


def serve() -> None:
    print("\n========== [2/2] 启动 FastAPI 服务 ==========")
    print("访问地址: http://localhost:8000")
    print("管理后台: http://localhost:8000/admin  (admin / admin123)")
    print("按 Ctrl+C 停止服务\n")
    run([PY, str(APP_DIR / "run.py")], cwd=APP_DIR, check=False)


def main() -> None:
    print("=" * 60)
    print("   大学生求职与简历优化平台 · 一键启动")
    print("=" * 60)
    check_python()
    ensure_database()
    seed()
    serve()


if __name__ == "__main__":
    main()
