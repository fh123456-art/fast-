"""SSE 流式输出辅助。"""
from __future__ import annotations

import json
from typing import Any, AsyncIterator

from sse_starlette.sse import EventSourceResponse


def sse_json(data: Any, event: str = "message") -> str:
    return json.dumps(data, ensure_ascii=False)


async def stream_events(gen: AsyncIterator[dict]) -> EventSourceResponse:
    """把一个异步生成器包装成 SSE 响应。"""

    async def event_generator():
        async for chunk in gen:
            yield {"event": chunk.get("event", "message"), "data": sse_json(chunk.get("data", ""))}
        yield {"event": "end", "data": "[DONE]"}

    return EventSourceResponse(event_generator())
