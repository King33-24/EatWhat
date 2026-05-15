---
name: analyze-cognition
description: 生成认知体检报告。分析用户近7天在小红书的浏览数据，识别兴趣地图、观点倾向光谱、思维盲区和情绪共鸣模式，写入数据库。当用户说"生成报告"、"认知体检"、"分析我的数据"、"分析我的浏览记录"时触发。
---

# analyze-cognition Skill

## 工作流程

1. 运行分析脚本：
   ```bash
   /home/king/project/backend/.venv/bin/python3 /home/king/project/openclaw_workspace/skills/analyze-cognition/scripts/analyze_cognition.py
   ```
2. 脚本会自动完成：读取近7天 raw_observations → 调用 DeepSeek API → 解析 JSON → 写入 reports 表
3. 脚本输出 JSON，从中提取 `report_id` 告知用户
4. 若脚本报错，读取错误信息后告知用户具体原因

## 成功后回复格式

"已生成你的认知体检报告（ID: {report_id}）。打开 http://localhost:8000/report.html 查看详情。"

## 注意事项

- 脚本需要 `DEEPSEEK_API_KEY` 环境变量（已在 ~/.bashrc 配置）
- 数据库路径：`/home/king/project/data/eatwhat.db`
- 若近7天 raw_observations 不足5条，提示用户先用扩展采集更多数据
