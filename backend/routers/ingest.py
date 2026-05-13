"""POST /ingest — 浏览器扩展/手动导入上报小红书笔记元数据。"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from database import get_db
from logger import log
from models import RawObservation

router = APIRouter()

ALLOWED_INTERACTIONS = {"view", "like", "collect", "comment"}


class IngestPayload(BaseModel):
    """请求体字段与 docs/api.md §1.1 严格对齐。"""
    note_id: str
    title: str
    author: str
    tags: list[str] | None = None
    content: str | None = None
    images_count: int | None = 0
    likes_count: int | None = 0
    collects_count: int | None = 0
    comments_count: int | None = 0
    interaction_type: str
    dwell_seconds: int | None = None
    source_channel: str = "extension"

    @validator("interaction_type")
    def _check_interaction(cls, v: str) -> str:
        if v not in ALLOWED_INTERACTIONS:
            raise ValueError(f"interaction_type 必须是 {ALLOWED_INTERACTIONS} 之一")
        return v


@router.post("/ingest")
def ingest(payload: IngestPayload, db: Session = Depends(get_db)):
    """接收笔记元数据,写入 raw_observations 表。"""
    try:
        obs = RawObservation(
            note_id=payload.note_id,
            title=payload.title,
            author=payload.author,
            tags=",".join(payload.tags) if payload.tags else None,
            content=payload.content,
            images_count=payload.images_count or 0,
            likes_count=payload.likes_count or 0,
            collects_count=payload.collects_count or 0,
            comments_count=payload.comments_count or 0,
            interaction_type=payload.interaction_type,
            dwell_seconds=payload.dwell_seconds,
            source_channel=payload.source_channel,
        )
        db.add(obs)
        db.commit()
        db.refresh(obs)

        log(
            source="backend",
            level="INFO",
            message="笔记采集入库成功",
            context={
                "note_id": payload.note_id,
                "interaction_type": payload.interaction_type,
                "source_channel": payload.source_channel,
            },
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
            message="笔记采集入库失败",
            context={"note_id": payload.note_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=500,
            detail={"success": False, "data": None, "error": str(e)},
        )
