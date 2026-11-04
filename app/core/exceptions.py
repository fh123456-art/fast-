"""统一业务异常与响应结构。"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class BizError(Exception):
    """业务异常：携带 code 与 message。"""

    def __init__(self, message: str, code: int = 4000):
        self.message = message
        self.code = code
        super().__init__(message)


def success(data=None, message: str = "ok") -> dict:
    return {"code": 0, "message": message, "data": data}


def fail(message: str, code: int = 4000, data=None) -> dict:
    return {"code": code, "message": message, "data": data}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(BizError)
    async def biz_handler(_: Request, exc: BizError):
        return JSONResponse(status_code=200, content=fail(exc.message, exc.code))

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content=fail(f"服务器内部错误: {exc}", code=5000),
        )
