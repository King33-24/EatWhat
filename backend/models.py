"""5 张表的 SQLAlchemy 模型。Schema 权威来源:docs/design/ver2.md §6。"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from database import Base


class RawObservation(Base):
    """浏览器扩展上报的 B 站视频原始元数据。"""
    __tablename__ = "raw_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bvid = Column(String, nullable=False, index=True)
    title = Column(String)
    uploader = Column(String)
    tags = Column(Text)                       # JSON 数组字符串
    description = Column(Text)
    top_comments = Column(Text)               # JSON: [{author, content, likes}]
    interaction_type = Column(String)         # view | like | favorite | coin
    observed_at = Column(DateTime, server_default=func.current_timestamp())


class Report(Base):
    """认知体检报告(每周一份)。四板块字段均为 JSON 字符串。"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    interest_map = Column(Text)               # JSON: [{topic, weight, sample_videos}]
    opinion_spectrum = Column(Text)           # JSON: [{issue, position, evidence}]
    blind_spots = Column(Text)                # JSON: [{description, missing_perspective, sample_count}]
    emotion_pattern = Column(Text)            # JSON: [{emotion, weight, examples}]
    generated_at = Column(DateTime, server_default=func.current_timestamp())


class BookshelfItem(Base):
    """平行书架推荐项:挂在某份 Report 下,对应其某个 blind_spot。"""
    __tablename__ = "bookshelf_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    blind_spot_index = Column(Integer)        # 对应 reports.blind_spots 第几项
    title = Column(String)
    source_type = Column(String)              # wechat | article | video | podcast
    url = Column(String)
    contrast_card = Column(Text)              # 差异对比卡片正文
    author_intro = Column(Text)
    created_at = Column(DateTime, server_default=func.current_timestamp())


class CooldownItem(Base):
    """冷静期盒子:用户主动锁住 N 天的 URL。"""
    __tablename__ = "cooldown_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String, nullable=False)
    title = Column(String)
    user_note = Column(Text)
    locked_at = Column(DateTime, server_default=func.current_timestamp())
    unlock_at = Column(DateTime, nullable=False)
    status = Column(String, default="locked")  # locked | unlocked | discarded


class Log(Base):
    """跨端日志:前端 / 扩展 / 后端 / OpenClaw 都可以写。"""
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String)                   # backend | frontend | extension | openclaw
    level = Column(String)                    # DEBUG | INFO | WARN | ERROR
    message = Column(Text)
    context = Column(Text)                    # JSON
    created_at = Column(DateTime, server_default=func.current_timestamp())
