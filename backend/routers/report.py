"""GET /api/report/* — 报告查询接口。"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from logger import log
from models import Report

router = APIRouter()


def _report_to_dict(report: Report) -> dict:
    """把 ORM 对象转成前端期望的 dict,JSON TEXT 字段自动解析。"""
    return {
        "id": report.id,
        "period_start": str(report.period_start),
        "period_end": str(report.period_end),
        "interest_map": json.loads(report.interest_map) if report.interest_map else [],
        "opinion_spectrum": json.loads(report.opinion_spectrum) if report.opinion_spectrum else [],
        "blind_spots": json.loads(report.blind_spots) if report.blind_spots else [],
        "emotion_pattern": json.loads(report.emotion_pattern) if report.emotion_pattern else [],
        "generated_at": str(report.generated_at),
    }


@router.get("/latest")
def get_latest_report(db: Session = Depends(get_db)):
    """获取最新一份报告 — 见 docs/api.md §2.1。"""
    report = db.query(Report).order_by(desc(Report.generated_at)).first()
    if not report:
        return {"success": True, "data": None, "error": None}

    log(source="backend", level="INFO", message="获取最新报告", context={"report_id": report.id})
    return {"success": True, "data": _report_to_dict(report), "error": None}


@router.get("/{id}")
def get_report(id: int, db: Session = Depends(get_db)):
    """获取指定 ID 的报告 — 见 docs/api.md §2.2。"""
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        log(source="backend", level="WARN", message="报告不存在", context={"report_id": id})
        raise HTTPException(
            status_code=404,
            detail={"success": False, "data": None, "error": f"报告 {id} 不存在"},
        )

    log(source="backend", level="INFO", message="获取指定报告", context={"report_id": id})
    return {"success": True, "data": _report_to_dict(report), "error": None}
