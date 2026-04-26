# ORYZAE Image Board — Roadmap

**Current Milestone:** v1.1 Canvas Intelligence & Rich Input
**Granularity:** Standard
**Defined:** 2026-04-26

---

## Milestones

- ✅ **v1.0 Persistence & History** — Phases 1-4 (shipped 2026-04-26)
- 🚧 **v1.1 Canvas Intelligence & Rich Input** — Phases 5-8 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 Persistence & History (Phases 1-4) — SHIPPED 2026-04-26</summary>

- [x] Phase 1: Database & File Storage Foundation (4/4 plans) — completed 2026-04-25
- [x] Phase 2: History Browser UI & Navigation (4/4 plans) — completed 2026-04-25
- [x] Phase 3: Sharing & Snapshots (3/3 plans) — completed 2026-04-25
- [x] Phase 4: AI Titles & Explanations (3/3 plans) — completed 2026-04-26

</details>

### 🚧 v1.1 Canvas Intelligence & Rich Input (In Progress)

- [x] Phase 5: Canvas Interaction Polish
- [ ] Phase 6: Multi-format Input & AI Analysis
- [ ] Phase 7: Settings & Personalization
- [ ] Phase 8: Canvas Intelligence & Image Tools

---

## Phase Details

### Phase 5: Canvas Interaction Polish
**Goal:** 优化画布交互体验，让工作台更简洁、操作更直觉。
**Depends on:** v1.0 Phase 1-4 (基础架构已完成)
**Requirements:** CANV-01, CANV-02, CANV-03, CANV-04, CANV-05
**Success Criteria** (what must be TRUE):
  1. 工作台对话框背景仅包围对话框本身，无多余空白框
  2. 画布网格肉眼可见且密度比 v1.0 提高约 50%
  3. 所有卡片左上角不再显示装饰圆点
  4. 选择方向生成图片后，未选择的方向卡片自动折叠隐藏到连接点；单击连接点可切换该分支折叠/展开；双击折叠该节点后全部子节点；三击展开全部
  5. 鼠标直接滚动可上下平移画布；按住 Ctrl 滚动可缩放画布
**Estimated Complexity:** Medium
**Plans:** 3 plans

### Phase 6: Multi-format Input & AI Analysis
**Goal:** 支持文本文件和网页链接作为输入源，由 AI 分析内容并生成创作方向。
**Depends on:** v1.0 Phase 1 (数据库持久化、文件存储)
**Requirements:** INPT-01, INPT-02
**Success Criteria** (what must be TRUE):
  1. 用户可上传 Word / TXT / PDF / PPT 文件，系统提取文本并调用大模型分析，在画布上生成创作方向节点
  2. 用户可粘贴网页链接，系统调用大模型搜索/摘要能力分析网页内容，在画布上生成创作方向节点
  3. 文本文件和网页链接分析后的初始卡片展示来源标识（文件名或网页域名）
  4. 分析结果与图片上传分析的体验一致：摘要、关键词、多条创作方向
**Estimated Complexity:** High
**Plans:** 3 plans

### Phase 7: Settings & Personalization
**Goal:** 用户可自定义 API 配置、切换深色模式和语言。
**Depends on:** v1.0 Phase 1 (数据库存储配置)
**Requirements:** SETT-01, SETT-02, SETT-03
**Success Criteria** (what must be TRUE):
  1. 设置面板允许用户分别配置分析、对话、成图三个角色的 API endpoint、model、API key、temperature
  2. 切换深色模式后，画布、历史浏览器、设置面板立即响应，无闪烁
  3. 切换语言后，所有 UI 文本即时切换为中文或英文
  4. 设置持久化到数据库，刷新页面后保持
**Estimated Complexity:** Medium
**Plans:** 3 plans
**UI hint:** yes

### Phase 8: Canvas Intelligence & Image Tools
**Goal:** 一键整理画布布局，提供图片查看、修改和下载功能。
**Depends on:** v1.0 Phase 1-4, Phase 5 (画布交互)
**Requirements:** TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. 点击「一键整理」后，未成图节点自动收缩，剩余节点按树形层级重新排布，布局美观整洁
  2. 点击卡片中的图片弹出模态框，放大展示图片及其 AI 讲解描述
  3. 图片弹窗内提供「修改」按钮，可选择一键重生成或输入自定义 prompt 修改
  4. 图片弹窗内提供「下载」按钮，可下载原始图片文件
**Estimated Complexity:** High
**Plans:** 3 plans
**UI hint:** yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database & File Storage Foundation | v1.0 | 4/4 | Complete | 2026-04-25 |
| 2. History Browser UI & Navigation | v1.0 | 4/4 | Complete | 2026-04-25 |
| 3. Sharing & Snapshots | v1.0 | 3/3 | Complete | 2026-04-25 |
| 4. AI Titles & Explanations | v1.0 | 3/3 | Complete | 2026-04-26 |
| 5. Canvas Interaction Polish | v1.1 | 3/3 | Complete | 2026-04-26 |
| 6. Multi-format Input & AI Analysis | v1.1 | 0/3 | Not started | - |
| 7. Settings & Personalization | v1.1 | 0/3 | Not started | - |
| 8. Canvas Intelligence & Image Tools | v1.1 | 0/3 | Not started | - |
