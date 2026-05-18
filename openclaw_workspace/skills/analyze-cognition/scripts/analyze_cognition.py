#!/usr/bin/env python3
"""
认知体检报告生成脚本。
读取近7天 raw_observations → 调 DeepSeek → 写 reports 表。
输出 JSON: {"success": true, "report_id": 1} 或 {"success": false, "error": "..."}
"""
import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

# 从 backend/.env 加载环境变量（兼容无 shell export 的场景）
_env_file = Path("/home/king/project/backend/.env")
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

DB_PATH = "/home/king/project/data/eatwhat.db"
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

SYSTEM_PROMPT = """你是一个认知健康分析师。用户给你一批小红书笔记浏览记录，你需要客观分析并输出严格的 JSON 报告，不要添加任何额外文字。

输出格式（严格 JSON，不要 Markdown 代码块）：
{
  "interest_map": [
    {"topic": "话题名", "weight": 0.35, "sample_notes": ["笔记标题1", "笔记标题2"]}
  ],
  "opinion_spectrum": [
    {"issue": "议题名", "position": "用户接收到的内容立场描述", "evidence": "具体笔记引用"}
  ],
  "blind_spots": [
    {"description": "盲区描述", "missing_perspective": "缺失的视角", "sample_count": 3}
  ],
  "emotion_pattern": [
    {"emotion": "情绪类型", "weight": 0.4, "examples": ["触发例子1", "触发例子2"]}
  ]
}

要求：
- interest_map: 最多5个话题，weight 之和为1.0
- opinion_spectrum: 1-3个关键议题
- blind_spots: 1-2个最重要的盲区，description 要具体且可追溯（引用笔记数量）
- emotion_pattern: 最多3种情绪
- 用分析者口吻，客观描述，不做价值判断
"""


def fetch_observations(days: int = 7) -> list[dict]:
    """读取近 N 天的 raw_observations。"""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT note_id, title, author, content, tags, interaction_type, dwell_seconds
        FROM raw_observations
        WHERE observed_at >= ?
        ORDER BY observed_at DESC
        LIMIT 200
        """,
        (since.isoformat(),),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def build_user_message(observations: list[dict]) -> str:
    lines = [f"以下是用户近7天的 {len(observations)} 条小红书浏览记录：\n"]
    for i, obs in enumerate(observations, 1):
        parts = [f"{i}. 标题：{obs['title'] or '(无标题)'}"]
        if obs.get("author"):
            parts.append(f"作者：{obs['author']}")
        if obs.get("content"):
            parts.append(f"内容摘要：{obs['content'][:120]}")
        if obs.get("tags"):
            parts.append(f"标签：{obs['tags']}")
        if obs.get("interaction_type"):
            parts.append(f"互动类型：{obs['interaction_type']}")
        lines.append("，".join(parts))
    lines.append("\n请根据以上数据生成认知体检报告（严格 JSON 格式）。")
    return "\n".join(lines)


def call_deepseek(user_message: str) -> dict:
    """调用 DeepSeek API，返回解析后的 JSON。"""
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)


def write_report(analysis: dict) -> int:
    """写入 reports 表，返回新记录 ID。"""
    now = datetime.now(timezone.utc)
    period_start = (now - timedelta(days=7)).isoformat()
    period_end = now.isoformat()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute(
        """
        INSERT INTO reports (period_start, period_end, interest_map, opinion_spectrum, blind_spots, emotion_pattern)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            period_start,
            period_end,
            json.dumps(analysis.get("interest_map", []), ensure_ascii=False),
            json.dumps(analysis.get("opinion_spectrum", []), ensure_ascii=False),
            json.dumps(analysis.get("blind_spots", []), ensure_ascii=False),
            json.dumps(analysis.get("emotion_pattern", []), ensure_ascii=False),
        ),
    )
    conn.commit()
    report_id = cur.lastrowid
    conn.close()
    return report_id


def main():
    if not DEEPSEEK_API_KEY:
        print(json.dumps({"success": False, "error": "DEEPSEEK_API_KEY 未设置"}, ensure_ascii=False))
        sys.exit(1)

    if not Path(DB_PATH).exists():
        print(json.dumps({"success": False, "error": f"数据库不存在: {DB_PATH}"}, ensure_ascii=False))
        sys.exit(1)

    observations = fetch_observations(days=7)
    if len(observations) < 3:
        print(json.dumps(
            {"success": False, "error": f"近7天数据不足（仅 {len(observations)} 条），请先用扩展采集更多小红书笔记"},
            ensure_ascii=False,
        ))
        sys.exit(1)

    user_message = build_user_message(observations)
    analysis = call_deepseek(user_message)
    report_id = write_report(analysis)

    print(json.dumps({"success": True, "report_id": report_id, "observation_count": len(observations)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
