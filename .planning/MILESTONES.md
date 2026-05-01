# ORYZAE Image Board — Milestones

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
