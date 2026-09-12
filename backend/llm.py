"""智谱 GLM 大模型调用封装(OpenAI 兼容接口)

提供两个核心函数:
- chat(): 返回纯文本回答(用于面试追问、报告生成)
- chat_json(): 返回结构化 JSON(用于简历解析、评分、匹配)

所有调用带超时 + 异常兜底,失败时抛 LLMError 由调用方决定回退策略。
"""
import json
import re
import httpx
from config import ZHIPU_API_KEY, ZHIPU_BASE_URL, ZHIPU_MODEL, ZHIPU_VISION_MODEL


class LLMError(Exception):
    """大模型调用异常"""
    pass


def _call(messages: list[dict], temperature: float = 0.7, timeout: float = 60.0) -> str:
    """调用智谱 chat/completions 接口,返回纯文本"""
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": ZHIPU_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as e:
        raise LLMError(f"模型接口 HTTP 错误 {e.response.status_code}: {e.response.text[:200]}")
    except (KeyError, IndexError) as e:
        raise LLMError(f"模型返回格式异常: {e}")
    except Exception as e:
        raise LLMError(f"模型调用失败: {e}")


def chat(system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
    """普通对话,返回纯文本"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    return _call(messages, temperature)


def chat_json(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> dict:
    """要求模型返回 JSON 的对话,自动提取并解析 JSON

    模型可能把 JSON 包在 ```json ... ``` 里,或者直接返回,这里做兼容提取。
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    raw = _call(messages, temperature)

    # 尝试从 ```json ... ``` 代码块提取
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    json_str = m.group(1).strip() if m else raw.strip()

    # 去掉可能的前后非 JSON 文字
    start = json_str.find("{")
    end = json_str.rfind("}")
    if start != -1 and end != -1:
        json_str = json_str[start:end + 1]

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise LLMError(f"模型返回的 JSON 解析失败: {e}\n原始返回: {raw[:300]}")


def chat_vision(image_data_url: str, prompt: str, timeout: float = 90.0) -> str:
    """多模态识别:传入图片 base64 data URL + 文本提示,用 GLM-4V 模型识别图片内容,返回纯文本。

    用于识别上传的简历截图,提取出简历文本。智谱服务器不会下载外网图片,
    必须用 base64 data URL(data:image/xxx;base64,...)形式传入(已验证可用)。
    """
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": ZHIPU_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        "temperature": 0.3,
    }
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as e:
        raise LLMError(f"多模态接口 HTTP 错误 {e.response.status_code}: {e.response.text[:200]}")
    except (KeyError, IndexError) as e:
        raise LLMError(f"多模态返回格式异常: {e}")
    except Exception as e:
        raise LLMError(f"多模态调用失败: {e}")
