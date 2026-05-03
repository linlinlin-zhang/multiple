# ORYZAE Image Board — Roadmap

**Current Milestone:** v2.1 Multi-Scenario Intelligence
**Granularity:** Standard

---

## Milestones

- ✅ **v1.0 Persistence & History** — Phases 1-4 (shipped 2026-04-26) · [Details](./milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Canvas Intelligence & Rich Input** — Phases 5-8 (shipped 2026-04-26) · [Details](./milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Interactive Canvas & Deep Analysis** — Phases 9-12 (shipped 2026-04-27) · [Details](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Material Library** — Phases 13-15 (shipped 2026-05-01) · [Details](./milestones/v1.3-ROADMAP.md)
- ✅ **v2.0 Multi-Card Canvas Interaction** — Phases 16-18 (shipped 2026-05-02) · [Details](./milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Infrastructure & Experience Upgrade** — Shipped 2026-05-03
- 🔄 **v3.1 Multi-Scenario Intelligence** — Phases 19-24 (planning)

---

## Phases

<details>
<summary>✅ v1.0 Persistence & History (Phases 1-4) — SHIPPED 2026-04-26</summary>

- [x] Phase 1: Database Schema & Migration (2/2 plans)
- [x] Phase 2: Session Persistence & Auto-Save (2/2 plans)
- [x] Phase 3: History Browser UI (2/2 plans)
- [x] Phase 4: Share & Export (2/2 plans)

</details>

<details>
<summary>✅ v1.1 Canvas Intelligence & Rich Input (Phases 5-8) — SHIPPED 2026-04-26</summary>

- [x] Phase 5: Canvas Polish (2/2 plans)
- [x] Phase 6: Rich Input — Text Files (2/2 plans)
- [x] Phase 7: Rich Input — Web Links (2/2 plans)
- [x] Phase 8: Settings Panel (2/2 plans)

</details>

<details>
<summary>✅ v1.2 Interactive Canvas & Deep Analysis (Phases 9-12) — SHIPPED 2026-04-27</summary>

- [x] Phase 9: Card Selection & Context Binding (2/2 plans)
- [x] Phase 10: Directed Generation (2/2 plans)
- [x] Phase 11: Research Mode (3/3 plans)
- [x] Phase 12: Single-Image Share (2/2 plans)

</details>

<details>
<summary>✅ v1.3 Material Library (Phases 13-15) — SHIPPED 2026-05-01</summary>

- [x] Phase 13: Material API & Data Model (2/2 plans)
- [x] Phase 14: Material Library UI (2/2 plans)
- [x] Phase 15: Material Sync & Upload (2/2 plans)

</details>

<details>
<summary>✅ v2.0 Multi-Card Canvas Interaction (Phases 16-18) — SHIPPED 2026-05-02</summary>

- [x] Phase 16: Menu Cleanup & New Card (2/2 plans)
- [x] Phase 17: Connection Lines & Junction Nodes (3/3 plans)
- [x] Phase 18: Blueprint Modal (3/3 plans)

</details>

---

## v3.0 Infrastructure & Experience Upgrade — Shipped

<details>
<summary>✅ v3.0 Infrastructure & Experience Upgrade — SHIPPED 2026-05-03</summary>

**What was shipped outside the original v2.1 roadmap:**

- Default AI model stack fully migrated from Kimi to Qwen/DashScope
- Immersive Three.js animated homepage with showcase gallery
- Workbench entry point separated to `/app.html` (home now at `/`)
- Material library preview modal (images, PDF, text, fallback download)
- Expanded i18n coverage for modals, share pages, and loading states
- Canvas chat action tooltip positioning polish

**Requirements:**

| Requirement | Description | Status |
|-------------|-------------|--------|
| V3-MODEL | 默认模型全面切换至 Qwen/DashScope | ✓ Shipped |
| V3-HOME | Three.js 沉浸式首页 | ✓ Shipped |
| V3-ENTRY | 工作台与主页入口分离 | ✓ Shipped |
| V3-PREVIEW | 素材库完整预览弹窗 | ✓ Shipped |
| V3-I18N | 国际化键大幅扩充 | ✓ Shipped |

</details>

---

## v3.1 Multi-Scenario Intelligence — Active Phases

- [ ] **Phase 21: Chat-to-Canvas Reliability & Conversational UX** — Fix chat→canvas action whitelist, switch to OpenAI tool calling, default streaming, markdown rendering
- [ ] **Phase 22: Dynamic Directions** — Variable 5-8 direction count driven by content complexity score
- [ ] **Phase 23: File Rendering** — PDF preview with pdf.js, PPTX preview, large file streaming
- [ ] **Phase 24: Context Management** — Shared context pool organized by topic/card, injected into LLM prompts
- [ ] **Phase 25: Parallel Generation** — Concurrent direction generation with Promise.allSettled, retry on failure

---

## Phase Details

### Phase 21: Chat-to-Canvas Reliability & Conversational UX
**Goal**: Users can issue natural-language commands in the chat sidebar that reliably trigger any canvas action (including 7 rich node types and zoom), and chat replies feel comparable to mainstream AI workbenches (streaming, markdown-rendered, length-adaptive)
**Depends on**: Phase 19 (prompts), Phase 20 (task routing)
**Requirements**: CC-01..CC-09
**Success Criteria** (what must be TRUE):
  1. Typing "做个去日本 7 天计划" in chat creates a `plan` card on the canvas (and similarly for note/todo/weather/map/link/code)
  2. Typing "放大画布" / "重置视图" triggers the corresponding canvas action
  3. `server.js CANVAS_TOOL_TYPES` is removed and replaced with import from `src/prompts/shared.js CANVAS_ACTION_TYPES` (single source of truth)
  4. Chat endpoint uses OpenAI tool calling: `reply` is free-form markdown, canvas actions arrive as `tool_calls`
  5. Default chat mode (no-thinking) streams via SSE; characters appear progressively
  6. Assistant messages render as sanitized HTML (micromark + DOMPurify) — markdown headings, lists, code blocks, links, tables all visible
  7. Reply length adapts to context — casual chat short, task-oriented chat long; no hard "1-3 sentences" cap
  8. When LLM output is malformed, fallback action inference covers plan/todo/note/weather/map/link/code keywords
  9. End-to-end verification covers ≥ 12 chat→canvas scenarios
**Plans**: 6 (01: Whitelist Reconciliation, 02: Tool Calling Refactor, 03: Streaming Default, 04: Markdown Rendering, 05: Fallback & Action Feedback, 06: E2E Verification)

### Phase 22: Dynamic Directions
**Goal**: Direction count adapts to content complexity -- simple images get 5 directions, complex documents get up to 8
**Depends on**: Phase 19
**Requirements**: DY-01, DY-02, DY-03
**Success Criteria** (what must be TRUE):
  1. Analysis prompt instructs the LLM to generate 5-8 directions based on content complexity, not a fixed count
  2. LLM response includes a `complexityScore` field reflecting how complex the uploaded content is
  3. Frontend canvas layout correctly arranges 5, 6, 7, or 8 direction cards without overlap or clipping
**Plans**: TBD

### Phase 23: File Rendering
**Goal**: PDF and PPTX files preview correctly in the upload dialog, and large files do not crash the browser
**Depends on**: Nothing (independent)
**Requirements**: FR-01, FR-02, FR-03
**Success Criteria** (what must be TRUE):
  1. PDF files display a paginated preview in the upload/preview dialog using pdf.js or react-pdf
  2. Files larger than 20MB are processed server-side with streaming, and the browser does not run out of memory
  3. PPTX files show a meaningful preview (converted to PDF server-side, or structured text+slide layout as fallback)
**Plans**: TBD
**UI hint**: yes

### Phase 24: Context Management
**Goal**: The system maintains a persistent shared context pool that accumulates key information across a session, improving generation quality over time
**Depends on**: Phase 19
**Requirements**: CT-01, CT-02, CT-03
**Success Criteria** (what must be TRUE):
  1. A shared context pool persists key session information (analysis results, user preferences, generated content summaries) across interactions
  2. Context pool contents are injected into LLM prompts so the model has full session background when generating directions
  3. Context is organized by topic/card, supporting cross-card information relationships (blueprint relations, junction node members)
  4. Context pool survives page refresh (persisted to database)
**Plans**: TBD

### Phase 25: Parallel Generation
**Goal**: Multiple direction images generate concurrently with graceful failure handling, dramatically reducing wait time for 5-8 directions
**Depends on**: Nothing (benefits most from Phase 22)
**Requirements**: PG-01, PG-02, PG-03
**Success Criteria** (what must be TRUE):
  1. Multiple directions generate in parallel via `Promise.allSettled` instead of sequential await loops
  2. Concurrency is capped at a configurable limit (default 3); excess requests queue with exponential backoff retry
  3. When some directions fail, successfully generated images display normally and failed directions show a retry button
**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Schema & Migration | v1.0 | 2/2 | Done | 2026-04-26 |
| 2. Session Persistence & Auto-Save | v1.0 | 2/2 | Done | 2026-04-26 |
| 3. History Browser UI | v1.0 | 2/2 | Done | 2026-04-26 |
| 4. Share & Export | v1.0 | 2/2 | Done | 2026-04-26 |
| 5. Canvas Polish | v1.1 | 2/2 | Done | 2026-04-26 |
| 6. Rich Input — Text Files | v1.1 | 2/2 | Done | 2026-04-26 |
| 7. Rich Input — Web Links | v1.1 | 2/2 | Done | 2026-04-26 |
| 8. Settings Panel | v1.1 | 2/2 | Done | 2026-04-26 |
| 9. Card Selection & Context | v1.2 | 2/2 | Done | 2026-04-27 |
| 10. Directed Generation | v1.2 | 2/2 | Done | 2026-04-27 |
| 11. Research Mode | v1.2 | 3/3 | Done | 2026-04-27 |
| 12. Single-Image Share | v1.2 | 2/2 | Done | 2026-04-27 |
| 13. Material API & Data Model | v1.3 | 2/2 | Done | 2026-05-01 |
| 14. Material Library UI | v1.3 | 2/2 | Done | 2026-05-01 |
| 15. Material Sync & Upload | v1.3 | 2/2 | Done | 2026-05-01 |
| 16. Menu Cleanup & New Card | v2.0 | 2/2 | Done | 2026-05-02 |
| 17. Connection Lines & Junction Nodes | v2.0 | 3/3 | Done | 2026-05-02 |
| 18. Blueprint Modal | v2.0 | 3/3 | Done | 2026-05-02 |
| 19. Prompt Extraction | v3.1 | 2/2 | Done | 2026-05-02 |
| 20. Task Routing | v3.1 | 2/2 | Done | 2026-05-03 |
| 21. Chat-to-Canvas Reliability & UX | v3.1 | 5/6 | In Progress|  |
| 22. Dynamic Directions | v3.1 | 0/? | Not started | - |
| 23. File Rendering | v3.1 | 0/? | Not started | - |
| 24. Context Management | v3.1 | 0/? | Not started | - |
| 25. Parallel Generation | v3.1 | 0/? | Not started | - |

### Phase 26: 21-chat-to-canvas

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 25
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 26 to break down)

---

*Created: 2026-04-25*
*Last updated: 2026-05-03 — v3.0 shipped, Phase 21 (Chat-to-Canvas Reliability) inserted into v3.1, originals renumbered to 22-25*
