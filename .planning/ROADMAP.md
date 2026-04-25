# ORYZAE Image Board — Roadmap

**Milestone:** Persistence & History v1  
**Granularity:** Standard  
**Defined:** 2026-04-25  

---

## Phases

- [x] **Phase 1: Database & File Storage Foundation** — PostgreSQL + Prisma schema, file storage, auto-save, session restore
- [x] **Phase 2: History Browser UI & Navigation** — File-cabinet React UI, session/asset browsing, canvas integration
- [x] **Phase 3: Sharing & Snapshots** — Read-only share links, immutable snapshots, JSON export/import
- [x] **Phase 4: AI Titles & Explanations** — AI-generated session titles, per-image content explanations

---

## Phase Details

### Phase 1: Database & File Storage Foundation
**Goal:** Users can refresh the page without losing current canvas work; sessions are automatically saved and can be restored.
**Depends on:** Nothing (first phase)
**Requirements:** PERS-01, PERS-02, PERS-04, PERS-05, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. User can upload an image and generate nodes; after refreshing the browser, the same canvas state (nodes, positions, chat history) is restored
  2. User can see a list of past sessions ordered by time, with timestamps
  3. Uploaded originals and generated images are stored as files on disk, not as base64 in memory or database
  4. Canvas state changes trigger an auto-save after a 2-second delay, persisting to the database without manual action
  5. Demo mode data is visually or structurally separated from real sessions so users can distinguish them
**Estimated Complexity:** High
**Plans:** 4 plans

**Plan List:**
- [x] 01-01-PLAN.md — Prisma schema + database setup + migrations + file storage layer
- [x] 01-02-PLAN.md — API endpoints for session CRUD, history list, and asset storage/retrieval
- [x] 01-03-PLAN.md — Frontend integration: save/load canvas state, auto-save debounce, session list UI

- [x] 01-04-PLAN.md — Integration testing, edge case fixes, and human verification
### Phase 2: History Browser UI & Navigation
**Goal:** Users can browse all past sessions in a file-cabinet interface and jump between history and canvas views.
**Depends on:** Phase 1
**Requirements:** HIST-01, HIST-02, HIST-04, HIST-05
**Success Criteria** (what must be TRUE):
  1. User sees a file-cabinet UI with top tabs for sessions, a sidebar listing session assets, and a right-hand detail pane
  2. Sidebar shows multiple asset types: generated images, web links, uploaded files, and chat message snippets
  3. User can click a button in the canvas view to open the history browser, and from the browser open any session back into the canvas
  4. History browser renders a lightweight read-only thumbnail overview of a session’s node graph (not the full interactive canvas)
**Estimated Complexity:** High
**Plans:** TBD
**UI hint:** yes

### Phase 3: Sharing & Snapshots
**Goal:** Users can share read-only views of sessions and back them up as portable JSON files.
**Depends on:** Phase 1, Phase 2
**Requirements:** SHAR-01, SHAR-02, SHAR-03
**Success Criteria** (what must be TRUE):
  1. User can generate a shareable URL that lets anyone view the full session node graph in read-only mode
  2. Shared snapshots remain unchanged even if the owner continues editing the original session afterward
  3. User can export a session to a JSON file and later import it to restore the exact same session on the same or another instance
**Estimated Complexity:** Medium
**Plans:** 3 plans

**Plan List:**
- [x] 03-01-PLAN.md — Share Token API & Immutable Snapshots
- [x] 03-02-PLAN.md — Read-Only Share Viewer Page
- [x] 03-03-PLAN.md — JSON Export/Import

### Phase 4: AI Titles & Explanations
**Goal:** Sessions and individual images are automatically annotated with AI-generated human-readable descriptions.
**Depends on:** Phase 1, Phase 2
**Requirements:** PERS-03, HIST-03
**Success Criteria** (what must be TRUE):
  1. Each saved session displays an AI-generated short title derived from its analysis summary
  2. In the history browser detail pane, every generated image shows an AI-generated content explanation
**Estimated Complexity:** Medium
**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database & File Storage Foundation | 4/4 | Completed | 2026-04-25 |
| 2. History Browser UI & Navigation | 4/4 | Completed | 2026-04-25 |
| 3. Sharing & Snapshots | 3/3 | Completed | 2026-04-25 |
| 4. AI Titles & Explanations | 3/3 | Completed | 2026-04-26 |
