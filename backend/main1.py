"""EatWhat 后端入口。

启动命令(cwd 在 backend/ 下):
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

启动后:
    浏览器开 http://localhost:8000 应看到 "EatWhat Backend OK" 的 JSON。
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
import database
import models  # noqa: F401 — 必须导入,Base.metadata 才能收录到 5 张表


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 启动时:SQLite 文件不存在则建,5 张表不存在则建
    database.Base.metadata.create_all(bind=database.engine)
    yield
    # 关闭时:无清理


app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    lifespan=lifespan,
)

# CORS:扩展(chrome-extension://*) + 前端(localhost:8000) + OpenClaw Dashboard(localhost:18789)
# MVP 阶段 allow_origins=["*"] 宽松放行,生产化时按 docs/api.md §0.3 收紧。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    """健康检查 — 见 docs/api.md §6.1。"""
    return {
        "message": f"{config.APP_NAME} OK",
        "version": config.APP_VERSION,
        "openclaw_status": "not_connected",   # B-02 跑通后改为 running
    }
