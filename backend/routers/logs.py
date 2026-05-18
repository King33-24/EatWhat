"""POST /api/log — 跨端日志写入接口（前端、扩展、OpenClaw 均可调用）。"""
import json
import time
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from logger import logger
from models import Log

router = APIRouter()

# 去重缓存：key=(source, message)，value=上次写入时间戳
_dedup_cache: dict[tuple, float] = {}
_DEDUP_SECONDS = 5


class LogPayload(BaseModel):
    source: str
    level: str
    message: str
    context: Optional[dict] = None


@router.post("/log")
def write_log(payload: LogPayload, db: Session = Depends(get_db)):
    """接收前端/扩展/OpenClaw 日志，写入 SQLite logs 表。5秒内相同消息去重。"""
    extra = payload.context or {}
    now = time.time()
    dedup_key = (payload.source, payload.message)
    if now - _dedup_cache.get(dedup_key, 0) < _DEDUP_SECONDS:
        return {"success": True, "data": {"id": None}, "error": None}
    _dedup_cache[dedup_key] = now

    log_func = getattr(logger, payload.level.lower(), logger.info)
    log_func(payload.message, **extra)

    entry = Log(
        source=payload.source,
        level=payload.level,
        message=payload.message,
        context=json.dumps(extra, ensure_ascii=False) if extra else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"success": True, "data": {"id": entry.id}, "error": None}
