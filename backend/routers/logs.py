"""POST /api/log — 跨端日志写入接口（前端、扩展、OpenClaw 均可调用）。"""
import json
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from logger import logger
from models import Log

router = APIRouter()


class LogPayload(BaseModel):
    source: str
    level: str
    message: str
    context: Optional[dict] = None


@router.post("/log")
def write_log(payload: LogPayload, db: Session = Depends(get_db)):
    """接收前端/扩展/OpenClaw 日志，写入 SQLite logs 表。"""
    extra = payload.context or {}

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
