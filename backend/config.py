"""配置管理:从环境变量读取,提供给其他模块统一使用。

环境变量来源(优先级从高到低):
  1. ~/.bashrc 里的 export(已配 DEEPSEEK_API_KEY)
  2. backend/.env 文件(可选,见 .env.example)
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 加载 backend/.env(如果存在)
load_dotenv()

# 项目根:backend/ 的上一级
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# 数据库:文件落在 project/data/eatwhat.db
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/eatwhat.db")

# DeepSeek API(B-05 起调用)
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# 应用元信息(/ 健康检查会用)
APP_NAME = "EatWhat Backend"
APP_VERSION = "1.0.0"
