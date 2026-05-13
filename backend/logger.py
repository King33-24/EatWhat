"""后端日志:loguru 写文件 + 写 SQLite logs 表。

用法(任何地方):
    from logger import log
    log(source="backend", level="INFO", message="xxx", context={"key": "value"})
"""
import json
import sys
from pathlib import Path

from loguru import logger

from database import SessionLocal
from models import Log

# 日志目录:backend/logs/
LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# 移除 loguru 默认 handler
logger.remove()

# 文件:每天轮转,保留 7 天
logger.add(
    LOG_DIR / "app_{time:YYYY-MM-DD}.log",
    rotation="00:00",
    retention="7 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    enqueue=True,
)

# 控制台
logger.add(sys.stdout, level="DEBUG", format="{level} | {message}")


def log(source: str, level: str, message: str, context: dict | None = None):
    """双通道写日志:文件(loguru) + SQLite(独立 session)。

    使用独立 session,即使主请求事务回滚,日志也能保留。
    """
    extra = context or {}

    # 1. 写文件
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(message, **extra)

    # 2. 写 SQLite
    db = SessionLocal()
    try:
        entry = Log(
            source=source,
            level=level,
            message=message,
            context=json.dumps(extra, ensure_ascii=False) if extra else None,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
