# Pitfalls Research

**Domain:** Creative canvas applications with AI-generated content, session persistence, history browsing, and shareable links
**Researched:** 2026-04-25
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Storing Base64 Images in the Database

**What goes wrong:**
Session rows bloat to 5-50 MB each. Querying a history list of 20 sessions pulls hundreds of megabytes into memory. Database backups become unwieldy. Connection pool exhaustion under concurrent loads. Prisma queries timeout.

**Why it happens:**
Developers treat the database as the single source of truth and store image data URLs directly in `Session` or `Node` tables because it is the simplest path to "persistence." The existing codebase already passes images around as base64 strings, so the temptation is to persist those strings verbatim.

**How to avoid:**
- Store images on disk (or S3-compatible object storage) and persist only the file path / URL in PostgreSQL.
- Use a content-addressable storage scheme (hash the file contents for the filename) to deduplicate identical images automatically.
- Keep a `fileSize` column in the metadata table so the history UI can show size warnings before download.

**Warning signs:**
- `prisma.session.findMany()` queries take >500 ms for a small dataset.
- `pg_dump` output grows by gigabytes per week.
- Node.js heap usage spikes during history list loading.

**Phase to address:**
Phase 1 (Persistence Foundation) — schema design must separate blobs from metadata before any data is written.

---

### Pitfall 2: Treating the Canvas Graph as a Single JSON Blob

**What goes wrong:**
The entire node graph (positions, edges, options, chat history) is serialized into one `jsonb` column. Over time the blob grows to multiple megabytes. Partial updates require reading, parsing, mutating, and rewriting the entire blob. Concurrent edits from two tabs overwrite each other silently. Querying "find all sessions that contain image X" requires full-table scans and JSON parsing in JavaScript.

**Why it happens:**
The existing `state` object in `app.js` is already a single nested structure. Developers naturally map this 1:1 to a `jsonb` column. It feels fast because there is no schema migration friction.

**How to avoid:**
- Normalize the graph into relational tables: `Session`, `Node`, `Edge`, `Asset`, `Message`.
- Store node coordinates, types, and parent references as first-class columns.
- Use `jsonb` only for truly schemaless metadata (e.g., model-specific generation parameters), not for the core graph structure.

**Warning signs:**
- Prisma migration files contain `jsonb` for data that is queried or filtered.
- You find yourself writing `JSON.parse(session.graph)` in multiple places.
- Race-condition bug reports where "my last node disappeared after I opened another tab."

**Phase to address:**
Phase 1 (Persistence Foundation) — schema design review must flag any `jsonb` usage for graph structure.

---

### Pitfall 3: Share Links That Expose Mutable State

**What goes wrong:**
A user copies a share link. The recipient sees the session. Later, the original user continues editing the same session. The recipient refreshes and sees the new changes — or worse, a broken graph because nodes were deleted. Users complain that "shared links change over time" or "I shared a link and now it is broken."

**Why it happens:**
Developers implement sharing by creating a route like `/share/:sessionId` that renders the live session. It is the shortest path: reuse the existing read path, no extra storage. The requirement says "read-only," but the implementation is a read-only view of mutable data.

**How to avoid:**
- Sharing must create an immutable snapshot (a "share" record with its own ID) at the moment of sharing.
- The snapshot duplicates the graph structure and references the same image files (content-addressable storage makes this cheap).
- The original session can continue to mutate; the snapshot is frozen.
- Optionally allow "update share" to overwrite the snapshot, but never auto-sync.

**Warning signs:**
- The share link URL contains the same ID as the edit URL.
- There is no `createdAt` or `snapshotVersion` field on the share entity.
- QA reports that refreshing a share link shows different content after the owner edits.

**Phase to address:**
Phase 3 (Sharing & Export) — but the schema must reserve the concept of snapshots in Phase 1 so Phase 3 is not blocked.

---

### Pitfall 4: History UI That Loads Every Session at Once

**What goes wrong:**
The file-cabinet history UI fetches the full session list with all nodes and images. The browser hangs for seconds while parsing megabytes of JSON. Memory usage climbs until the tab crashes. Scrolling the sidebar is janky.

**Why it happens:**
The Prisma query is written as `prisma.session.findMany({ include: { nodes: true, assets: true } })` because that is the most convenient way to get "everything." The frontend then filters and sorts in memory.

**How to avoid:**
- Implement cursor-based pagination for the session list.
- Return lightweight summary objects for the list view: `id`, `title`, `thumbnailUrl`, `updatedAt`, `nodeCount`, `assetCount`.
- Load the full graph only when a session is opened.
- Use virtualized lists (e.g., `react-window` or `react-virtuoso`) for the sidebar so DOM nodes are recycled.

**Warning signs:**
- `findMany` queries include nested `include` blocks for list endpoints.
- The network tab shows history API responses >100 KB.
- Frontend state stores an array of full session objects.

**Phase to address:**
Phase 2 (History Browser UI) — API contract design must distinguish list vs. detail payloads.

---

### Pitfall 5: Missing Transaction Boundaries Around Multi-Table Writes

**What goes wrong:**
A session is saved. The `Session` row inserts, but the `Node` insert fails due to a validation error. The database now contains a session with zero nodes. Orphaned image files accumulate on disk. The user refreshes and sees a broken, half-saved board.

**Why it happens:**
The existing server code has no database layer; developers add Prisma calls one at a time without wrapping related writes in transactions. Node.js error handling is already weak (generic 500 responses), so partial failures are invisible.

**How to avoid:**
- Every operation that writes to multiple tables must use `prisma.$transaction`.
- For file writes + DB writes, use an outbox pattern or at least write files first, then DB, with a cleanup job for orphaned files.
- Return 422 with specific field errors instead of 500 so the frontend can retry or warn the user.

**Warning signs:**
- Prisma calls are not wrapped in `$transaction`.
- The codebase has no integration tests for failure mid-save.
- Orphaned files appear in the storage directory with no corresponding DB rows.

**Phase to address:**
Phase 1 (Persistence Foundation) — all save endpoints must be audited for transaction safety before release.

---

### Pitfall 6: File Storage Without Deduplication or Cleanup

**What goes wrong:**
The user uploads the same source image five times across different sessions. Five copies are stored on disk. Generated images that are later deleted from the canvas remain on disk forever. Disk usage grows linearly with user activity. Backups become expensive.

**Why it happens:**
The simplest file storage implementation writes whatever arrives to a UUID-named file and stores the path in the DB. There is no reference counting or garbage collection.

**How to avoid:**
- Hash file contents (SHA-256) and use the hash as the storage key. Duplicate uploads become free.
- Maintain a reference count or join table linking files to sessions/nodes.
- Run a periodic cleanup job (or Prisma middleware trigger) that deletes unreferenced files.
- Store files outside the project directory (e.g., `data/uploads/`) so they survive redeploys and are easy to back up separately.

**Warning signs:**
- Filenames are UUIDs with no content hash.
- There is no `File` or `Asset` table; paths are stored inline on `Node`.
- Disk monitoring is not set up.

**Phase to address:**
Phase 1 (Persistence Foundation) — storage layer design must include deduplication and cleanup strategy.

---

### Pitfall 7: JSON Export/Import That Breaks on Schema Evolution

**What goes wrong:**
Users export sessions as JSON. Two weeks later, after a schema change (new node type, renamed field), the import fails or silently corrupts data. Users lose trust in the backup feature.

**Why it happens:**
`JSON.stringify(session)` is used for export and `JSON.parse()` for import with no version field or migration path. The export is a raw database dump, not a stable domain format.

**How to avoid:**
- Include a `schemaVersion` field in every export.
- Write an explicit import pipeline that validates the JSON shape (e.g., Zod schema) and migrates older versions before writing to the DB.
- Export should use a stable domain format, not the internal Prisma structure.
- Write round-trip tests: create a session, export, import into a clean DB, assert equality.

**Warning signs:**
- Export is `res.json(session)` with no transformation.
- Import is `prisma.session.create({ data: req.body })`.
- There are no tests for importing an export from a previous commit.

**Phase to address:**
Phase 3 (Sharing & Export) — but the export format contract must be defined in Phase 1 and enforced by tests.

---

### Pitfall 8: AI-Generated Titles That Are Unstable or Expensive

**What goes wrong:**
Every time a session is saved, the app calls the LLM to generate a title. This adds 1-3 seconds of latency to the save operation. If the user saves multiple times, the title changes each time, making the history list confusing. API costs accumulate.

**Why it happens:**
The requirement (PERS-03) says "history sessions automatically generate short titles based on analysis summary." The naive implementation calls the LLM API synchronously during `POST /api/sessions`.

**How to avoid:**
- Generate the title once, when the analysis is first received, and store it in the `Session` table.
- If the analysis summary changes significantly, allow manual re-title or a background job.
- Use a cheaper/faster model for title generation (e.g., a lightweight text model, not the full image generation model).
- Cache the title in the session row so history list queries do not trigger LLM calls.

**Warning signs:**
- Save endpoint latency is >2 seconds.
- The same session has different titles in the history list at different times.
- API cost dashboard shows unexpected usage spikes correlated with save actions.

**Phase to address:**
Phase 1 (Persistence Foundation) — title generation strategy must be decided before the save API is built.

---

### Pitfall 9: React History UI That Re-implements Canvas State Logic

**What goes wrong:**
The React history browser (`app/` folder) and the existing canvas (`public/app.js`) each maintain their own copy of node positions, zoom levels, and selection state. Fixes to canvas behavior (e.g., a new zoom limit) must be applied in two places. Bugs appear where the history preview and the live canvas show different layouts.

**Why it happens:**
The existing canvas is vanilla JS with tight DOM coupling. The new UI is React. Developers treat them as separate apps and duplicate logic rather than extracting shared state logic.

**How to avoid:**
- Extract a shared canvas state module (plain TypeScript/JavaScript) that both the live canvas and the history preview consume.
- The shared module handles coordinate math, zoom, pan, and node layout — React and vanilla JS only handle rendering.
- If full unification is too costly, at least share the layout algorithm and constants (e.g., `optionPositions`, zoom clamp values) via a shared package.

**Warning signs:**
- `optionPositions` array exists in both `public/app.js` and `app/` code.
- Zoom/pan behavior differs between history preview and live canvas.
- Bug fixes in one app are forgotten in the other.

**Phase to address:**
Phase 2 (History Browser UI) — code review must check for duplicated canvas logic; shared module extraction should happen early in the phase.

---

### Pitfall 10: Demo Mode Silently Persisting Fake Data

**What goes wrong:**
A user runs the app without API keys (demo mode), creates a session, and later adds API keys expecting the session to use real AI. The session continues to show demo-generated images and analysis. The user is confused and reports "AI is not working." Or worse, demo sessions are persisted to the database and mixed with real sessions, polluting the history.

**Why it happens:**
Demo mode is currently a silent fallback. The new persistence layer does not distinguish between demo-generated and real-generated content. The requirement says "keep existing demo mode," but does not specify how it interacts with persistence.

**How to avoid:**
- Add an `isDemo` boolean to the `Session` table.
- Visually flag demo sessions in the history UI (e.g., a "Demo" badge).
- Optionally block sharing or exporting of demo sessions, or warn the user before doing so.
- When API keys are added, do not retroactively convert demo sessions; start new real sessions.

**Warning signs:**
- There is no `isDemo` field in the schema.
- Demo and real sessions are indistinguishable in the history list.
- Users report that "the AI gives the same answers every time" because they are viewing a demo session.

**Phase to address:**
Phase 1 (Persistence Foundation) — schema must capture demo state; UI must surface it.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store images as base64 in DB | Zero file-system code; trivial Prisma queries | Database bloat, slow queries, backup pain | Never for user-generated images; acceptable only for tiny (<10 KB) config blobs |
| Single `jsonb` graph column | No schema migrations for new node fields | Unqueryable, unupdatable, race-prone | Never for core graph structure; acceptable only for opaque plugin metadata |
| Share links point to live session | No snapshot storage needed | Links mutate, break trust | Never; always snapshot on share |
| Load full sessions for history list | One query, simple frontend | Browser memory and network blow up | Never; always paginate and summarize |
| Skip transaction boundaries | Faster code, fewer Prisma blocks | Corrupt data, orphaned files | Never for multi-table writes |
| No schema version in JSON export | Simple `JSON.stringify` | Import breaks on every schema change | Never; always version exports |
| Duplicate canvas logic in React UI | Faster initial development | Double maintenance, divergent behavior | Only during prototyping; must unify before Phase 2 ends |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PostgreSQL + Prisma | Using `jsonb` for everything to avoid migrations | Relational tables for structured data; `jsonb` only for schemaless metadata |
| Prisma + File system | Writing DB and files without a transaction or cleanup plan | Write files first, then DB; reference-count files; periodic orphaned-file cleanup |
| LLM API (title generation) | Calling LLM synchronously on every save | Generate once, cache, use cheaper model; background job if needed |
| React history UI + Vanilla canvas | Re-implementing layout/zoom logic in React | Extract shared state module consumed by both renderers |
| JSON export/import | Dumping raw Prisma objects | Stable domain format with `schemaVersion`, validation, and migration pipeline |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Base64 images in DB | Slow queries, high memory, large backups | Store files on disk, paths in DB | Immediately at first user |
| Full session hydration for lists | History UI freezes, tab crashes | Cursor pagination, lightweight summaries, virtualized lists | ~50 sessions or ~5 MB payload |
| Re-generating titles on every save | Save latency >2 sec, API cost spikes | Cache title, generate once, use cheap model | First save in production |
| No image deduplication | Linear disk growth, slow backups | Content-addressable storage (SHA-256 keys) | ~100 uploads of same image |
| Rebuilding SVG links from scratch on every state change | Janky collapse/expand, high CPU | Incremental updates, virtual DOM, or canvas rendering | ~50 nodes on the board |
| Synchronous file reads for static assets | Memory pressure under load | Streaming (`fs.createReadStream`) or reverse proxy (nginx) | >10 concurrent users |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Share links use sequential integer IDs | Enumeration attacks reveal other users' sessions | Use UUIDs or hashids for share links |
| Share snapshots include API keys or internal metadata | Leak of LLM keys, model configs, or user data | Strip internal fields from snapshot; whitelist export fields |
| File upload path traversal | Attacker overwrites server files or reads arbitrary paths | Validate filenames, store outside web root, use content-hash keys |
| No rate limiting on share links | Share links can be scraped or DDoS'd | Apply same rate limiting as main API; consider CAPTCHA for high traffic |
| JSON import accepts arbitrary Prisma create payloads | Injection of malformed data, extra fields, or nested writes | Validate with Zod/Joi; use explicit DTOs, never pass `req.body` directly to Prisma |
| Persisting chat messages without sanitization | Prompt injection via persisted history replay | Sanitize on input, escape on output, treat persisted messages as untrusted |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| History list shows "Untitled Session" | Users cannot find past work | Auto-generate title from analysis; allow inline rename |
| Share link shows live, mutable state | Recipient sees broken or changed content | Immutable snapshots; clear "shared at [timestamp]" indicator |
| Save button with no feedback | User unsure if work is preserved | Optimistic UI, auto-save indicator, last-saved timestamp |
| History UI loads all images at once | Slow, janky scrolling | Lazy-load thumbnails; virtualized list |
| Demo sessions look identical to real sessions | User confusion, trust erosion | Visual demo badge; warning on export/share |
| Export JSON is not human-readable | User cannot inspect or edit backup | Pretty-printed JSON with stable field ordering |
| No progress indicator for long saves | User clicks save multiple times, causing duplicates | Debounce save, show spinner, disable button during save |

## "Looks Done But Isn't" Checklist

- [ ] **Persistence:** Database has rows, but files are not reference-counted — verify orphaned file cleanup exists
- [ ] **Share links:** Link opens the session, but it is mutable — verify snapshot isolation
- [ ] **History UI:** List renders, but it fetches full session objects — verify pagination and virtualization
- [ ] **JSON export:** File downloads, but import fails on older versions — verify `schemaVersion` and migration tests
- [ ] **Demo mode:** App still works without keys, but demo sessions mix with real ones — verify `isDemo` flag and UI badge
- [ ] **Auto-save:** Save happens on interval, but partial failures leave corrupt sessions — verify transaction boundaries and retry logic
- [ ] **Title generation:** Titles appear, but they change on every save — verify caching and one-time generation
- [ ] **Image storage:** Images are persisted, but duplicates consume disk — verify content-addressable storage
- [ ] **React integration:** History UI mounts, but canvas logic is duplicated — verify shared state module extraction
- [ ] **Rate limiting:** New endpoints exist, but `/api/share` and `/api/export` are unprotected — verify rate limiting covers all public routes

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Base64 images in DB | HIGH | Migrate images to file storage, rewrite DB rows, update all queries |
| Single JSON blob graph | HIGH | Write migration script to normalize into relational tables; update all read/write paths |
| Mutable share links | MEDIUM | Add snapshot table, backfill snapshots for existing shares, redirect old links |
| Full session list loading | LOW | Add pagination to API, update frontend to use summaries, add virtualization |
| Missing transactions | MEDIUM | Audit all endpoints, wrap in `$transaction`, add integration tests |
| Orphaned files | LOW | Write cleanup script, add reference counting, schedule periodic job |
| Unversioned JSON export | MEDIUM | Add `schemaVersion` field, write import migration pipeline, re-export existing backups |
| Unstable AI titles | LOW | Backfill titles with cached values, disable live regeneration, switch to cheaper model |
| Duplicated canvas logic | MEDIUM | Extract shared module, refactor both apps to consume it, add visual regression tests |
| Demo mode confusion | LOW | Add `isDemo` flag to existing sessions, update UI to show badge, document behavior |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Base64 images in DB | Phase 1: Persistence Foundation | Schema review: no `TEXT` or `BYTEA` columns for image data |
| Single JSON blob graph | Phase 1: Persistence Foundation | Schema review: `Node`, `Edge`, `Asset` tables exist; `jsonb` only for metadata |
| Missing transactions | Phase 1: Persistence Foundation | Integration tests simulate failure mid-save; DB remains consistent |
| File storage without deduplication | Phase 1: Persistence Foundation | Upload same image twice; verify single file on disk |
| AI title generation instability | Phase 1: Persistence Foundation | Save same session twice; title does not change; latency <500 ms |
| Demo mode confusion | Phase 1: Persistence Foundation | Demo session has `isDemo=true`; UI shows badge |
| History UI loads everything | Phase 2: History Browser UI | Network tab shows <20 KB for list API; list renders 1000 sessions smoothly |
| React canvas logic duplication | Phase 2: History Browser UI | Code review: no `optionPositions` duplication; shared module exists |
| Mutable share links | Phase 3: Sharing & Export | Share a session, edit original, refresh share — content unchanged |
| Unversioned JSON export | Phase 3: Sharing & Export | Export from current version, import into clean DB, assert round-trip equality |
| JSON import injection | Phase 3: Sharing & Export | Fuzz test import with malformed payloads; Prisma never receives raw `req.body` |

## Sources

- Codebase audit: `E:/Desktop/multiple/.planning/codebase/CONCERNS.md` (2026-04-25)
- Project requirements: `E:/Desktop/multiple/.planning/PROJECT.md` (2026-04-25)
- Domain knowledge: Common patterns in creative canvas apps (Figma, Excalidraw, Miro) and their persistence/sharing architectures
- PostgreSQL best practices: Separation of large objects from relational metadata
- Prisma documentation: Transaction boundaries and `$transaction` usage patterns
- General web application security: OWASP guidelines for file upload and share link enumeration

---
*Pitfalls research for: ORYZAE Image Board — persistence, history, and sharing milestone*
*Researched: 2026-04-25*
