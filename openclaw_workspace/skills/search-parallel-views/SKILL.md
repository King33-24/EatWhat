---
name: search-parallel-views
description: 为认知体检报告中的思维盲区检索平行观点，写入平行书架。当用户说"刷新书架"、"推荐对立观点"、"平行书架"、"生成书架"时触发。也会在 analyze-cognition 执行完毕后自动调用。
---

# search-parallel-views Skill

## 工作流程

1. 运行书架生成脚本：
   ```bash
   /home/king/project/backend/.venv/bin/python3 /home/king/project/openclaw_workspace/skills/search-parallel-views/scripts/search_parallel_views.py
   ```
2. 脚本会：读取最新 reports.blind_spots → 用 DuckDuckGo 搜索 + DeepSeek 筛选 → 写入 bookshelf_items 表
3. 脚本输出 JSON，从中提取 `item_count` 告知用户
4. 若脚本报错，读取错误信息后告知用户具体原因

## 成功后回复格式

"平行书架已更新，共添加 {item_count} 条推荐。打开 http://localhost:8000/bookshelf.html 查看。"

## 注意事项

- 脚本需要 `DEEPSEEK_API_KEY` 环境变量
- 若最新报告无思维盲区数据，提示用户先生成认知体检报告
- 搜索使用 DuckDuckGo（无需 API Key），质量有限；决赛阶段可升级为 Serper.dev
