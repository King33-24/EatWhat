"""CRUD /api/cooldown — 冷静期盒子。"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from database import get_db
from logger import log
from models import CooldownItem

router = APIRouter()

ALLOWED_STATUS = {"locked", "unlocked", "discarded"}


class CooldownCreate(BaseModel):
    """POST /api/cooldown 请求体 — 见 docs/api.md §4.2。"""
    url: str
    title: str | None = None
    user_note: str | None = None
    lock_days: int = 7

    @validator("lock_days")
    def _check_lock_days(cls, v: int) -> int:
        if not (1 <= v <= 30):
            raise ValueError("lock_days 必须在 1-30 之间")
        return v


class CooldownUpdate(BaseModel):
    """PATCH /api/cooldown/{id} 请求体 — 见 docs/api.md §4.3。"""
    user_note: str | None = None
    status: str | None = None

    @validator("status")
    def _check_status(cls, v: str | None) -> str | None:
        if v is not None and v not in ALLOWED_STATUS:
            raise ValueError(f"status 必须是 {ALLOWED_STATUS} 之一")
        return v


@router.post("")
def create_cooldown(payload: CooldownCreate, db: Session = Depends(get_db)):
    """存入冷静期 — 见 docs/api.md §4.2。"""
    unlock_at = datetime.utcnow() + timedelta(days=payload.lock_days)
    item = CooldownItem(
        url=payload.url,
        title=payload.title,
        user_note=payload.user_note,
        unlock_at=unlock_at,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    log(source="backend", level="INFO", message="存入冷静期", context={"id": item.id, "url": payload.url})

    return {
        "success": True,
        "data": {"id": item.id, "unlock_at": str(item.unlock_at)},
        "error": None,
    }


@router.get("")
def list_cooldown(status: str | None = None, db: Session = Depends(get_db)):
    """列出冷静期项 — 见 docs/api.md §4.1。"""
    query = db.query(CooldownItem)
    if status:
        query = query.filter(CooldownItem.status == status)
    items = query.all()

    now = datetime.utcnow()
    return {
        "success": True,
        "data": [
            {
                "id": item.id,
                "url": item.url,
                "title": item.title,
                "user_note": item.user_note,
                "locked_at": str(item.locked_at),
                "unlock_at": str(item.unlock_at),
                "status": item.status,
                "remaining_seconds": (
                    max(0, int((item.unlock_at - now).total_seconds()))
                    if item.status == "locked" and item.unlock_at > now
                    else None
                ),
            }
            for item in items
        ],
        "error": None,
    }


@router.patch("/{id}")
def update_cooldown(id: int, payload: CooldownUpdate, db: Session = Depends(get_db)):
    """更新备注或状态 — 见 docs/api.md §4.3。"""
    item = db.query(CooldownItem).filter(CooldownItem.id == id).first()
    if not item:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "data": None, "error": f"冷静期项 {id} 不存在"},
        )

    if payload.user_note is not None:
        item.user_note = payload.user_note
    if payload.status is not None:
        item.status = payload.status

    db.commit()
    db.refresh(item)

    log(source="backend", level="INFO", message="更新冷静期", context={"id": id, "status": item.status})
    return {"success": True, "data": {"id": item.id, "status": item.status}, "error": None}


@router.delete("/{id}")
def delete_cooldown(id: int, db: Session = Depends(get_db)):
    """删除冷静期项 — 见 docs/api.md §4.4。"""
    item = db.query(CooldownItem).filter(CooldownItem.id == id).first()
    if not item:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "data": None, "error": f"冷静期项 {id} 不存在"},
        )

    db.delete(item)
    db.commit()

    log(source="backend", level="INFO", message="删除冷静期", context={"id": id})
    return {"success": True, "data": {"id": id, "deleted": True}, "error": None}
