# ORYZAE Image Board

## What This Is

一个画布式图片生成探索原型。用户上传图片后，后端调用视觉大模型分析内容，在画布上生成多条可选择的创作方向；用户点击某个方向后，后端调用成图模型生成新图片。本项目在此基础上引入数据库持久化和文件柜式历史浏览界面，让每次探索会话都能被保存、回顾和分享。

## Core Value

用户上传一张图，就能在画布上获得 AI 驱动的创作方向并生成新图；刷新页面后历史会话不丢失，可随时翻阅过往探索并查看 AI 对每张生成图的讲解。

## Requirements

### Validated

- ✓ 用户上传图片，前端自动压缩（最大 1600px，JPEG quality 0.88） — existing
- ✓ 后端调用视觉大模型分析图片，返回摘要、关键词、5 条创作方向 — existing
- ✓ 画布式节点图 UI：平移、缩放、拖拽节点 — existing
- ✓ 点击创作方向后调用成图模型生成图片 — existing
- ✓ 聊天界面：用户可就分析结果继续对话 — existing
- ✓ Demo 模式：无 API key 时用本地 SVG 模拟数据 — existing
- ✓ 三角色模型配置（分析 / 对话 / 成图可分不同 API） — existing
- ✓ 健康检查端点 `/api/health` — existing

### Active

- [ ] **PERS-01**: 刷新页面后不丢失当前画板工作（节点位置、生成图、聊天记录）
- [ ] **PERS-02**: 每次会话保存后可按时间线回溯历史会话列表
- [ ] **PERS-03**: 历史会话由 AI 自动生成简短标题（基于分析摘要）
- [ ] **HIST-01**: 文件柜式历史浏览 UI：顶部文件夹标签 = 历史会话，侧边栏 = 会话内素材列表，右侧 = 详情页
- [ ] **HIST-02**: 侧边栏素材类型支持：生成图片、网页链接、上传文件、聊天记录片段
- [ ] **HIST-03**: 右侧详情页对每张生成图调用大模型 API 生成内容讲解
- [ ] **SHAR-01**: 生成只读分享链接，他人可查看完整会话节点图
- [ ] **SHAR-02**: 支持导出 JSON 备份文件，可导入恢复会话
- [ ] **DATA-01**: 使用 PostgreSQL + Prisma ORM 持久化会话、节点、图片元数据
- [ ] **DATA-02**: 服务端文件存储（上传原图、生成图片）

### Out of Scope

- 用户认证与多账户系统 — 当前为单用户本地/自托管场景，认证会增加不必要的复杂度
- 实时多人协作编辑画布 — 需要 WebSocket + 冲突解决，超出 v1 范围
- 移动端 App — Web 优先，移动端适配仅保证可用性
- 视频生成 — 仅支持图片生成
- 第三方 OAuth 登录 — 邮件/密码都未引入，OAuth 更不需要

## Context

- Brownfield 项目：已有可运行的画板原型（`server.js` + `public/app.js`），零运行时依赖
- UI 原型参考：`app/` 文件夹内含 React + Vite + Tailwind + shadcn/ui 的文件柜式界面，需迁移并适配到本项目
- 当前两个巨石文件（server.js / app.js 各 ~650 行），无测试、无类型、无模块化
- Demo 模式在缺少 API key 时静默启用，存在生产环境误触发风险
- 画布状态全在客户端内存，刷新即丢失

## Constraints

- **Tech Stack**: Node.js >= 18，现有代码为纯 JavaScript ES modules；新增 PostgreSQL + Prisma，保持后端可维护性
- **UI Migration**: `app/` 文件夹内的 React 组件需整合进现有服务端渲染方案，或改为独立前端构建产物由 server.js 托管
- **Timeline**: 优先解决“刷新不丢工作”这一核心痛点，再扩展历史浏览 UI
- **Compatibility**: 保持现有画布交互体验不变，新功能为增量添加
- **Performance**: 大模型 API 调用成本高，需避免重复调用（如已分析的图不再重复分析）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 引入 PostgreSQL + Prisma | 用户明确要求数据库持久化，且需要结构化查询会话历史 | — Pending |
| 保留现有零依赖服务端核心 | 画板核心逻辑稳定运行，仅新增持久化层和 API | — Pending |
| `app/` React UI 作为独立构建产物 | Vite 构建后由 server.js 静态托管，与现有 `public/` 并存或逐步替换 | — Pending |
| 分享链接为只读 | 用户明确选择，协作编辑延后 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after initialization*
