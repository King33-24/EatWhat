"""EatWhat 后端入口。

启动命令(cwd 在 backend/ 下):
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

启动后:
    - 浏览器开 http://localhost:8000 看到前端主页
    - 健康检查: http://localhost:8000/api/health
    - 同时 / 根路径也 serve 前端 ../frontend 的静态文件
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
import database
import models  # noqa: F401 — 必须导入,Base.metadata 才能收录所有表
from routers import ingest, import_url, report, bookshelf, cooldown, logs, chat


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

# 注册 API 路由(B-04~B-07 阶段逐个实现)
app.include_router(ingest.router)
app.include_router(import_url.router, prefix="/api")
app.include_router(report.router, prefix="/api/report")
app.include_router(bookshelf.router, prefix="/api/bookshelf")
app.include_router(cooldown.router, prefix="/api/cooldown")
app.include_router(logs.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/api/health")
def health():
    """健康检查 — 见 docs/api.md §7.1。"""
    return {
        "message": f"{config.APP_NAME} OK",
        "version": config.APP_VERSION,
        "openclaw_status": "running",
    }


# ⚠️ 必须放在所有 API 路由后面,避免吞掉 /api/*
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")
