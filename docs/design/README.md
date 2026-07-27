# design/ 设计文档

本目录存放 EatWhat 项目的设计文档。

---

## 文件说明

| 文件 | 用途 |
|---|---|
| [`eatwhat.md`](eatwhat.md) | **当前权威设计文档**。包含项目理念、MVP 功能、技术栈、架构、数据库 Schema、比赛要求、商业化简版、提交物清单等。任何后续开发都以此为准。 |
| [`commercialization.md`](commercialization.md) | 商业化潜力分析草案，用于技术报告书和答辩 PPT。 |
| [`history/`](history/) | 历史设计文档归档，包括 ver1、ver2、ver3、update1.txt。 |

---

## 历史归档

- `history/ver1.md`：2026-05-07 初稿，列出 5 个功能 + 初步技术栈。
- `history/ver2.md`：2026-05-08 v2/v3 设计，B 站数据源方案，已冻结。
- `history/ver3.md`：2026-05-12 v4 设计，B 站 → 小红书数据源迁移版，已归档。
- `history/update1.txt`：早期澄清答复。

---

## 使用规则

1. **不要直接修改历史归档文件**；如需引用，用相对路径指向 `history/`。
2. **修改 `eatwhat.md` 前先想清楚**：这是权威文档，改一个字可能意味着代码、前端、扩展都要跟着改。
3. **新增设计决策**：如果是小补充，直接追加到 `eatwhat.md` 对应章节；如果是大方向变更，先开讨论再写入。
