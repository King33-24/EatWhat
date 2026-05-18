"""GET /api/bookshelf + POST /api/bookshelf/refresh — 平行书架查询与刷新。"""
import subprocess

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from logger import log
from models import BookshelfItem, Report

_VENV_PYTHON = "/home/king/project/backend/.venv/bin/python3"
_SEARCH_SCRIPT = "/home/king/project/openclaw_workspace/skills/search-parallel-views/scripts/search_parallel_views.py"

router = APIRouter()


def _run_search():
    result = subprocess.run([_VENV_PYTHON, _SEARCH_SCRIPT], capture_output=True, text=True)
    if result.returncode != 0:
        log(source="backend", level="ERROR", message="书架刷新脚本失败", context={"stderr": result.stderr[-500:]})
    else:
        log(source="backend", level="INFO", message="书架刷新脚本完成", context={"stdout": result.stdout[-200:]})


@router.post("/refresh")
def refresh_bookshelf(background_tasks: BackgroundTasks):
    """触发书架刷新（异步）— 立即返回，前端轮询 GET /api/bookshelf 等结果。"""
    background_tasks.add_task(_run_search)
    log(source="backend", level="INFO", message="书架刷新任务已启动")
    return {"success": True, "data": {"status": "refreshing"}, "error": None}


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
