"""简历敏感信息检测与脱敏。"""
from __future__ import annotations

import re

# 常见敏感信息模式
PHONE_RE = re.compile(r"(?<!\d)(1[3-9]\d{9})(?!\d)")
ID_CARD_RE = re.compile(r"(?<!\d)(\d{17}[\dXx])(?!\d)")
EMAIL_RE = re.compile(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})")
BANK_CARD_RE = re.compile(r"(?<!\d)(\d{16,19})(?!\d)")

PATTERNS = {
    "手机号": PHONE_RE,
    "身份证号": ID_CARD_RE,
    "邮箱": EMAIL_RE,
    "银行卡号": BANK_CARD_RE,
}


def detect_sensitive(text: str) -> list[dict]:
    """检测文本中的敏感信息，返回 [{type, value, position}]。"""
    results: list[dict] = []
    if not text:
        return results
    for name, pattern in PATTERNS.items():
        for m in pattern.finditer(text):
            results.append({"type": name, "value": m.group(0), "start": m.start(), "end": m.end()})
    return results


def mask_value(value: str, kind: str) -> str:
    if kind == "手机号":
        return value[:3] + "****" + value[-4:]
    if kind == "身份证号":
        return value[:6] + "********" + value[-4:]
    if kind == "邮箱":
        name, _, domain = value.partition("@")
        return (name[:2] + "***@" + domain) if len(name) > 2 else ("***@" + domain)
    if kind == "银行卡号":
        return value[:4] + " **** **** " + value[-4:]
    return "***"


def desensitize(text: str) -> tuple[str, list[dict]]:
    """返回 (脱敏后文本, 命中的敏感信息列表)。"""
    hits = detect_sensitive(text)
    if not hits:
        return text, []
    masked = text
    # 按位置倒序替换，避免位置错位
    for h in sorted(hits, key=lambda x: x["start"], reverse=True):
        masked = masked[: h["start"]] + mask_value(h["value"], h["type"]) + masked[h["end"] :]
    return masked, hits
