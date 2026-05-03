# Requirements: ORYZAE Image Board

**Current Milestone:** v3.2 Qwen Web Parity
**Date:** 2026-05-04

---

## v3.2 Requirements

### Responses API & Tool Integration (RESP)

- [ ] **RESP-01**: System uses DashScope Responses API endpoint (`/api/v2/apps/protocols/compatible-mode/v1/responses`) instead of Chat Completions for chat
- [ ] **RESP-02**: builtin `web_search` tool coexists with custom `CANVAS_TOOLS` function calls in the same request
- [ ] **RESP-03**: builtin `code_interpreter` tool supports code execution and returns outputs (charts, tables, generated files)
- [ ] **RESP-04**: builtin `web_extractor` tool supports web content extraction
- [ ] **RESP-05**: `[ref_<n>]` citations in replies render as clickable inline links that expand corresponding web search results
- [ ] **RESP-06**: code_interpreter generated charts, tables, and files previewable and downloadable in an Artifact viewer
- [ ] **RESP-07**: Multi-turn chat uses `previous_response_id` instead of full `messages[]` array for context passing

### Document & Long Text (DOC)

- [ ] **DOC-01**: Users can upload documents via Files API (`/v1/files`) and receive a `file-id`
- [ ] **DOC-02**: Uploaded documents can be referenced via `fileid://<id>` and processed by qwen-long model (10M context supported)
- [ ] **DOC-03**: Document chat UI supports multi-document references and conversation history

### Image Enhancement (IMG)

- [ ] **IMG-01**: Support qwen-image-2.0-pro synchronous image generation
- [ ] **IMG-02**: Support qwen-image-max asynchronous image generation with `task_id` polling until completion
- [ ] **IMG-03**: Support qwen-image-plus image editing/inpainting
- [ ] **IMG-04**: Async task status UI: task list, progress indicator, result preview and download

### Video Generation (VID)

- [ ] **VID-01**: Support wan2.2-text-to-video (async, 1-5 minutes)
- [ ] **VID-02**: Support wan2.2-image-to-video (async, 1-5 minutes)
- [ ] **VID-03**: Support wan2.2-s2v digital human / audio-driven video (async, 1-5 minutes)
- [ ] **VID-04**: Video task polling UI: submit task, track progress, preview and download when complete

### Voice Interaction (VOI)

- [ ] **VOI-01**: Support qwen3.5-omni-plus-realtime voice conversation (WebSocket, 120-min session, server_vad)
- [ ] **VOI-02**: Support qwen3-asr-flash-realtime real-time speech recognition (auto language detection)
- [ ] **VOI-03**: Support qwen3-tts-flash / cosyvoice-v3.5-plus speech synthesis (at least 9 voices selectable)

### Deep Research & Embedding (RES)

- [ ] **RES-01**: Deep research streaming phase UI: real-time display of streamingWebResult / WebResultFinished / KeepAlive / finished phases
- [ ] **RES-02**: Support text-embedding-v4 text embeddings (configurable 64-2048 dimensions, instruct parameter supported)
- [ ] **RES-03**: Support gte-rerank-v2 result reranking
- [ ] **RES-04**: Material library integrated RAG retrieval: uploaded files auto-embedded, semantic search supported

---

## Historical Requirements

<details>
<summary>v2.1 / v3.1 Multi-Scenario Intelligence (2026-05-02)</summary>

### Prompt Management (PM)
- [x] **PM-01**: Extract hardcoded prompts from server.js to `src/prompts/` module template functions
- [x] **PM-02**: Prompt templates support `{{var}}` variable substitution with unified safety and format directives
- [x] **PM-03**: All existing handlers refactored to call `getPrompt()` for prompts

### Task Routing (RT)
- [x] **RT-01**: New `POST /api/route-task` endpoint using LLM to analyze uploads and return `taskType`
- [x] **RT-02**: Support at least 3 task types: `image_generation`, `research`, `planning`
- [x] **RT-03**: Classification includes confidence score with fallback to format-based default routing
- [x] **RT-04**: Frontend direction cards show task type badge

### Chat-Canvas Reliability (CC)
- [x] **CC-01**: Unified canvas action whitelist from shared.js covering all 7 rich node types + zoom actions
- [x] **CC-02**: Natural language commands reliably trigger canvas actions
- [x] **CC-03**: Chat endpoint uses OpenAI tool calling: reply as free markdown, actions via tool_calls
- [x] **CC-04**: Removed hard length constraints, adaptive by user intent; max_tokens default >= 4096
- [x] **CC-05**: Default no-thinking mode uses SSE streaming with progressive rendering
- [x] **CC-06**: Assistant messages render as sanitized HTML (micromark + DOMPurify) with copy buttons
- [x] **CC-07**: Fallback action inference covers plan/todo/note/weather/map/link/code keywords
- [x] **CC-08**: Inline action feedback cards shown after execution
- [ ] **CC-09**: E2E verification script covers >= 12 chat->canvas scenarios

### Dynamic Directions (DY)
- [ ] **DY-01**: Analysis prompt generates 5-8 directions based on complexity
- [ ] **DY-02**: LLM response includes `complexityScore` field
- [ ] **DY-03**: Frontend canvas adapts layout for 5-8 direction cards

### File Rendering (FR)
- [ ] **FR-01**: PDF files render preview in dialog (pdf.js / react-pdf)
- [ ] **FR-02**: Large files (>20MB) use server-side streaming
- [ ] **FR-03**: PPTX files support preview (server-side conversion or structured fallback)

### Context Management (CT)
- [ ] **CT-01**: Shared context pool persists key session information
- [ ] **CT-02**: Context pool contents injected into LLM prompts
- [ ] **CT-03**: Context organized by topic/card with cross-card relationships

### Parallel Generation (PG)
- [ ] **PG-01**: Parallel direction generation via `Promise.allSettled`
- [ ] **PG-02**: Concurrency limit (default 3) with exponential backoff retry
- [ ] **PG-03**: Partial failure handling: successful directions display normally, failed show retry button

</details>

---

## Future Requirements

- **TRAN-01**: Machine translation — qwen-mt-turbo / qwen-mt-plus with terminology, domain, translation memory
- **MULT-01**: Unified multimodal input — single interface supporting text/image/audio/video mixed input
- **SRCH-01**: Search session history by keyword
- **SRCH-02**: Filter sessions by date range
- **SRCH-03**: Session folder/tag classification
- **SHAR-04**: Share link expiration settings
- **SHAR-05**: Batch export multiple sessions as zip archive

---

## Out of Scope

| Requirement | Reason |
|-------------|--------|
| User authentication & multi-account system | Single-user local/self-hosted scenario; auth adds unnecessary complexity |
| Real-time collaborative canvas editing | Requires WebSocket + conflict resolution; out of current milestone scope |
| Third-party OAuth login | No email/password auth yet; OAuth not needed |
| S3/object storage | Local file storage sufficient; S3 as future configuration option |
| Vector database (Pinecone/Milvus) | PostgreSQL + text-embedding-v4 sufficient for current scale |
| LangChain / LangGraph | Existing chatCompletions pattern is simpler and sufficient |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RESP-01 | Phase 26 | Pending |
| RESP-02 | Phase 26 | Pending |
| RESP-03 | Phase 26 | Pending |
| RESP-04 | Phase 26 | Pending |
| RESP-05 | Phase 26 | Pending |
| RESP-06 | Phase 26 | Pending |
| RESP-07 | Phase 26 | Pending |
| DOC-01 | Phase 27 | Pending |
| DOC-02 | Phase 27 | Pending |
| DOC-03 | Phase 27 | Pending |
| IMG-01 | Phase 28 | Pending |
| IMG-02 | Phase 28 | Pending |
| IMG-03 | Phase 28 | Pending |
| IMG-04 | Phase 28 | Pending |
| VID-01 | Phase 29 | Pending |
| VID-02 | Phase 29 | Pending |
| VID-03 | Phase 29 | Pending |
| VID-04 | Phase 29 | Pending |
| VOI-01 | Phase 30 | Pending |
| VOI-02 | Phase 30 | Pending |
| VOI-03 | Phase 30 | Pending |
| RES-01 | Phase 31 | Pending |
| RES-02 | Phase 32 | Pending |
| RES-03 | Phase 32 | Pending |
| RES-04 | Phase 32 | Pending |

---

*Created: 2026-05-02 | Updated: 2026-05-04 for v3.2*
