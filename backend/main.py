from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import ingest, report, bookshelf, cooldown, logs

app = FastAPI(title="Prism Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://localhost:8001",
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(report.router, prefix="/api/report")
app.include_router(bookshelf.router, prefix="/api/bookshelf")
app.include_router(cooldown.router, prefix="/api/cooldown")
app.include_router(logs.router, prefix="/api")

@app.get("/health")
def health():
    return {"message": "Prism Backend OK", "version": "1.0.0", "openclaw_status": "unknown"}

# 必须放在所有 API 路由后面，避免吞掉 /api/*
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")
