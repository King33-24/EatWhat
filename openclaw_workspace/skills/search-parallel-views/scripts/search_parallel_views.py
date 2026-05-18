#!/usr/bin/env python3
"""
平行书架生成脚本。
读最新 reports.blind_spots → DuckDuckGo 搜索 + DeepSeek 筛选 → 写 bookshelf_items 表。
输出 JSON: {"success": true, "item_count": 4, "report_id": 1}
"""
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timezone
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

GENERATE_SYSTEM_PROMPT = """你是"问膳"的平行书架推荐引擎。根据用户的思维盲区，推荐2-3条能补充该视角的内容。

核心约束：
1. 【话题相关】推荐内容必须与盲区描述的话题直接相关，禁止跨域推荐（例如：盲区是"暗恋故事"，就推荐情感/心理类内容，不要推荐职场或理财）
2. 【来源可靠】只推荐以下类型：知名书籍（有ISBN）、知名纪录片/电影、主流学术概念/理论、知名学者的公开演讲。禁止推荐无法验证的文章、知乎帖子、微信公众号文章
3. 【不编造URL】url 字段一律留空字符串 ""，不要填写任何 URL，避免给出不存在的链接
4. contrast_card：说明该内容与用户已接触视角的具体差异，不超过80字
5. author_intro：简述作者/来源权威性，不超过50字

输出严格 JSON（不要 Markdown 代码块）：
{
  "items": [
    {
      "title": "书名/纪录片名/理论名称",
      "source_type": "article",
      "url": "",
      "contrast_card": "与你常接触的[具体视角]不同，这里认为[具体差异]。",
      "author_intro": "作者/来源权威背景简介。"
    }
  ]
}

source_type 可选：article / video / podcast / wechat
"""


def get_latest_report() -> tuple[int, list[dict]]:
    """返回 (report_id, blind_spots列表)。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT id, blind_spots FROM reports ORDER BY generated_at DESC LIMIT 1"
    ).fetchone()
    conn.close()
    if not row:
        return 0, []
    blind_spots = json.loads(row["blind_spots"]) if row["blind_spots"] else []
    return row["id"], blind_spots


def call_deepseek_generate(blind_spot: dict) -> list[dict]:
    """直接用 DeepSeek 知识库生成平行观点推荐，无需外网搜索。"""
    user_msg = (
        f"思维盲区描述：{blind_spot.get('description', '')}\n"
        f"缺失的视角：{blind_spot.get('missing_perspective', '')}\n\n"
        "请根据你的知识库，推荐2-3条能补充这一视角的真实内容（文章/书籍/播客/视频）。"
        "严格按 JSON 格式输出。"
    )
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": GENERATE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.5,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    data = json.loads(content)
    return data.get("items", [])


def write_bookshelf_items(report_id: int, blind_spot_index: int, items: list[dict]) -> int:
    """写入 bookshelf_items 表，返回写入条数。"""
    conn = sqlite3.connect(DB_PATH)
    count = 0
    for item in items:
        conn.execute(
            """
            INSERT INTO bookshelf_items (report_id, blind_spot_index, title, source_type, url, contrast_card, author_intro)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                blind_spot_index,
                item.get("title", ""),
                item.get("source_type", "article"),
                item.get("url", ""),
                item.get("contrast_card", ""),
                item.get("author_intro", ""),
            ),
        )
        count += 1
    conn.commit()
    conn.close()
    return count


def main():
    if not DEEPSEEK_API_KEY:
        print(json.dumps({"success": False, "error": "DEEPSEEK_API_KEY 未设置"}, ensure_ascii=False))
        sys.exit(1)

    if not Path(DB_PATH).exists():
        print(json.dumps({"success": False, "error": f"数据库不存在: {DB_PATH}"}, ensure_ascii=False))
        sys.exit(1)

    report_id, blind_spots = get_latest_report()
    if not report_id:
        print(json.dumps({"success": False, "error": "没有找到认知体检报告，请先生成报告"}, ensure_ascii=False))
        sys.exit(1)

    if not blind_spots:
        print(json.dumps({"success": False, "error": "最新报告没有思维盲区数据"}, ensure_ascii=False))
        sys.exit(1)

    # 清除该 report 的旧书架数据
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM bookshelf_items WHERE report_id = ?", (report_id,))
    conn.commit()
    conn.close()

    total_items = 0
    for idx, blind_spot in enumerate(blind_spots[:2]):  # 最多处理2个盲区
        items = call_deepseek_generate(blind_spot)
        count = write_bookshelf_items(report_id, idx, items)
        total_items += count
        time.sleep(1)  # 避免请求过快

    print(json.dumps({"success": True, "report_id": report_id, "item_count": total_items}, ensure_ascii=False))


if __name__ == "__main__":
    main()
