# ORYZAE Image Board — Roadmap

**Current Milestone:** v3.2 Qwen Web Parity
**Granularity:** Standard

---

## Milestones

- ✅ **v1.0 Persistence & History** — Phases 1-4 (shipped 2026-04-26) · [Details](./milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Canvas Intelligence & Rich Input** — Phases 5-8 (shipped 2026-04-26) · [Details](./milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Interactive Canvas & Deep Analysis** — Phases 9-12 (shipped 2026-04-27) · [Details](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Material Library** — Phases 13-15 (shipped 2026-05-01) · [Details](./milestones/v1.3-ROADMAP.md)
- ✅ **v2.0 Multi-Card Canvas Interaction** — Phases 16-18 (shipped 2026-05-02) · [Details](./milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Infrastructure & Experience Upgrade** — Shipped 2026-05-03
- 🔄 **v3.1 Multi-Scenario Intelligence** — Phases 19-25 (in progress)
- ⏳ **v3.2 Qwen Web Parity** — Phases 26-32 (planning)

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

- [ ] **Phase 21: Chat-to-Canvas Reliability & Conversational UX** — Fix chat→canvas action whitelist, switch to OpenAI tool calling, default streaming, markdown rendering ✅ shipped 2026-05-04 (Plan 06 deferred to Phase 26)
- [ ] **Phase 22: Dynamic Directions** — Variable 5-8 direction count driven by content complexity score
- [ ] **Phase 23: File Rendering** — PDF preview with pdf.js, PPTX preview, large file streaming
- [ ] **Phase 24: Context Management** — Shared context pool organized by topic/card, injected into LLM prompts
- [ ] **Phase 25: Parallel Generation** — Concurrent direction generation with Promise.allSettled, retry on failure

---

## v3.2 Qwen Web Parity — Planning

- [ ] **Phase 26: Responses API Migration** — DashScope Responses API with builtin tools, citations, artifact viewer
- [ ] **Phase 27: Document Chat** — Files API upload, qwen-long 10M context, multi-document reference UI
- [ ] **Phase 28: Image Polish** — Async task polling, qwen-image-max/plus, editing/inpainting
- [ ] **Phase 29: Video Generation** — wan2.x text-to-video, image-to-video, digital human, task polling UI
- [ ] **Phase 30: Voice Interaction** — Real-time voice conversation, ASR, TTS with 9 voices
- [ ] **Phase 31: Deep Research Visualization** — Streaming research phase UI with real-time progress
- [ ] **Phase 32: Embedding Upgrade** — text-embedding-v4 + gte-rerank-v2 for material library RAG

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

### Phase 26: Responses API Migration
**Goal**: Chat system runs on DashScope Responses API with builtin tools (web_search, code_interpreter, web_extractor) coexisting with custom canvas tools, citations render as clickable links, and multi-turn chat uses previous_response_id
**Depends on**: Phase 21 (chat reliability foundation)
**Requirements**: RESP-01, RESP-02, RESP-03, RESP-04, RESP-05, RESP-06, RESP-07
**Success Criteria** (what must be TRUE):
  1. All chat requests hit the DashScope Responses API endpoint instead of Chat Completions; responses parse correctly
  2. A single request can include both builtin `web_search` tool and custom `CANVAS_TOOLS` function calls; both execute and return results
  3. `code_interpreter` runs Python code and returns outputs (charts, tables, generated files) viewable in an Artifact viewer
  4. `web_extractor` extracts web content when referenced in user messages
  5. `[ref_<n>]` citations in assistant replies render as clickable inline links that expand the corresponding web search result
  6. Multi-turn conversations pass `previous_response_id` instead of resending the full `messages[]` array
  7. Artifact viewer supports previewing and downloading code_interpreter outputs (images, CSVs, etc.)
**Plans**: TBD
**UI hint**: yes

### Phase 27: Document Chat
**Goal**: Users upload documents via Files API and chat with qwen-long using 10M token context, with UI support for multi-document references
**Depends on**: Phase 26 (Responses API for chat infrastructure)
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. User can upload a document and receive a `file-id` from the Files API
  2. Referencing `fileid://<id>` in chat sends the document to qwen-long, which answers questions using the full document content (10M context supported)
  3. UI shows uploaded document references inline in the chat input area, with ability to add/remove multiple documents per conversation
  4. Multi-document conversations maintain history and allow follow-up questions across all referenced files
**Plans**: TBD
**UI hint**: yes

### Phase 28: Image Polish
**Goal**: Users generate images with qwen-image-2.0-pro (sync), qwen-image-max (async with polling), and edit/inpaint with qwen-image-plus, with full async task status UI
**Depends on**: Phase 26 (API infrastructure)
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04
**Success Criteria** (what must be TRUE):
  1. qwen-image-2.0-pro generates images synchronously and displays results on the canvas
  2. qwen-image-max submits async tasks and polls by `task_id` until completion, then displays the result
  3. qwen-image-plus accepts an image + mask + prompt and returns edited/inpainted results
  4. Async task UI shows a task list with progress indicators, status badges (pending/running/succeeded/failed), and result preview with download
**Plans**: TBD
**UI hint**: yes

### Phase 29: Video Generation
**Goal**: Users generate videos from text, images, or audio using wan2.2 models, with async task polling and preview/download UI
**Depends on**: Phase 28 (shares async task patterns)
**Requirements**: VID-01, VID-02, VID-03, VID-04
**Success Criteria** (what must be TRUE):
  1. User can submit a text prompt and receive a wan2.2-text-to-video result after async processing
  2. User can submit an image and receive a wan2.2-image-to-video result after async processing
  3. User can submit audio and receive a wan2.2-s2v digital human video after async processing
  4. Video task UI shows submission confirmation, progress polling, and a preview player with download button when complete
**Plans**: TBD
**UI hint**: yes

### Phase 30: Voice Interaction
**Goal**: Users can have real-time voice conversations, transcribe speech with ASR, and synthesize speech with TTS using 9 selectable voices
**Depends on**: Phase 26 (API infrastructure)
**Requirements**: VOI-01, VOI-02, VOI-03
**Success Criteria** (what must be TRUE):
  1. User can start a real-time voice conversation via WebSocket using qwen3.5-omni-plus-realtime; session supports up to 120 minutes with server_vad
  2. ASR (qwen3-asr-flash-realtime) transcribes spoken input in real time with auto language detection
  3. TTS (qwen3-tts-flash or cosyvoice-v3.5-plus) synthesizes speech with at least 9 selectable voices
  4. Voice UI includes microphone toggle, voice selection dropdown, and connection status indicator
**Plans**: TBD
**UI hint**: yes

### Phase 31: Deep Research Visualization
**Goal**: Users can initiate deep research and watch real-time streaming phase UI as the system progresses through search, analysis, and synthesis stages
**Depends on**: Phase 26 (Responses API streaming)
**Requirements**: RES-01
**Success Criteria** (what must be TRUE):
  1. Deep research request triggers a streaming response with phase events (streamingWebResult, WebResultFinished, KeepAlive, finished)
  2. UI displays each phase with a progress indicator and collapsible detail panel showing intermediate results
  3. Research completes with a final synthesized answer; all intermediate web results are accessible via citations
  4. User can cancel an in-progress research session and retain partial results
**Plans**: TBD
**UI hint**: yes

### Phase 32: Embedding Upgrade
**Goal**: Material library uses modern text-embedding-v4 and gte-rerank-v2 for semantic search and RAG retrieval
**Depends on**: Phase 27 (Files API for document content) and Phase 26 (API infrastructure)
**Requirements**: RES-02, RES-03, RES-04
**Success Criteria** (what must be TRUE):
  1. Uploaded files are automatically embedded using text-embedding-v4 (configurable 64-2048 dimensions, instruct parameter supported)
  2. Semantic search in the material library returns relevant results ranked by gte-rerank-v2
  3. RAG retrieval integrates material library content into chat context when users ask questions related to uploaded files
  4. Embedding and reranking operations are async and do not block file upload or chat responses
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
| 21. Chat-to-Canvas Reliability & UX | v3.1 | 5/6 | Done (Plan 06 deferred to Phase 26) | 2026-05-04 |
| 22. Dynamic Directions | v3.1 | 0/? | Not started | - |
| 23. File Rendering | v3.1 | 0/? | Not started | - |
| 24. Context Management | v3.1 | 0/? | Not started | - |
| 25. Parallel Generation | v3.1 | 0/? | Not started | - |
| 26. Responses API Migration | v3.2 | 0/? | Not started | - |
| 27. Document Chat | v3.2 | 0/? | Not started | - |
| 28. Image Polish | v3.2 | 0/? | Not started | - |
| 29. Video Generation | v3.2 | 0/? | Not started | - |
| 30. Voice Interaction | v3.2 | 0/? | Not started | - |
| 31. Deep Research Visualization | v3.2 | 0/? | Not started | - |
| 32. Embedding Upgrade | v3.2 | 0/? | Not started | - |

---

*Created: 2026-04-25*
*Last updated: 2026-05-04 — Phase 21 shipped, Plan 06 deferred to Phase 26 (Responses API rewrite)*
