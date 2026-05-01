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

**v1.1 — Canvas Intelligence & Rich Input**

- ✓ **CANV-01**: 工作台对话框背景精简为仅包围对话框大小 — v1.1
- ✓ **CANV-02**: 提高画布网格密度 — v1.1
- ✓ **CANV-03**: 移除卡片左上角圆点装饰 — v1.1
- ✓ **CANV-04**: 节点折叠/展开：连接点单击收纳未成图卡片，双击收纳全部后续卡片，三击展开全部 — v1.1
- ✓ **CANV-05**: 鼠标滚动画布平移，Ctrl+滚动画布缩放 — v1.1
- ✓ **INPT-01**: 支持上传文本文件（Word / TXT / PDF / PPT）并由 AI 分析生成创作方向 — v1.1
- ✓ **INPT-02**: 支持上传网页链接并由 AI 分析网站内容生成创作方向 — v1.1
- ✓ **SETT-01**: 设置面板：用户可配置分析 / 对话 / 成图模型的 API 及参数 — v1.1
- ✓ **SETT-02**: 深色模式切换 — v1.1
- ✓ **SETT-03**: 中英文语言切换 — v1.1
- ✓ **TOOL-01**: 一键整理画布：自动收缩未成图节点并美观重排剩余节点 — v1.1
- ✓ **TOOL-02**: 图片查看弹窗：点击卡片图片放大展示 — v1.1
- ✓ **TOOL-03**: 图片修改：弹窗内支持一键重生成或自定义 prompt 修改 — v1.1
- ✓ **TOOL-04**: 图片下载：弹窗内支持下载图片 — v1.1

**v1.2 — Interactive Canvas & Deep Analysis**

- ✓ **SEL-01**: 双击卡片选中，持久蓝色细线包围，对话框绑定到选中卡片，再次双击取消选中 — v1.2
- ✓ **SEL-02**: 无选中卡片时对话框禁用，尝试输入显示提示弹窗 — v1.2
- ✓ **SEL-03**: 卡片右上角悬停显示删除按钮，初始卡片和延伸卡片不可删除 — v1.2
- ✓ **SEL-04**: 双击卡片名称可编辑，Enter/失焦保存，Esc取消 — v1.2
- ✓ **DGEN-01**: 对话框所有操作以选中卡片为上下文锚点 — v1.2
- ✓ **DGEN-02**: 选中卡片后可在对话框输入约束直接生成新的成图方向子节点 — v1.2
- ✓ **DGEN-03**: 发送按钮左侧有 thinking/no-thinking 模式切换，影响本次请求 — v1.2
- ✓ **RMOD-01**: 原分析按钮改为"研究"悬停下拉菜单 — v1.2
- ✓ **RMOD-02**: 下拉菜单含"分析"(no-thinking)和"探索"(thinking)选项，悬停显示气泡说明 — v1.2
- ✓ **RMOD-03**: 探索模式返回创作方向同时搜集相关资料存储在节点数据中 — v1.2
- ✓ **RMOD-04**: 双击含资料的方向卡片弹出资料弹窗展示搜集到的资源 — v1.2
- ✓ **ISH-01**: 图片弹窗下方有圆形分享按钮 — v1.2
- ✓ **ISH-02**: 点击生成独立的单图分享网页 — v1.2
- ✓ **ISH-03**: 分享网页包含图片、AI讲解、原图摘要、生成方向说明 — v1.2

**v1.3 — Material Library**

- ✓ **LIB-01**: 导航栏新增素材库入口，跳转独立页面 — v1.3
- ✓ **LIB-02**: 工作台上传的文件自动同步到素材库 — v1.3
- ✓ **LIB-03**: 素材库文件数量上限 100 个 — v1.3
- ✓ **LIB-04**: 瀑布流布局展示，非图片文件显示封面/缩略图 — v1.3
- ✓ **LIB-05**: 按文件名搜索 — v1.3
- ✓ **LIB-06**: 多种排序方式（修改日期、加入日期、文件名、文件大小） — v1.3
- ✓ **LIB-07**: 素材库直接上传文件 — v1.3
- ✓ **LIB-08**: 支持删除素材库中的文件 — v1.3

### Active

**Future / v2+**

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
- S3/对象存储 — 本地文件存储足够，S3 可作为未来配置项
- 实时语音输入 — 超出当前 milestone 范围

## Context

- Brownfield 项目：已有可运行的画板原型（`server.js` + `public/app.js`）
- UI 基于 React + Vite + Tailwind 的文件柜式历史浏览器，由 server.js 托管构建产物
- 数据库持久化通过 PostgreSQL + Prisma 实现
- 支持多种输入格式：图片、文本文件、网页链接
- 画布支持一键整理、节点折叠/展开、深色模式、中英文切换
- Demo 模式在缺少 API key 时静默启用

## Current Milestone: v1.3 Material Library — SHIPPED

**Goal:** 为用户提供素材库功能，集中管理文件，支持搜索和多种排序方式。

**Shipped:** v1.3 Material Library (2026-05-02)
**Previous:** v1.2 Interactive Canvas & Deep Analysis (2026-04-27)

**Next milestone:** TBD — run `/gsd-new-milestone` to define

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 引入 PostgreSQL + Prisma | 用户明确要求数据库持久化，且需要结构化查询会话历史 | Validated v1.0 |
| 保留现有零依赖服务端核心 | 画板核心逻辑稳定运行，仅新增持久化层和 API | Validated v1.0 |
| `app/` React UI 作为独立构建产物 | Vite 构建后由 server.js 静态托管，与现有 `public/` 并存 | Validated v1.0 |
| 分享链接为只读 | 用户明确选择，协作编辑延后 | Validated v1.0 |
| 文本文件直接读取而非截图分析 | 大模型视觉 API 对文档截图效果差，文本提取更准确 | Validated v1.1 |
| 网页链接分析采用搜索+摘要而非全页抓取 | 避免处理复杂网页渲染，更稳定可靠 | Validated v1.1 |
| 卡片选中作为对话框锚点 | 所有对话/生成上下文必须显式指定，避免隐式全局上下文 | Validated v1.2 |
| 探索模式通过 AI 模型搜集参考资料 | 避免服务端网页爬取复杂度，利用模型搜索能力 | Validated v1.2 |
| 单图分享作为独立页面 | 轻量、无 React 依赖、易于缓存和分享 | Validated v1.2 |
| MaterialItem 独立 Prisma 模型 | 素材库与会话资源解耦，避免耦合 | Validated v1.3 |
| syncToMaterialLibrary 采用 fire-and-forget | 资源上传不因同步失败而中断 | Validated v1.3 |
| 哈希去重防止重复素材 | 相同文件不会创建多条记录 | Validated v1.3 |
| CSS grid 实现响应式布局 | 无需 JS 瀑布流库，简洁高效 | Validated v1.3 |
| parseDataUrl 支持任意 data URL | 统一处理图片和文档的 data URL 解析 | Validated v1.3 |

## Constraints

- **Tech Stack**: Node.js >= 18，现有代码为纯 JavaScript ES modules；PostgreSQL + Prisma 持久化
- **Compatibility**: 保持现有画布交互体验不变，新功能为增量添加
- **Performance**: 大模型 API 调用成本高，需避免重复调用
- **Storage**: 素材库文件数量上限 100 个

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

*Last updated: 2026-05-02 — v1.3 milestone shipped*
