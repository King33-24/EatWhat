#!/usr/bin/env python3
"""
冷静期解锁脚本。
将 unlock_at < now AND status='locked' 的记录改为 status='unlocked'。
输出 JSON: {"success": true, "unlocked_count": N}
"""
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = "/home/king/project/data/eatwhat.db"


def main():
    if not Path(DB_PATH).exists():
        print(json.dumps({"success": False, "error": f"数据库不存在: {DB_PATH}"}, ensure_ascii=False))
        sys.exit(1)

    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute(
        """
        UPDATE cooldown_items
        SET status = 'unlocked'
        WHERE status = 'locked' AND unlock_at <= ?
        """,
        (now,),
    )
    conn.commit()
    unlocked_count = cur.rowcount
    conn.close()

    print(json.dumps({"success": True, "unlocked_count": unlocked_count}, ensure_ascii=False))


if __name__ == "__main__":
    main()
