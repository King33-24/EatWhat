"""POST /api/import-url — 用户粘贴小红书 URL,后端抓取入库(v4 新增)。

TODO: 当前用 httpx 抓 HTML + 正则提取 og:title/og:description 做最小解析。
      小红书 Web 是 SPA,完整内容需 JS 渲染后才能拿到。决赛阶段如需更高精度,
      可引入 Playwright/Selenium 做 headless 渲染,或接入小红书 unofficial API。
"""
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from logger import log
from models import RawObservation

router = APIRouter()

# 小红书笔记 URL 正则(提取 note_id)
_XHS_URL_RE = re.compile(
    r"^https?://(?:www\.)?xiaohongshu\.com/explore/([a-zA-Z0-9]+)"
)

# 从 HTML 提取 og:title / og:description(标准 meta 标签,无需 JS 渲染)
_OG_TITLE_RE = re.compile(
    r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_OG_DESC_RE = re.compile(
    r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)


class ImportUrlPayload(BaseModel):
    url: str


def _extract_note_id(url: str) -> str | None:
    m = _XHS_URL_RE.match(url)
    return m.group(1) if m else None


def _fetch_note_meta(url: str) -> dict:
    """用 httpx 抓页面,正则提取 og meta。失败时返回全空 dict。"""
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            r = client.get(url, headers=headers)
            r.raise_for_status()

        html = r.text
        title_m = _OG_TITLE_RE.search(html)
        desc_m = _OG_DESC_RE.search(html)
        return {
            "title": title_m.group(1) if title_m else None,
            "content": desc_m.group(1) if desc_m else None,
            "author": None,  # 作者信息在 SPA 渲染后,当前无法从静态 HTML 提取
        }
    except Exception:
        return {"title": None, "content": None, "author": None}


@router.post("/import-url")
def import_url(payload: ImportUrlPayload, db: Session = Depends(get_db)):
    """接收小红书 URL → 提取 note_id → 抓取页面 meta → 入库。"""
    note_id = _extract_note_id(payload.url)
    if not note_id:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "error": "URL 不是合法的小红书笔记链接(格式: https://www.xiaohongshu.com/explore/xxx)",
            },
        )

    try:
        meta = _fetch_note_meta(payload.url)

        obs = RawObservation(
            note_id=note_id,
            title=meta.get("title"),
            author=meta.get("author"),
            content=meta.get("content"),
            source_channel="manual_url",
        )
        db.add(obs)
        db.commit()
        db.refresh(obs)

        log(
            source="backend",
            level="INFO",
            message="URL 补录成功",
            context={"note_id": note_id, "url": payload.url},
        )

        return {
            "success": True,
            "data": {"id": obs.id, "observed_at": str(obs.observed_at)},
            "error": None,
        }
    except Exception as e:
        db.rollback()
        log(
            source="backend",
            level="ERROR",
            message="URL 补录失败",
            context={"url": payload.url, "error": str(e)},
        )
        raise HTTPException(
            status_code=500,
            detail={"success": False, "data": None, "error": f"抓取失败: {e}"},
        )
