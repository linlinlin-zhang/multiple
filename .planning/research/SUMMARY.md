# Research Summary: ORYZAE Persistence Milestone

**Date:** 2026-04-25

## Key Findings

### Stack
- **PostgreSQL 16+ + Prisma 6.x** for relational persistence
- **Local filesystem + SHA-256 addressing** for image storage
- **React 19 + Vite 6** history browser (reuse existing `app/` prototype)
- **Keep `node:http`** — extract handlers to `src/api/*.js`, no framework migration yet

### Table Stakes
- Auto-save on canvas state change
- Session list with timestamps
- Restore session on return
- Image file storage (not base64 in DB)
- Share links (read-only snapshots)
- JSON export/import

### Differentiators
- File-cabinet metaphor UI (tabs = sessions, sidebar = assets, detail = explanations)
- AI-generated session titles
- AI-generated per-image explanations

### Architecture
- Dual frontend: existing canvas (`public/app.js`) + React history (`public/history/`)
- Prisma schema: `Session`, `Node`, `Link`, `Asset`, `ShareToken`
- Share links are immutable snapshots, not live views
- Content-addressable file storage for deduplication

### Critical Pitfalls
1. **Schema design** — don't persist base64/json blobs verbatim; normalize graph into tables
2. **Transaction boundaries** — use Prisma `$transaction` for multi-table writes
3. **Demo mode** — flag fake data in schema so it doesn't mix with real sessions
4. **React UI vs canvas logic** — don't duplicate coordinate math; share state via API only
5. **Share immutability** — snapshots must be frozen at share-time

## Roadmap Implications
- Phase 1: Database + file storage + auto-save (unblocks everything)
- Phase 2: History browser UI + navigation
- Phase 3: Share links + export/import
- Phase 4: AI titles + explanations (polish)

---
*Synthesized: 2026-04-25*
