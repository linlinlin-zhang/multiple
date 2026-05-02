# ORYZAE Image Board — Milestones

## v2.0 Multi-Card Canvas Interaction

**Shipped:** 2026-05-02
**Phases:** 3 | **Plans:** 8

### What Was Built

- New Card command in `/` menu creating deletable blank cards on canvas
- Drag-to-connect interaction with SVG Bezier curves between cards
- Junction nodes with auto-create, auto-join, and max 5-card capacity
- Blueprint modal: double-click junction to open, drag cards, draw relationship lines
- Relationship types: upstream (solid blue), downstream (solid cyan), parallel (dashed gray)
- Blueprint relationships injected into AI chat context for exploration guidance
- Menu cleanup: removed zoom-in, zoom-out, history, settings from `/` menu

### Key Accomplishments

1. **Phase 16: Menu Cleanup & New Card** — Streamlined `/` menu, added `createNewCardNode()` with collision-avoidant positioning and delete button
2. **Phase 17: Connection Lines & Junction Nodes** — Edge handle drag-to-connect, `handleNewConnection` with auto-create/merge/join logic, junction CSS with cyan-to-blue gradient
3. **Phase 18: Blueprint Modal** — Fixed junction persistence, built modal with card drag + relationship drawing + type picker, integrated blueprint context into AI systemContext

### Requirements

| Requirement | Description | Status |
|-------------|-------------|--------|
| MC-01 | 新建卡片命令 | ✓ Shipped |
| MC-02 | 可删除卡片 | ✓ Shipped |
| MC-03 | 连接线条 | ✓ Shipped |
| MC-04 | 聚合节点自动生成 | ✓ Shipped |
| MC-05 | 聚合节点视觉区分 | ✓ Shipped |
| MC-06 | 自动归入聚合节点 | ✓ Shipped |
| MC-07 | 最多 5 张卡片 | ✓ Shipped |
| MC-08 | 双击打开蓝图弹窗 | ✓ Shipped |
| MC-09 | 弹窗展示关联卡片 | ✓ Shipped |
| MC-10 | 弹窗拖动卡片 | ✓ Shipped |
| MC-11 | 弹窗绘制关系线 | ✓ Shipped |
| MC-12 | 关系线指导 AI | ✓ Shipped |
| MC-13 | 移除 zoom-in | ✓ Shipped |
| MC-14 | 移除 zoom-out | ✓ Shipped |
| MC-15 | 移除 history | ✓ Shipped |
| MC-16 | 移除 settings | ✓ Shipped |

**16/16 requirements shipped (100%)**

### Tech Decisions

- Junction nodes as circular elements with cyan-to-blue gradient — visually distinct from cards
- Edge handles on card sides for connection drag — hover-reveal, crosshair cursor
- Rewire links through junction node — cleaner than direct card-to-card links
- Blueprint modal uses 1:1 coordinates (no scale division) — modal-local coordinate system
- Click-to-delete on SVG path elements — direct event binding, no overlay buttons
- Hardcoded Chinese fallback for blueprintContext — no locale key exists
- Blueprint cleanup order in deleteNode — after junction state, before DOM removal

Known deferred items at close: 1 (Phase 18 browser smoke tests — code-level verified)

---

*v2.0 completed: 2026-05-02*

---

## v1.3 Material Library

**Shipped:** 2026-05-02
**Phases:** 3 | **Plans:** 6

### What Was Built

- MaterialItem Prisma model with CRUD REST API (search, sort, file count enforcement)
- Dedicated material library page with responsive grid layout, image thumbnails, and file type icons
- Workbench-to-material-library auto-sync for all uploaded files
- Material upload directly from library page
- Material delete with confirmation dialog
- Global navigation entry for material library

### Key Accomplishments

1. **Phase 13: Data Model & API** — Prisma model, REST endpoints (GET/POST/DELETE /api/materials), search by filename, 4-way sort, 100-item limit enforcement
2. **Phase 14: Material Library Page** — React page with responsive grid (2-5 columns), image thumbnails via /api/materials/:id/file, file type icons for PDF/PPT/TXT/DOC/Video, debounced search, sort dropdown, empty/error states
3. **Phase 15: Workbench Sync & File Management** — Auto-sync uploads to material library (fire-and-forget), hash-based dedup, direct upload from library page, delete with AlertDialog confirmation

### Requirements

| Requirement | Description | Status |
|-------------|-------------|--------|
| LIB-01 | 导航栏新增素材库入口 | ✓ Shipped |
| LIB-02 | 工作台上传自动同步素材库 | ✓ Shipped |
| LIB-03 | 文件数量上限 100 个 | ✓ Shipped |
| LIB-04 | 瀑布流布局展示 | ✓ Shipped |
| LIB-05 | 非图片文件显示封面图标 | ✓ Shipped |
| LIB-06 | 按文件名搜索 | ✓ Shipped |
| LIB-07 | 多种排序方式 | ✓ Shipped |
| LIB-08 | 支持删除素材 | ✓ Shipped |

**8/8 requirements shipped (100%)**

### Tech Decisions

- MaterialItem as independent Prisma model (not extending Asset) — avoids coupling
- syncToMaterialLibrary is fire-and-forget — asset upload never fails due to sync
- Hash-based dedup prevents duplicate material entries
- CSS grid (not masonry JS library) for responsive layout
- parseDataUrl in storage.js handles any data URL format, not just images

---

*v1.3 completed: 2026-05-02*
