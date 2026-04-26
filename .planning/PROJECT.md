# ORYZAE Image Board

## What This Is

一个画布式图片生成探索原型。用户上传图片后，后端调用视觉大模型分析内容，在画布上生成多条可选择的创作方向；用户点击某个方向后，后端调用成图模型生成新图片。本项目在此基础上引入数据库持久化和文件柜式历史浏览界面，让每次探索会话都能被保存、回顾和分享。

## Core Value

用户上传一张图，就能在画布上获得 AI 驱动的创作方向并生成新图；刷新页面后历史会话不丢失，可随时翻阅过往探索并查看 AI 对每张生成图的讲解。

## Requirements

### Validated

**v1.0 — Persistence & History**

- ✓ 用户上传图片，前端自动压缩（最大 1600px，JPEG quality 0.88） — existing
- ✓ 后端调用视觉大模型分析图片，返回摘要、关键词、5 条创作方向 — existing
- ✓ 画布式节点图 UI：平移、缩放、拖拽节点 — existing
- ✓ 点击创作方向后调用成图模型生成图片 — existing
- ✓ 聊天界面：用户可就分析结果继续对话 — existing
- ✓ Demo 模式：无 API key 时用本地 SVG 模拟数据 — existing
- ✓ 三角色模型配置（分析 / 对话 / 成图可分不同 API） — existing
- ✓ 健康检查端点 `/api/health` — existing
- ✓ **PERS-01**: 刷新页面后不丢失当前画板工作 — v1.0
- ✓ **PERS-02**: 按时间线回溯历史会话列表 — v1.0
- ✓ **PERS-03**: AI 自动生成会话标题 — v1.0
- ✓ **HIST-01**: 文件柜式历史浏览 UI — v1.0
- ✓ **HIST-02**: 侧边栏素材类型支持 — v1.0
- ✓ **HIST-03**: 图片 AI 内容讲解 — v1.0
- ✓ **SHAR-01**: 只读分享链接 — v1.0
- ✓ **SHAR-02**: JSON 导出/导入 — v1.0
- ✓ **DATA-01**: PostgreSQL + Prisma 持久化 — v1.0
- ✓ **DATA-02**: 服务端文件存储 — v1.0

### Active

**Milestone v1.1 — Canvas Intelligence & Rich Input**

- [ ] **CANV-01**: 工作台对话框背景精简为仅包围对话框大小
- [ ] **CANV-02**: 提高画布网格密度
- [ ] **CANV-03**: 移除卡片左上角圆点装饰
- [ ] **CANV-04**: 节点折叠/展开：连接点单击收纳未成图卡片，双击收纳全部后续卡片，三击展开全部
- [ ] **CANV-05**: 鼠标滚动画布平移，Ctrl+滚动画布缩放
- [ ] **INPT-01**: 支持上传文本文件（Word / TXT / PDF / PPT）并由 AI 分析生成创作方向
- [ ] **INPT-02**: 支持上传网页链接并由 AI 分析网站内容生成创作方向
- [ ] **SETT-01**: 设置面板：用户可配置分析 / 对话 / 成图模型的 API 及参数
- [ ] **SETT-02**: 深色模式切换
- [ ] **SETT-03**: 中英文语言切换
- [ ] **TOOL-01**: 一键整理画布：自动收缩未成图节点并美观重排剩余节点
- [ ] **TOOL-02**: 图片查看弹窗：点击卡片图片放大展示
- [ ] **TOOL-03**: 图片修改：弹窗内支持一键重生成或自定义 prompt 修改
- [ ] **TOOL-04**: 图片下载：弹窗内支持下载图片

**Future / v2**

- **SRCH-01**: 按关键词搜索历史会话标题和内容
- **SRCH-02**: 按日期范围筛选会话
- **SRCH-03**: 会话文件夹/标签分类
- **SHAR-04**: 分享链接设置过期时间
- **SHAR-05**: 批量导出多个会话为 zip 归档

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

## Current Milestone: v1.1 Canvas Intelligence & Rich Input

**Goal:** 将画布升级为智能创作工作台，支持多种输入格式、更高效的画布交互、完善的图片管理与个性化设置。

**Target features:**
- Canvas 交互优化：对话框精简、更密网格、去除圆点、节点折叠展开、滚动画布
- 多格式输入分析：文本文件（Word/TXT/PDF/PPT）、网页链接的 AI 分析
- 设置系统：API 配置、深色模式、中英文语言切换
- 画布智能整理：一键自动排布节点
- 图片工具链：查看弹窗、修改重生成、下载

**Key Decisions (v1.1)**

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 文本文件直接读取而非截图分析 | 大模型视觉 API 对文档截图效果差，文本提取更准确 | — Pending |
| 网页链接分析采用搜索+摘要而非全页抓取 | 避免处理复杂网页渲染，更稳定可靠 | — Pending |

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
*Last updated: 2026-04-26 — milestone v1.1 initialized*
