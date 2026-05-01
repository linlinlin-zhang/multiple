# ORYZAE Image Board — Roadmap

**Current Milestone:** v1.3 Material Library
**Granularity:** Standard
**Defined:** 2026-04-26

---

## Milestones

- ✅ **v1.0 Persistence & History** — Phases 1-4 (shipped 2026-04-26) · [Details](./milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Canvas Intelligence & Rich Input** — Phases 5-8 (shipped 2026-04-26) · [Details](./milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Interactive Canvas & Deep Analysis** — Phases 9-12 (shipped 2026-04-27) · [Details](./milestones/v1.2-ROADMAP.md)
- 🔄 **v1.3 Material Library** — Phases 13-15 (in progress) · [Details](./milestones/v1.3-ROADMAP.md)

---

## Phases

- [x] **Phase 13: Data Model & API** — Prisma model and REST endpoints for material library CRUD, search, sort, and file count enforcement (completed 2026-05-01)
- [ ] **Phase 14: Material Library Page** — Independent React page with masonry layout, navigation entry, search UI, sort controls, non-image thumbnails
- [ ] **Phase 15: Workbench Sync & File Management** — Auto-sync uploaded files from workbench to material library, delete functionality

---

## Phase Details

### Phase 13: Data Model & API
**Goal**: Material library data is persisted and queryable via REST API
**Depends on**: Nothing
**Requirements**: LIB-03
**Success Criteria** (what must be TRUE):
  1. `MaterialItem` Prisma model exists with fields: id, fileName, mimeType, fileSize, hash, filePath, addedAt, updatedAt
  2. `GET /api/materials` returns all material items
  3. `GET /api/materials?q=keyword` filters results by filename substring (case-insensitive)
  4. `GET /api/materials?sort=date|added|name|size` returns correctly ordered results
  5. `POST /api/materials` creates a new material item; returns 409 when count reaches 100
  6. `DELETE /api/materials/:id` removes the material item and its file from disk
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — MaterialItem Prisma model and migration
- [ ] 13-02-PLAN.md — Materials REST API handler and server.js wiring

### Phase 14: Material Library Page
**Goal**: Users can browse their material library on a dedicated page with search and sort
**Depends on**: Phase 13
**Requirements**: LIB-01, LIB-04, LIB-05, LIB-06, LIB-07
**Success Criteria** (what must be TRUE):
  1. Navigation sidebar contains a "素材库" entry that links to `/history/?view=library`
  2. Material library page renders a masonry grid of material items
  3. Image files display as image thumbnails in the grid
  4. Non-image files (PDF, PPT, TXT, Word) display a type-specific cover icon with filename
  5. Typing in the search box filters the grid by filename in real time
  6. Clicking a sort dropdown changes the display order (modified date, added date, filename A-Z, file size)
**Plans**: TBD
**UI hint**: yes

### Phase 15: Workbench Sync & File Management
**Goal**: Files uploaded on the workbench automatically appear in the material library; users can delete materials
**Depends on**: Phase 13, Phase 14
**Requirements**: LIB-02, LIB-08
**Success Criteria** (what must be TRUE):
  1. Uploading a file on the workbench (image, PDF, PPT, TXT, Word) creates a corresponding entry in the material library
  2. The material library page reflects newly synced files after navigation or refresh
  3. Each material item in the library has a delete button
  4. Clicking delete removes the item from the grid and the database
  5. Deleting a material does not affect the original workbench session or nodes that reference it
**Plans**: TBD

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
| 9. Card Selection & Basic Interaction | v1.2 | 3/3 | Complete | 2026-04-27 |
| 10. Dialog Refactor & Generation Control | v1.2 | 3/3 | Complete | 2026-04-27 |
| 11. Research Mode & Deep Analysis | v1.2 | 3/3 | Complete | 2026-04-27 |
| 12. Image Sharing | v1.2 | 2/2 | Complete | 2026-04-27 |
| 13. Data Model & API | v1.3 | 2/2 | Complete | 2026-05-01 |
| 14. Material Library Page | v1.3 | 0/0 | Not started | - |
| 15. Workbench Sync & File Management | v1.3 | 0/0 | Not started | - |

---

*Last updated: 2026-05-01*
