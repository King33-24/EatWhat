"""SQLAlchemy 引擎 + Session。所有 ORM 模型继承 Base。"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

import config

# SQLite 多线程需要 check_same_thread=False,FastAPI 异步路由会跨线程用同一 engine
engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI 依赖项:每次请求开一个 session,响应完自动关闭。

    用法:
        @router.get("/foo")
        def handler(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
