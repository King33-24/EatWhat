---
name: cooldown-unlock
description: 冷静期自动解锁。每日 00:30 自动运行，将 unlock_at 已过期的冷静期项目状态从 locked 改为 unlocked。也可手动触发：当用户说"检查冷静期"、"解锁冷静期"、"解锁到期的项目"时触发。
---

# cooldown-unlock Skill

## 工作流程

运行解锁脚本：
```bash
/home/king/project/backend/.venv/bin/python3 /home/king/project/openclaw_workspace/skills/cooldown-unlock/scripts/cooldown_unlock.py
```

脚本输出 JSON：`{"success": true, "unlocked_count": 3}`

## 成功后回复格式

- 若 unlocked_count > 0："已解锁 {unlocked_count} 个冷静期项目。"
- 若 unlocked_count == 0："暂无需要解锁的项目。"
