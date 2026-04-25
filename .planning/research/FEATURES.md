# Feature Research

**Domain:** Creative canvas / AI image exploration app with persistence, history browsing, and sharing
**Researched:** 2026-04-25
**Confidence:** MEDIUM (based on domain knowledge, project requirements, and architecture analysis; limited by inability to verify against live competitor docs)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Auto-save on state change | Users expect creative work to never be lost; manual save feels archaic | LOW | Debounced save (~2-5s) after node moves, image generation, or chat. Avoids write storms. |
| Session list / history browser | Users need to return to past explorations without remembering URLs | MEDIUM | PROJECT.md specifies "file-cabinet-style" UI: folder tabs = sessions, sidebar = assets, right pane = detail. |
| Session metadata (title, timestamp, thumbnail) | Without labels, history is an unscanable wall of "Untitled" | LOW | AI-generated titles (PERS-03) are a nice touch, but at minimum show timestamp + first image thumbnail. |
| Restore full canvas state on return | Re-opening a session must bring back nodes, positions, zoom, links | MEDIUM | Requires serializing `state.nodes`, `state.links`, `state.view`, `state.chatMessages`. |
| Export / backup session | Users distrust cloud-only storage; want local backups | LOW | JSON dump of session graph. PROJECT.md specifies JSON export/import (SHAR-02). |
| Share read-only link | Creative work is inherently social; users want to show results | MEDIUM | Requires URL scheme with session ID, read-only renderer, and optional access control. PROJECT.md specifies read-only (SHAR-01). |
| Server-side image storage | Base64 images in memory or localStorage blow up quickly | MEDIUM | PROJECT.md specifies file storage for uploaded originals and generated images (DATA-02). |
| Delete / archive session | Users create many experiments; clutter management is essential | LOW | Soft-delete (archive flag) preferred over hard delete for accidental recovery. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-generated session titles & summaries | Removes cognitive burden of naming; makes history scannable | LOW | PROJECT.md requirement PERS-03. Differentiator because most tools use manual naming or raw timestamps. |
| Per-image AI content explanation | Each generated image gets an educational/creative caption | MEDIUM | PROJECT.md requirement HIST-03. Adds narrative depth beyond "here is a picture." |
| File-cabinet browsing metaphor | Familiar physical metaphor reduces cognitive load vs. timeline-only UIs | MEDIUM | PROJECT.md requirement HIST-01. Tabs = sessions, sidebar = typed assets, detail pane = rich preview. |
| Typed asset sidebar (images, links, files, chat snippets) | Cross-session asset reuse; turns history into a personal media library | MEDIUM | PROJECT.md requirement HIST-02. Elevates history from "list of sessions" to "creative asset manager." |
| Demo mode with full session persistence | Users without API keys can still explore UI, save/load, and share | LOW | Existing demo mode extended. Rare in AI tools — most gate everything behind signup/API key. |
| JSON import/export with merge strategy | Power users can archive, version-control, or migrate sessions | MEDIUM | PROJECT.md requirement SHAR-02. Differentiator if merge-on-import is supported (update vs. replace). |
| Session branching / fork | Start a new exploration from any point in an old session's graph | MEDIUM | Natural fit for canvas graph model. Lets users iterate without destroying original. |
| Full-text search across sessions | Search by AI summary, chat content, or image captions | MEDIUM | Requires indexing session text in PostgreSQL. High value once session count grows. |
| Keyboard-driven history navigation | Power users navigate sessions without mouse (e.g., Cmd+Shift+H) | LOW | Fits file-cabinet metaphor (arrow keys, Enter to open, Esc to close). |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaborative editing | "Google Docs for creative canvas" sounds appealing | Requires OT/CRDT, WebSocket infra, conflict resolution for node graphs, and user auth. PROJECT.md correctly scopes this out. | Read-only share links (SHAR-01) + future "fork to my workspace" |
| User accounts & OAuth | Standard for SaaS; enables multi-user | Adds massive complexity (auth, password reset, GDPR, session isolation) for a single-user local/self-hosted tool. PROJECT.md correctly scopes this out. | Single-user local mode; optional HTTP Basic Auth for self-hosted instances |
| Cloud sync across devices | Users want access everywhere | Requires hosted backend, data residency concerns, ongoing costs. Conflicts with self-hosted/local-first value. | Self-hosted deployment guide; users manage their own Postgres |
| Infinite undo / redo across sessions | Users expect Ctrl+Z everywhere | Session-level undo is hard because AI generation is non-deterministic and costly to replay. Graph mutations are complex to invert. | Per-session snapshot restore; explicit "revert to here" on graph nodes |
| Version control for images (diff, merge) | Developers want Git-like semantics | Images are binary blobs; diff/merge is meaningless for creative pixels. Over-engineering. | Export JSON + image zip for external version control |
| Public gallery / social feed | "Let users discover each other's work" | Moderation burden, legal liability for AI-generated images, scope creep into social network. | Share links are private by default; no public index |

## Feature Dependencies

```
[PostgreSQL + Prisma schema]
    └──requires──> [Server-side file storage]
        └──requires──> [Image deduplication / path management]

[Auto-save]
    └──requires──> [Database persistence layer]
        └──requires──> [Image storage migration (base64 -> files)]

[Session history browser]
    └──requires──> [Auto-save]
        └──requires──> [Session metadata (title, timestamp)]
            └──requires──> [AI-generated titles]

[Share read-only link]
    └──requires──> [Session history browser]
        └──requires──> [Read-only canvas renderer]

[File-cabinet sidebar with typed assets]
    └──requires──> [Session history browser]
        └──enhances──> [Full-text search]

[Per-image AI explanation]
    └──requires──> [Image storage with stable IDs]
        └──requires──> [Lazy explanation generation (on-demand)]

[JSON export/import]
    └──requires──> [Stable session serialization format]
        └──conflicts──> [Base64 image embedding] (export size explosion)

[Session branching]
    └──requires──> [Deep copy of session graph + images]
        └──requires──> [Storage quota awareness]
```

### Dependency Notes

- **Auto-save requires database persistence:** Without Postgres/Prisma, auto-save has nowhere reliable to go. `localStorage` is too small for images and base64 graphs.
- **Image storage migration is a prerequisite:** Current architecture stores images as base64 in memory. Persistence requires moving to server-side files (DATA-02) before any history feature works at scale.
- **AI-generated titles enhance but don't block history:** Fallback to timestamp + thumbnail is acceptable if title generation fails or is slow.
- **Read-only renderer conflicts with current editable canvas:** The existing `app.js` canvas assumes full interactivity (drag, pan, generate). A read-only mode needs either a separate render path or careful event-gating.
- **JSON export conflicts with base64 embedding:** Exporting base64 images inside JSON produces huge, unshareable files. Export should reference images by filename/URL and bundle them separately (zip), or store images in a parallel directory.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Auto-save to PostgreSQL** — Core pain point: "refresh loses work" (PERS-01). Every node move, generation, and chat message triggers a debounced save.
- [ ] **Session list with timestamp + thumbnail** — Basic history browser without full file-cabinet chrome. A simple sidebar or dropdown listing past sessions (PERS-02).
- [ ] **Restore session on click** — Reloads full canvas state: nodes, links, view transform, chat history (PERS-01).
- [ ] **Server-side image storage** — Uploads and generated images saved to disk with DB metadata (DATA-02). Unblocks everything else.
- [ ] **AI-generated session titles** — Makes the session list scannable (PERS-03). Low complexity, high perceived value.
- [ ] **Delete session** — Prevents infinite growth. Soft-delete with confirmation.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **File-cabinet history UI** — Full HIST-01 implementation with folder tabs, asset sidebar, and detail pane. Trigger: session list feels cramped.
- [ ] **Typed asset sidebar** — HIST-02. Images, links, files, chat snippets. Trigger: users want to reuse assets across sessions.
- [ ] **Per-image AI explanation** — HIST-03. Trigger: users want to understand why a generation turned out a certain way.
- [ ] **Read-only share links** — SHAR-01. Trigger: users ask how to show their work to others.
- [ ] **JSON export/import** — SHAR-02. Trigger: power users want backups or migration.
- [ ] **Session branching** — Fork an existing session. Trigger: users generate variations and want to keep both.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Full-text search across sessions** — Requires PostgreSQL text search or Meilisearch. Defer until >50 sessions per user.
- [ ] **Keyboard-driven navigation** — Nice for power users, but low impact early.
- [ ] **Storage quotas & cleanup** — Only relevant if hosted multi-user.
- [ ] **Real-time collaboration** — Massive scope expansion. Only if share links prove insufficient.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auto-save to PostgreSQL | HIGH | MEDIUM | P1 |
| Server-side image storage | HIGH | MEDIUM | P1 |
| Session list + restore | HIGH | MEDIUM | P1 |
| AI-generated session titles | MEDIUM | LOW | P1 |
| Delete/archive session | MEDIUM | LOW | P1 |
| File-cabinet history UI | HIGH | MEDIUM | P2 |
| Read-only share links | HIGH | MEDIUM | P2 |
| JSON export/import | MEDIUM | LOW | P2 |
| Typed asset sidebar | MEDIUM | MEDIUM | P2 |
| Per-image AI explanation | MEDIUM | MEDIUM | P2 |
| Session branching | MEDIUM | MEDIUM | P2 |
| Full-text search | MEDIUM | MEDIUM | P3 |
| Keyboard navigation | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Midjourney (Discord) | DALL-E (ChatGPT) | ComfyUI (Local) | Our Approach |
|---------|----------------------|------------------|-----------------|--------------|
| Session persistence | Thread-based, Discord-hosted | Conversation history in ChatGPT | Manual save/load workflows | Native file-cabinet UI with auto-save |
| History browsing | Scroll Discord channel | Linear chat scroll | File browser / node graph | Tabbed sessions + typed asset sidebar |
| AI-generated titles | None (user messages) | None (user prompts) | Manual workflow naming | Auto-generated from analysis summary |
| Share link | Upscale + share in Discord | "Share" conversation | Export image / workflow | Read-only canvas link |
| Export / import | No session export | No session export | JSON workflow + PNG metadata | JSON session + image bundle |
| Per-image explanation | No | GPT-4 can describe | No | Dedicated explanation API call |
| Self-hosted | No | No | Yes | Yes (single-user, local-first) |
| Demo without API key | No | No | No | Yes (SVG fallback with full UI) |

## Sources

- PROJECT.md requirements analysis (PERS-01 through DATA-02)
- ARCHITECTURE.md current state assessment (monolith, in-memory state, base64 images)
- Domain knowledge of creative tool UX patterns (Figma history, ComfyUI workflow management, Midjourney Discord threads)
- File-cabinet UI metaphor from macOS Finder, VS Code explorer, and legacy iTunes sidebar patterns

---
*Feature research for: ORYZAE Image Board persistence, history, and sharing*
*Researched: 2026-04-25*
