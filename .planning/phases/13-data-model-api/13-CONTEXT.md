# Phase 13: Data Model & API - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Material library data model and REST API. This phase delivers:
- `MaterialItem` Prisma model for persisting material metadata
- REST endpoints for CRUD, search, sort, and file count enforcement
- No UI work — pure backend infrastructure

</domain>

<decisions>
## Implementation Decisions

### Data Model
- **D-01:** MaterialItem is an independent model (not extending Asset) — material library is a separate concern from session assets
- **D-02:** Use SHA-256 hash for content-addressable storage, same pattern as existing Asset model
- **D-03:** MaterialItem fields: id, fileName, mimeType, fileSize, hash, filePath, addedAt, updatedAt

### API Design
- **D-04:** Follow existing API pattern: handler functions in `src/api/materials.js`, imported by `server.js`
- **D-05:** Endpoints: GET (list+search+sort), POST (create with 100 limit), DELETE (remove item + file)
- **D-06:** Search is case-insensitive filename substring match via query param `?q=keyword`
- **D-07:** Sort via query param `?sort=date|added|name|size`

### File Management
- **D-08:** Deleting a material removes both DB record and file from disk
- **D-09:** File count hard limit at 100 — POST returns 409 when limit reached

### Claude's Discretion
- Whether to deduplicate files by hash (reuse disk file if same hash exists) — Claude decides based on existing Asset pattern
- Exact error response format — follow existing error handling in server.js

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing API Patterns
- `src/api/settings.js` — Handler function pattern, PrismaClient usage, request/response format
- `src/api/sessions.js` — CRUD handler pattern with Prisma
- `server.js` — Route registration pattern, URL parsing, JSON body reading

### Data Model
- `prisma/schema.prisma` — Existing models (Asset, Session, Settings), field conventions, index patterns

### Requirements
- `.planning/REQUIREMENTS.md` — LIB-03 (file count limit 100)
- `.planning/ROADMAP.md` — Phase 13 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PrismaClient` — already initialized in `src/api/settings.js`, same pattern to follow
- `readJson()` in server.js — JSON body parser with 22MB guard
- `sendJson()` in server.js — JSON response helper
- Asset model pattern — hash, mimeType, fileSize, fileName fields already established

### Established Patterns
- Handler functions exported from `src/api/*.js`, imported in server.js
- Route matching via `url.pathname` string comparison in server.js
- Prisma upsert/findMany/delete patterns in settings.js

### Integration Points
- `server.js` lines ~80-190 — where new `/api/materials` routes will be registered
- `prisma/schema.prisma` — where MaterialItem model will be added

</code_context>

<specifics>
## Specific Ideas

No specific requirements — follow existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-data-model-api*
*Context gathered: 2026-05-01*
