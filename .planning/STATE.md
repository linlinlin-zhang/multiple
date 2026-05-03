---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: Multi-Scenario Intelligence
status: roadmap_ready
stopped_at: Awaiting phase 19 planning
last_updated: "2026-05-03"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# ORYZAE Image Board — Project State

**Milestone:** Multi-Scenario Intelligence v3.1
**Core Value:** 提升应用的多场景实用性——根据输入内容类型智能选择分析策略，支持更多文件格式，扩展方向卡片数量，优化 prompt 管理和上下文维护。
**Project Reference:** [PROJECT.md](./PROJECT.md)
**Last Updated:** 2026-05-03

---

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v3.1 — Multi-Scenario Intelligence |
| Phase | 19 (not started) |
| Plans | — |
| Status | v3.0 shipped, roadmap ready for v3.1 |
| Progress | 0% |

```
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1.0 requirements validated | 17/17 |
| v1.1 requirements validated | 14/14 |
| v1.2 requirements validated | 14/14 |
| v1.3 requirements shipped | 8/8 |
| v2.0 requirements shipped | 16/16 |
| v3.0 requirements shipped | 5/5 |
| v3.1 requirements mapped | 19 |
| Phases complete (v3.1) | 0/6 |
| Blockers | 0 |

---

## Accumulated Context

### Decisions Log

| # | Decision | Date | Rationale |
|---|----------|------|-----------|
| 1 | PostgreSQL + Prisma for persistence | 2026-04-25 | Structured relational data, schema migrations, transaction support |
| 2 | Local filesystem + SHA-256 for image storage | 2026-04-25 | Avoid base64 in DB, content-addressable deduplication |
| 3 | `app/` React UI as independent Vite build | 2026-04-25 | Reuse existing prototype, served by server.js alongside `public/` |
| 4 | Share links are immutable snapshots | 2026-04-25 | Prevents drift between shared and live session |
| 5 | Manual migration SQL created offline | 2026-04-25 | PostgreSQL not available in execution environment |
| 6 | NodeGraphThumbnail anchor calculation uses Math.min(height*0.48, height-32) | 2026-04-25 | Exactly matches public/app.js anchor() behavior |
| 7 | Mobile sidebar implemented as fixed overlay with backdrop | 2026-04-25 | Avoids z-index issues with SVG thumbnails |
| 8 | Link shadow drawn as separate path layer | 2026-04-25 | Better performance with many links vs SVG filter per-link |
| 9 | 文本文件直接读取而非截图分析 | 2026-04-26 | 大模型视觉 API 对文档截图效果差，文本提取更准确 |
| 10 | 网页链接分析采用搜索+摘要而非全页抓取 | 2026-04-26 | 避免处理复杂网页渲染，更稳定可靠 |
| 11 | Card selection as dialog anchor | 2026-04-27 | All chat/generation context must be explicit; no implicit global context |
| 12 | Explore mode gathers references via AI model | 2026-04-27 | Avoid server-side web scraping complexity; leverage model's search capability |
| 13 | Share-image as standalone page | 2026-04-27 | Lightweight, no React dependency, easy to cache and share |
| 14 | MaterialItem as independent Prisma model (not extending Asset) | 2026-05-01 | Material library is a separate concern from session assets; avoids coupling |
| 15 | syncToMaterialLibrary is fire-and-forget | 2026-05-01 | Asset upload never fails due to material sync errors |
| 16 | Hash-based dedup for material library | 2026-05-01 | Same file content won't create duplicate entries |
| 17 | CSS grid for responsive layout | 2026-05-01 | No JS masonry library needed; 2-5 columns responsive |
| 18 | parseDataUrl for general data URL parsing | 2026-05-01 | Existing parseImageDataUrl only handles images; needed for PDF/docx |
| 19 | Keep translation keys for removed commands | 2026-05-02 | Keys may be used by sidebar nav labels; removing is out of scope |
| 20 | Keep zoomBy/resetView functions after removing command entries | 2026-05-02 | Functions still used by zoom buttons, wheel zoom, and canvas actions |
| 21 | Junction nodes as circular elements with gradient | 2026-05-02 | Visually distinct from rectangular cards per MC-05; cyan-to-blue gradient |
| 22 | Edge handles on card sides for connection drag | 2026-05-02 | Left/right handles appear on hover; cursor: crosshair for drag affordance |
| 23 | Rewire links through junction node | 2026-05-02 | Direct card-to-card links replaced with card-to-junction links for clarity |
| 24 | Verified Plan 01 implementations correct | 2026-05-02 | All 7 verification checks passed — no fixes needed for modal drag, line drawing, type picker |
| 25 | Click-to-delete on SVG path elements | 2026-05-02 | Attach click listener directly to SVG path rather than overlay buttons |
| 26 | Hardcoded fallback for blueprintContext text | 2026-05-02 | No locale key exists; used Chinese string directly rather than adding i18n keys |
| 27 | Blueprint cleanup order in deleteNode | 2026-05-02 | Cleanup after junction state update but before deselect/DOM removal |
| 28 | Shared context pool (not sliding window) for context management | 2026-05-02 | User preference: persist key info organized by topic/card, not strict token-limited window |
| 29 | Prompt extraction as Phase 19 (pure refactor) | 2026-05-02 | Unblocks task routing, dynamic directions, and context injection |
| 30 | v3.0 ships as infrastructure + experience upgrade before v3.1 AI features | 2026-05-03 | Model migration, homepage redesign, and library preview are foundational and ready now |
| 31 | Default model stack unified on Qwen/DashScope | 2026-05-03 | Simpler key management, better Chinese support, consistent API surface |
| 32 | Three.js homepage as separate entry from workbench | 2026-05-03 | Marketing/showcase surface distinct from daily-use canvas; /app.html for workbench |

### TODOs

- [x] v1.0 Persistence & History — shipped 2026-04-26
- [x] v1.1 Canvas Intelligence & Rich Input — shipped 2026-04-26
- [x] v1.2 Interactive Canvas & Deep Analysis — shipped 2026-04-27
- [x] v1.3 Material Library — shipped 2026-05-01
- [x] v2.0 Multi-Card Canvas Interaction — shipped 2026-05-02
- [x] v3.0 Infrastructure & Experience Upgrade — shipped 2026-05-03
- [ ] v3.1 Multi-Scenario Intelligence — roadmap ready, phase 19 next

### Blockers

| # | Blocker | Impact | Resolution |
|---|---------|--------|----------|
| 1 | PostgreSQL not running locally | Migration cannot be applied; `scripts/test-db.js` fails | User must start PostgreSQL, update `.env` DATABASE_URL, then run `npx prisma migrate deploy` |

---

## Session Continuity

**Current session started:** 2026-05-03
**Last session resumed:** 2026-05-03
**Stopped at:** v3.0 shipped, v3.1 roadmap ready
**Next expected action:** `/gsd-plan-phase 19` to decompose Phase 19 into executable plans
