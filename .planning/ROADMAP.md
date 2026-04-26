# ORYZAE Image Board — Roadmap

**Current Milestone:** v1.2 Interactive Canvas & Deep Analysis
**Granularity:** Standard
**Defined:** 2026-04-26

---

## Milestones

- ✅ **v1.0 Persistence & History** — Phases 1-4 (shipped 2026-04-26) · [Details](./milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Canvas Intelligence & Rich Input** — Phases 5-8 (shipped 2026-04-26) · [Details](./milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 Interactive Canvas & Deep Analysis** — Phases 9-12 (in progress)

---

## Phases

### v1.2 Interactive Canvas & Deep Analysis

- [ ] Phase 9: Card Selection & Basic Interaction
- [ ] Phase 10: Dialog Refactor & Generation Control
- [ ] Phase 11: Research Mode & Deep Analysis
- [ ] Phase 12: Image Sharing

---

## Phase Details

### Phase 9: Card Selection & Basic Interaction
**Goal:** 实现卡片选中机制，支持删除和重命名，为后续对话框绑定奠定基础。
**Depends on:** v1.1 Phase 8 (image viewer/modal infrastructure)
**Requirements:** SEL-01, SEL-02, SEL-03, SEL-04
**Success Criteria** (what must be TRUE):
  1. 双击卡片可选中，选中后持久蓝色细线包围
  2. 无选中卡片时对话框禁用，尝试输入显示提示弹窗
  3. 卡片右上角悬停显示删除按钮，初始卡片和延伸卡片不可删除
  4. 双击卡片名称可编辑，Enter/失焦保存，Esc取消
**Estimated Complexity:** Medium
**Plans:** 3 plans

### Phase 10: Dialog Refactor & Generation Control
**Goal:** 对话框绑定选中卡片，支持直接生成方向，添加思考模式切换。
**Depends on:** Phase 9 (card selection mechanism)
**Requirements:** DGEN-01, DGEN-02, DGEN-03
**Success Criteria** (what must be TRUE):
  1. 对话框所有操作以选中卡片为上下文锚点
  2. 选中卡片后可在对话框输入约束直接生成新的成图方向子节点
  3. 发送按钮左侧有 thinking/no-thinking 模式切换，影响本次请求
**Estimated Complexity:** High
**Plans:** 3 plans

### Phase 11: Research Mode & Deep Analysis
**Goal:** 将分析按钮升级为研究下拉菜单，支持分析和探索双模式，探索模式搜集资料。
**Depends on:** v1.1 Phase 6 (multi-format input analysis), Phase 9 (card selection)
**Requirements:** RMOD-01, RMOD-02, RMOD-03, RMOD-04
**Success Criteria** (what must be TRUE):
  1. 原分析按钮改为"研究"悬停下拉菜单，含分析和探索两个选项
  2. 悬停选项显示气泡提示说明两种模式差异
  3. 探索模式返回创作方向的同时搜集相关资料存储在节点数据中
  4. 双击包含资料的方向卡片弹出资料弹窗展示搜集到的资源
**Estimated Complexity:** High
**Plans:** 3 plans

### Phase 12: Image Sharing
**Goal:** 在图片查看弹窗中添加分享功能，生成单图分享网页。
**Depends on:** v1.1 Phase 8 (image viewer modal)
**Requirements:** ISH-01, ISH-02, ISH-03
**Success Criteria** (what must be TRUE):
  1. 图片弹窗下方有圆形分享按钮
  2. 点击生成独立的单图分享网页
  3. 分享网页包含图片、AI讲解、原图摘要、生成方向说明
**Estimated Complexity:** Medium
**Plans:** 2 plans

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database & File Storage Foundation | v1.0 | 4/4 | Complete | 2026-04-25 |
| 2. History Browser UI & Navigation | v1.0 | 4/4 | Complete | 2026-04-25 |
| 3. Sharing & Snapshots | v1.0 | 3/3 | Complete | 2026-04-25 |
| 4. AI Titles & Explanations | v1.0 | 3/3 | Complete | 2026-04-26 |
| 5. Canvas Interaction Polish | v1.1 | 3/3 | Complete | 2026-04-26 |
| 6. Multi-format Input & AI Analysis | v1.1 | 3/3 | Complete | 2026-04-26 |
| 7. Settings & Personalization | v1.1 | 3/3 | Complete | 2026-04-26 |
| 8. Canvas Intelligence & Image Tools | v1.1 | 3/3 | Complete | 2026-04-26 |
| 9. Card Selection & Basic Interaction | v1.2 | 0/3 | Not started | - |
| 10. Dialog Refactor & Generation Control | v1.2 | 0/3 | Not started | - |
| 11. Research Mode & Deep Analysis | v1.2 | 0/3 | Not started | - |
| 12. Image Sharing | v1.2 | 0/2 | Not started | - |

---

*Next: /gsd-plan-phase 9 to begin execution.*