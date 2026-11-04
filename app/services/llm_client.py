"""LLM 客户端封装：基于 langchain-deepseek 的 ChatDeepSeek。"""
from __future__ import annotations

import json
from typing import Any, AsyncIterator

from langchain_deepseek import ChatDeepSeek

from app.config import settings


def get_llm(temperature: float = 0.3, *, enable_search: bool = False) -> ChatDeepSeek:
    kwargs: dict[str, Any] = dict(
        model=settings.LLM_MODEL,
        api_key=settings.DEEPSEEK_API_KEY or None,
        base_url=settings.DEEPSEEK_API_BASE or None,
        temperature=temperature,
    )
    if enable_search:
        kwargs["extra_body"] = {"enable_search": True}
    return ChatDeepSeek(**kwargs)


def _build_messages(system: str, user: str) -> list[tuple[str, str]]:
    return [("system", system), ("human", user)]


async def chat_complete(
    system: str,
    user: str,
    *,
    temperature: float = 0.3,
    json_mode: bool = False,
    enable_search: bool = False,
) -> str:
    """非流式对话，返回模型输出文本。"""
    llm = get_llm(temperature=temperature, enable_search=enable_search)
    messages = _build_messages(system, user)
    if json_mode:
        llm = llm.bind(response_format={"type": "json_object"})
    resp = await llm.ainvoke(messages)
    return resp.content or ""


async def chat_stream(
    system: str,
    user: str,
    *,
    temperature: float = 0.3,
) -> AsyncIterator[str]:
    """流式对话，按 chunk 产出文本。"""
    llm = get_llm(temperature=temperature)
    messages = _build_messages(system, user)
    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content


def parse_json_output(text: str) -> dict[str, Any]:
    """把模型输出解析为 JSON，容错处理 markdown 代码块包裹。"""
    if not text:
        return {}
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                return {}
        return {}
