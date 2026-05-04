---
gsd_state_version: 1.0
milestone: v3.2
milestone_name: Qwen Web Parity
status: planning
stopped_at: null
last_updated: "2026-05-04T00:00:00.000Z"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# ORYZAE Image Board — Project State

**Milestone:** Qwen Web Parity v3.2
**Core Value:** 让应用体验对标官方 Qwen Web 应用 —— 内置搜索、代码解释器与自定义画布工具并存，支持文档长文本聊天、图像/视频/语音生成、深度研究可视化、现代嵌入检索。
**Project Reference:** [PROJECT.md](./PROJECT.md)
**Last Updated:** 2026-05-04 (Phase 21 shipped; v3.2 Phase 26 ready to plan)

---

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v3.2 — Qwen Web Parity |
| Phase | Pre-26 (v3.2 not yet started; Phase 26 ready to plan) |
| Plans | — |
| Status | v3.1 Phase 21 shipped 2026-05-04; v3.2 milestone ready to launch |
| Progress | 0% (v3.2 milestone) |

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
| v3.2 requirements mapped | 25/25 |
| Phases complete (v3.2) | 0/7 |
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
| 33 | Path-B fix: search_strategy agent_max → max for Phase 21 chat 400 | 2026-05-04 | DashScope agent_max triggers Agent mode mutually exclusive with custom `tools`; max keeps multi-round search without agent orchestration |
| 34 | Defer Plan 06 E2E harness to v3.2 Phase 26 | 2026-05-04 | Phase 26 replaces the chat backend (Chat Completions → Responses API); writing the harness now is single-use throwaway work |
| 35 | v3.1 Phases 22-25 superseded by v3.2 milestone | 2026-05-04 | User pivot to Qwen Web Parity; remaining v3.1 phases may be revisited or absorbed into v3.2 phases as work unfolds |

### TODOs

- [x] v1.0 Persistence & History — shipped 2026-04-26
- [x] v1.1 Canvas Intelligence & Rich Input — shipped 2026-04-26
- [x] v1.2 Interactive Canvas & Deep Analysis — shipped 2026-04-27
- [x] v1.3 Material Library — shipped 2026-05-01
- [x] v2.0 Multi-Card Canvas Interaction — shipped 2026-05-02
- [x] v3.0 Infrastructure & Experience Upgrade — shipped 2026-05-03
- [x] v3.1 Phase 21 Chat-to-Canvas Reliability — shipped 2026-05-04 (Plan 06 deferred to Phase 26)
- [ ] v3.1 Phases 22-25 — superseded by v3.2 milestone (may be revisited or absorbed)
- [ ] v3.2 Qwen Web Parity — roadmap defined, Phase 26 ready to plan

### Blockers

| # | Blocker | Impact | Resolution |
|---|---------|--------|------------|
| 1 | PostgreSQL not running locally | Migration cannot be applied; `scripts/test-db.js` fails | User must start PostgreSQL, update `.env` DATABASE_URL, then run `npx prisma migrate deploy` |

---

## Session Continuity

**Current session started:** 2026-05-04
**Last session resumed:** 2026-05-04
**Stopped at:** Phase 21 shipped + v3.2 milestone setup confirmed (PROJECT/REQUIREMENTS/research/ROADMAP all pre-existing from prior session); /gsd-new-milestone v3.2 re-invocation skipped to avoid overwriting existing artifacts
**Next expected action:** `/clear` then `/gsd-plan-phase 26` (or `/gsd-discuss-phase 26` for keystone-quality clarification)
**Resume notes for next session:** Phase 26 directory already pre-created at `.planning/phases/26-responses-api-migration/` (empty). v3.2 has 25 requirements across 6 categories (RESP/DOC/IMG/VID/VOI/RES); Phase 26 maps to RESP-01..07.
