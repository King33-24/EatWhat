"""GET /api/bookshelf — 平行书架查询。"""
from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from logger import log
from models import BookshelfItem, Report

router = APIRouter()


@router.get("")
def get_bookshelf(report_id: int | None = None, db: Session = Depends(get_db)):
    """获取某份报告的书架;不传 report_id 则取最新报告 — 见 docs/api.md §3.1。"""
    if report_id is None:
        latest_report = db.query(Report).order_by(desc(Report.generated_at)).first()
        if not latest_report:
            return {"success": True, "data": {"report_id": None, "items": []}, "error": None}
        report_id = latest_report.id

    items = db.query(BookshelfItem).filter(BookshelfItem.report_id == report_id).all()

    log(source="backend", level="INFO", message="获取平行书架", context={"report_id": report_id, "count": len(items)})

    return {
        "success": True,
        "data": {
            "report_id": report_id,
            "items": [
                {
                    "id": item.id,
                    "blind_spot_index": item.blind_spot_index,
                    "title": item.title,
                    "source_type": item.source_type,
                    "url": item.url,
                    "contrast_card": item.contrast_card,
                    "author_intro": item.author_intro,
                    "created_at": str(item.created_at),
                }
                for item in items
            ],
        },
        "error": None,
    }
