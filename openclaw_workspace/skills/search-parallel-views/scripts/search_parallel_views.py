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
from urllib.parse import quote_plus

import httpx

DB_PATH = "/home/king/project/data/eatwhat.db"
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

FILTER_SYSTEM_PROMPT = """你是一个信息筛选助手。用户给你一个思维盲区描述和一批搜索结果，
你需要从中选出最适合作为"平行观点"的2-3条，生成结构化推荐。
要求：选理性、有论据的内容；避免情绪化煽动；优先学术或深度分析文章。

输出严格 JSON（不要 Markdown 代码块）：
{
  "items": [
    {
      "title": "文章/内容标题",
      "source_type": "article",
      "url": "https://...",
      "contrast_card": "这篇内容与你常看的内容，在[具体假设]上有根本不同：它认为...而你接触的内容大多认为...",
      "author_intro": "这篇的作者/来源是[背景描述]，其核心关切是[关切点]。"
    }
  ]
}

source_type 可选：article / video / podcast / wechat
contrast_card 要具体，不超过80字。
author_intro 不超过50字。
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


def ddg_search(query: str, max_results: int = 5) -> list[dict]:
    """用 DuckDuckGo Lite 搜索，返回 [{title, url, snippet}]。"""
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        headers = {"User-Agent": "Mozilla/5.0 (compatible; EatWhat/1.0)"}
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
        html = resp.text

        results = []
        import re
        # 从 DDG HTML 提取结果
        pattern = re.compile(
            r'<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)</a>.*?'
            r'<a[^>]+class="result__snippet"[^>]*>([^<]+)</a>',
            re.DOTALL,
        )
        for m in pattern.finditer(html):
            results.append({"url": m.group(1), "title": m.group(2).strip(), "snippet": m.group(3).strip()})
            if len(results) >= max_results:
                break

        # 如果正则没匹配到，fallback 简单提取
        if not results:
            url_pat = re.compile(r'href="(https?://[^"]+)"')
            title_pat = re.compile(r'<a[^>]+class="result__a"[^>]*>([^<]+)</a>')
            urls = url_pat.findall(html)[:max_results]
            titles = title_pat.findall(html)[:max_results]
            for u, t in zip(urls, titles):
                results.append({"url": u, "title": t.strip(), "snippet": ""})

        return results[:max_results]
    except Exception:
        return []


def call_deepseek_filter(blind_spot: dict, search_results: list[dict]) -> list[dict]:
    """用 DeepSeek 从搜索结果中筛选出高质量平行观点。"""
    results_text = "\n".join(
        f"{i+1}. 标题：{r['title']}\n   URL：{r['url']}\n   摘要：{r.get('snippet','')}"
        for i, r in enumerate(search_results)
    )
    user_msg = (
        f"思维盲区：{blind_spot.get('description', '')}\n"
        f"缺失的视角：{blind_spot.get('missing_perspective', '')}\n\n"
        f"以下是搜索到的内容：\n{results_text}\n\n"
        "请筛选2-3条最适合的平行观点推荐（严格 JSON 格式）。"
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
                    {"role": "system", "content": FILTER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.3,
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
        query = f"{blind_spot.get('description', '')} {blind_spot.get('missing_perspective', '')} 深度分析"
        search_results = ddg_search(query, max_results=6)
        if not search_results:
            continue
        items = call_deepseek_filter(blind_spot, search_results)
        count = write_bookshelf_items(report_id, idx, items)
        total_items += count
        time.sleep(1)  # 避免请求过快

    print(json.dumps({"success": True, "report_id": report_id, "item_count": total_items}, ensure_ascii=False))


if __name__ == "__main__":
    main()
