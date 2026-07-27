# 问膳 EatWhat

> **面墙而立，破壁而观** — 一个不推送、不说教、不替你思考的认知健康智能体

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) ![Status](https://img.shields.io/badge/status-WIP-orange) ![Track](https://img.shields.io/badge/赛道-智能体应用-blue)

---

## 简介

EatWhat 通过审视用户在 小红书的数字足迹，帮 TA 看见信息茧房之外的世界，重新掌握深度思考的主动权。它从不替用户做决定，只做三件事——**呈现、追问、邀请**。

三个 MVP 功能：
- **认知体检报告**：兴趣地图 + 观点光谱 + 思维盲区 + 情绪共鸣
- **平行书架**：基于盲区匹配理性、对立视角的内容源
- **冷静期盒子**：把"低质上瘾"链接锁定 7 天

## 项目状态

- 开发中 🚧
- 初赛截止：**2026-05-24 24:00**
- 比赛赛道：智能体应用（基于 OpenClaw 框架）
- 团队：2 名计算机大一学生

## 技术栈

- **Agent 主体**：[OpenClaw](https://github.com/openclaw/openclaw)
- **大模型**：DeepSeek V4 Flash（通过 DeepSeek API）
- **后端**：FastAPI + SQLAlchemy + SQLite
- **Web Dashboard**：HTML + HTMX + Tailwind + DaisyUI + ECharts（**全 CDN，无构建工具**）
- **浏览器扩展**：Manifest V3，原生 JS
- **运行环境**：Ubuntu 24.04 LTS（VMware Player）

## 快速开始

> ⚠️ 本项目目前还在 W1 骨架阶段，下面的指令到 W1 末才能跑通。

### 前置依赖

- Ubuntu 24.04 LTS
- Python 3.12
- Google Chrome
- DeepSeek API Key（[这里申请](https://platform.deepseek.com/api_keys)）

### 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DEEPSEEK_API_KEY=你的key
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

打开 <http://localhost:8000> 看到 `EatWhat Backend OK`。

### 浏览器扩展

1. Chrome 打开 `chrome://extensions/`
2. 右上角「开发者模式」
3. 点「加载已解压的扩展程序」选 `extension/` 文件夹
4. 打开 小红书笔记页 → 点扩展图标 → 采集

### OpenClaw

参考 [OpenClaw 官方仓库](https://github.com/openclaw/openclaw)安装。

## 目录结构

```
project/
├── backend/                # FastAPI 后端
├── frontend/               # Web Dashboard (HTML/HTMX)
├── extension/              # 浏览器扩展 (Manifest V3)
├── openclaw_workspace/     # OpenClaw Agent + Skills
├── data/                   # 运行期数据（gitignore）
├── demo/                   # 演示物料
├── docs/                   # 项目文档
│   ├── api.md              # 接口契约 ⭐ 前后端必读
│   ├── project_structure.md # 项目目录说明
│   ├── design/             # 设计文档
│   │   ├── eatwhat.md      # 当前权威设计文档（v4.1 赛后打磨版）
│   │   ├── commercialization.md  # 商业化叙事草案
│   │   └── history/        # 历史设计文档归档
│   ├── contest/            # 比赛相关材料
│   └── development/        # 开发过程记录（bug 追踪、迭代日志）
└── .github/
    └── copilot-instructions.md  # Copilot 项目级规范
```

## 文档导航

| 想做什么 | 看这个 |
|---|---|
| 理解项目设计 | [`docs/design/eatwhat.md`](docs/design/eatwhat.md) |
| 查看项目目录说明 | [`docs/project_structure.md`](docs/project_structure.md) |
| 追踪 bug | [`docs/development/bug_tracker.md`](docs/development/bug_tracker.md) |
| 前后端对齐接口 | [`docs/api.md`](docs/api.md) |
| 商业化叙事（PPT 用） | [`docs/design/commercialization.md`](docs/design/commercialization.md) |
| 比赛规则原图 | [`docs/contest/contest_rules.jpg`](docs/contest/contest_rules.jpg) |

## 协作约定

- **AI 协作分工**：B 同学（Claude 写后端 + OpenClaw）、F 同学（Copilot 写前端 + 扩展）
- **接口契约**：`docs/api.md` 是双方对齐的唯一事实源
- **每日同步**：晚 8 点过对方 commit，10 分钟
- **Commit 消息**：中文，格式 `类型(范围): 简短说明`，例 `feat(backend): 实现 POST /ingest`

## 团队

- B 同学（后端 + Agent）
- F 同学（前端 + 扩展）

## License

MIT
