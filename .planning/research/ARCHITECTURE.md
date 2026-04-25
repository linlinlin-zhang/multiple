# Architecture Research

**Domain:** Creative canvas application with session persistence and history browsing
**Researched:** 2026-04-25
**Confidence:** HIGH

## Standard Architecture

### System Overview

The existing ORYZAE Image Board is a brownfield single-file monolith (stateless HTTP server + vanilla JS canvas frontend). The new milestone adds PostgreSQL persistence, file storage, a React-based history browser, share links, and JSON export/import. The architecture must bridge the existing zero-dependency runtime with new structured layers without rewriting the working canvas core.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌──────────────────────────────────────────┐   │
│  │  Legacy Canvas App  │    │      React History Browser (app/)        │   │
│  │   (public/app.js)   │    │  ┌──────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  - Pan/zoom/drag    │    │  │ Sidebar  │  │ Content  │  │ Folder │ │   │
│  │  - Node graph       │    │  │ (items)  │  │ (detail) │  │ Tabs   │ │   │
│  │  - Imperative state │    │  └──────────┘  └──────────┘  └────────┘ │   │
│  └──────────┬──────────┘    └────────────────────┬─────────────────────┘   │
│             │                                    │                          │
│             └──────────────┬─────────────────────┘                          │
│                            ↓ HTTP /api/*                                    │
├────────────────────────────┴────────────────────────────────────────────────┤
│                              Server Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    HTTP Router (server.js)                           │    │
│  │  - Static file serving (public/, app/dist/)                         │    │
│  │  - API route dispatch                                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                                                                    │
│  ┌──────┴──────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  API Handlers│  │  LLM Proxy   │  │  Share/Export│  │  File Storage   │   │
│  │  - /session  │  │  - /analyze  │  │  - /share    │  │  - /uploads     │   │
│  │  - /history  │  │  - /generate │  │  - /export   │  │  - /generated   │   │
│  │  - /asset    │  │  - /chat     │  │  - /import   │  │  (local fs)     │   │
│  └──────┬──────┘  └──────────────┘  └──────────────┘  └─────────────────┘   │
│         │                                                                    │
├─────────┴────────────────────────────────────────────────────────────────────┤
│                           Persistence Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐    ┌────────────────────────────────────────┐ │
│  │   PostgreSQL (Prisma)    │    │         File System Storage            │ │
│  │  - Session / Board       │    │  - upload/  (original images)          │ │
│  │  - Node / Link           │    │  - generated/ (AI output images)       │ │
│  │  - Asset / ChatMessage   │    │  - Named by content-hash or UUID       │ │
│  └──────────────────────────┘    └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Legacy Canvas App (`public/app.js`) | Live board interaction: pan, zoom, drag nodes, image upload, chat, generation triggers | Vanilla JS, imperative DOM, in-memory `state` object |
| React History Browser (`app/`) | File-cabinet metaphor UI: folder tabs = sessions, sidebar = assets, content = detail | React 19 + Vite + Tailwind + shadcn/ui, built to static bundle |
| HTTP Router (`server.js`) | Request dispatch, static file serving, CORS, error normalization | Pure Node.js `http` module (preserved) |
| API Handlers (new in `server.js` or `src/api/`) | Session CRUD, history listing, asset metadata, share token resolution, import/export | Async functions, Prisma queries, JSON responses |
| LLM Proxy (existing in `server.js`) | Forward analyze/generate/chat to OpenAI Responses API with demo fallbacks | `fetch()` wrapper, role-based config |
| File Storage (`storage/`) | Persist uploaded originals and generated PNGs outside the database | Local filesystem, content-addressable or UUID filenames |
| PostgreSQL + Prisma | Structured data: sessions, nodes, links, assets, chat messages, share tokens | Prisma ORM with schema migrations |

## Recommended Project Structure

```
E:/Desktop/multiple/
├── .planning/
│   └── research/              # This document
├── prisma/
│   ├── schema.prisma          # Session, Node, Link, Asset, ChatMessage, ShareToken
│   └── migrations/            # Generated migration files
├── src/
│   ├── api/                   # NEW: route handlers (extracted from server.js)
│   │   ├── sessions.js        # POST /api/sessions, GET /api/sessions/:id
│   │   ├── history.js         # GET /api/history, DELETE /api/sessions/:id
│   │   ├── assets.js          # POST /api/assets, GET /api/assets/:id
│   │   ├── share.js           # POST /api/share, GET /s/:token
│   │   └── exportImport.js    # POST /api/export, POST /api/import
│   ├── lib/
│   │   ├── prisma.js          # Singleton PrismaClient export
│   │   ├── storage.js         # File read/write helpers
│   │   └── openai.js          # Extracted openAIResponses(), collectText(), etc.
│   └── types.d.ts             # Shared server-side types (optional)
├── storage/
│   ├── uploads/               # Original images uploaded by user
│   └── generated/             # AI-generated images
├── public/                    # EXISTING: legacy canvas app
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── app/                       # EXISTING: React history browser source
│   ├── src/
│   │   ├── components/cabinet/# FileCabinet, Sidebar, ContentArea, etc.
│   │   ├── pages/
│   │   └── lib/
│   ├── index.html
│   └── vite.config.ts         # base: './' → build to ../public/history/
├── server.js                  # EVOLVING: router + static serve, delegates to src/api/
├── package.json               # NOW HAS: prisma, @prisma/client, plus dev deps
└── .env.example               # Add DATABASE_URL, STORAGE_PATH
```

### Structure Rationale

- **`src/api/`:** Extracting handlers from `server.js` prevents the monolith from growing past 1000+ lines. Each domain (sessions, history, assets, share, export/import) gets its own file.
- **`prisma/`:** Standard Prisma location. Schema defines the graph structure (Session -> Node -> Link) and asset metadata.
- **`storage/`:** Files are kept out of `public/` to avoid accidental exposure and path traversal. Served via explicit API routes or a dedicated static mount with hash checks.
- **`app/` preserved as-is:** The React UI is a separate Vite project. It builds into `public/history/` (or `public/app/`) and is served as static files by the existing `serveStatic()`. This avoids SSR complexity.
- **`public/` preserved:** Legacy canvas remains untouched at `/`, ensuring zero regression for the core creative flow.

## Architectural Patterns

### Pattern 1: Incremental Extraction (Strangler Fig)

**What:** Keep `server.js` as the HTTP entry point and router. Gradually extract handler logic into `src/api/*.js` modules. `server.js` imports and calls them.

**When to use:** Brownfield projects where the existing server works and you want to add features without a big-bang rewrite.

**Trade-offs:**
- Pros: Low risk, existing routes untouched, easy rollback.
- Cons: `server.js` still carries routing boilerplate; true modularization requires a framework (Express/Fastify) which is out of scope for this milestone.

**Example:**
```javascript
// server.js (evolved)
import { handleCreateSession, handleGetSession } from './src/api/sessions.js';
import { handleListHistory } from './src/api/history.js';

// inside http.createServer callback:
if (req.method === 'POST' && url.pathname === '/api/sessions') {
  return handleCreateSession(body, res);
}
if (req.method === 'GET' && url.pathname.startsWith('/api/sessions/')) {
  const id = url.pathname.split('/')[3];
  return handleGetSession(id, res);
}
```

### Pattern 2: Dual Frontend — Legacy Canvas + React History

**What:** Two independent frontend applications coexist. The legacy canvas is the "create" mode; the React app is the "browse/review" mode. They communicate with the same backend API but serve different user intents.

**When to use:** When the existing UI is highly specialized (infinite canvas with pan/zoom) and a new UI requires a completely different component model (file cabinet with lists and detail panes).

**Trade-offs:**
- Pros: No need to reimplement canvas in React; React app can use modern tooling (Tailwind, shadcn/ui) without affecting legacy bundle.
- Cons: Two separate build artifacts; shared design tokens must be kept in sync manually; navigation between modes is a full page load.

**Integration:**
- Legacy canvas available at `/` (root).
- React history browser built to `public/history/` and available at `/history/`.
- Add a small link/button in the legacy topbar to "History" (`/history/`), and a "Back to Canvas" link in the React app.

### Pattern 3: Content-Addressable File Storage

**What:** Store files on disk using a hash of their content (e.g., SHA-256 prefix) or a UUID. Metadata (original filename, mime type, session relation) lives in PostgreSQL.

**When to use:** When the same image may be referenced by multiple sessions or re-uploaded, and deduplication saves disk space.

**Trade-offs:**
- Pros: Natural deduplication; immutable files; easy CDN migration later.
- Cons: Slightly more complex lookup (hash -> path); filename collisions handled by prefix directories.

**Example:**
```javascript
// storage.js
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const STORAGE_DIR = process.env.STORAGE_PATH || './storage';

export async function storeFile(buffer, ext) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const dir = path.join(STORAGE_DIR, hash.slice(0, 2), hash.slice(2, 4));
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${hash.slice(4)}.${ext}`);
  await fs.writeFile(filePath, buffer);
  return { hash, filePath, size: buffer.length };
}
```

### Pattern 4: Session-as-Graph Serialization

**What:** The canvas state (nodes, links, collapsed set, view transform) is a directed graph. Serialize it to JSON for the database and for export/import. The database schema mirrors the graph structure: `Session` has many `Node`s; `Node`s have many `Link`s.

**When to use:** When the frontend state is inherently a graph and you need round-trip persistence (save -> load -> identical board).

**Trade-offs:**
- Pros: Faithful reconstruction of user workspace; export/import is trivial (dump/load JSON).
- Cons: Graph schema migrations are harder than flat tables; Prisma handles relations but nested writes must be batched.

**Example Prisma schema excerpt:**
```prisma
model Session {
  id        String   @id @default(uuid())
  title     String   // AI-generated or user-edited
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  nodes     Node[]
  links     Link[]
  assets    Asset[]
  chatMessages ChatMessage[]
}

model Node {
  id        String  @id @default(uuid())
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  type      String  // "source" | "analysis" | "option" | "generated"
  x         Float
  y         Float
  width     Float
  height    Float
  data      Json    // flexible per-node payload
}

model Link {
  id        String @id @default(uuid())
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  fromNodeId String
  toNodeId   String
  kind       String // "analysis" | "option" | "generated"
}
```

### Pattern 5: Share Token as Capability

**What:** Share links are unguessable tokens (UUID or hash) stored in the database pointing to a read-only snapshot of a session. Visiting `/s/:token` resolves the token and returns the session graph JSON for rendering.

**When to use:** When you need simple, stateless share links without user authentication.

**Trade-offs:**
- Pros: No auth system needed; tokens are revocable by deletion; easy to implement.
- Cons: Tokens are bearer credentials — anyone with the link has access; no fine-grained permissions.

## Data Flow

### Request Flow

```
[User Action in Canvas]
    ↓
[Legacy app.js] → POST /api/sessions (save current board)
    ↓
[server.js router] → [src/api/sessions.js handler]
    ↓
[Prisma] → INSERT Session + Node + Link rows
    ↓
[File Storage] → WRITE images to storage/ (if not already stored)
    ↓
[JSON Response] → { sessionId, title, savedAt }

[User opens History Browser]
    ↓
[React app at /history/] → GET /api/history
    ↓
[server.js router] → [src/api/history.js handler]
    ↓
[Prisma] → SELECT sessions ORDER BY updatedAt DESC
    ↓
[JSON Response] → [React Sidebar renders session list]

[User clicks session in Sidebar]
    ↓
[React app] → GET /api/sessions/:id
    ↓
[Prisma] → SELECT session with nodes, links, assets
    ↓
[JSON Response] → [React ContentArea renders detail / or redirects to canvas with ?load=ID]
```

### State Management

```
[Legacy Canvas State] (in-memory only, ephemeral until saved)
    ↓ (explicit save action)
[Session JSON] → API → PostgreSQL graph
    ↑ (explicit load action)
[React History State] (fetched from API, read-only browsing)
```

**Key insight:** The legacy canvas does NOT need to become reactive or adopt a framework. Persistence is an explicit "Save" action that serializes `state` to JSON. Loading a session from history can either:
1. Render a read-only summary in React (detail pane), or
2. Redirect to the canvas with `?sessionId=xxx`, where `app.js` fetches and hydrates the board.

Option 2 is recommended for fidelity — the canvas is the only place that can faithfully render the node graph.

### Key Data Flows

1. **Save Session:** Canvas `state` object → `POST /api/sessions` → Prisma nested create (Session -> Nodes -> Links -> Assets) → return session ID.
2. **Load Session:** Canvas `?sessionId=xxx` → `GET /api/sessions/:id` → Prisma query with include → reconstruct `state` in `app.js` → render nodes and links.
3. **History Browse:** React app mounts → `GET /api/history` → list sessions with title + timestamp → sidebar selection → `GET /api/sessions/:id` for detail view.
4. **Share Link:** Canvas or React triggers `POST /api/share` with session ID → server creates `ShareToken` row → returns `/s/:token`. Visitor GET `/s/:token` → server resolves to session JSON → either renders read-only page or redirects to canvas with loaded state.
5. **Export/Import:** `POST /api/export?sessionId=xxx` → server assembles full session JSON including base64 images (or image URLs) → user downloads `.oryzae.json`. Import: user uploads file → `POST /api/import` → server validates schema → creates new Session graph → returns new session ID.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user (local/self-hosted) | Monolith + SQLite instead of PostgreSQL is possible, but user requested PostgreSQL. Keep filesystem storage local. |
| 10-100 users (small team) | PostgreSQL on same host; file storage on local disk or mounted volume; Prisma connection pool default is fine. |
| 100-10K users | Move file storage to S3-compatible object store (MinIO, R2, S3); add Redis for share-token caching; consider read replicas for history listings. |
| 10K+ users | Split LLM proxy into a separate service with queue (BullMQ + Redis); CDN for images; session sharding by user (requires auth, out of scope). |

### Scaling Priorities

1. **First bottleneck:** File storage I/O on local disk with many large images. Mitigation: store images by content hash to deduplicate; serve with `Cache-Control` headers.
2. **Second bottleneck:** PostgreSQL connection pool exhaustion if many concurrent LLM calls trigger slow save operations. Mitigation: decouple LLM calls from persistence — save happens immediately, LLM call is async.

## Anti-Patterns

### Anti-Pattern 1: Storing Base64 Images in PostgreSQL

**What people do:** Save `data:image/png;base64,...` strings in TEXT or BYTEA columns.

**Why it's wrong:** Bloats the database, slows queries, makes backups huge, and complicates serving images directly to browsers.

**Do this instead:** Store images on the filesystem (or object storage) and keep only the file path or URL in the database. Serve images via dedicated API routes or static mounts.

### Anti-Pattern 2: Rewriting the Canvas in React

**What people do:** Attempt to port the imperative canvas logic (pan, zoom, drag, SVG links) into React components with state/render cycles.

**Why it's wrong:** The existing canvas is ~650 lines of highly tuned imperative DOM code. Reimplementing it in React introduces bugs, performance issues (re-renders on every pan frame), and massive effort.

**Do this instead:** Keep the legacy canvas as-is. Add explicit save/load hooks that bridge its `state` object to the new API. Use React only for the history browser UI, which is list/detail views — a natural fit.

### Anti-Pattern 3: Implicit Auto-Save on Every Interaction

**What people do:** Fire a `POST /api/sessions` on every node drag, zoom, or chat message.

**Why it's wrong:** Creates excessive database writes, race conditions, and network noise. The canvas state mutates at 60fps during pan/drag.

**Do this instead:** Provide an explicit "Save" button (or debounced auto-save at a natural boundary, e.g., after image generation completes). The user intent to persist is clear and writes are batched.

### Anti-Pattern 4: Sharing Mutable Session State

**What people do:** Share links point to the live session row. If the owner edits the board, the share changes.

**Why it's wrong:** Violates user expectation of a snapshot. Also creates permission issues when share links should be read-only.

**Do this instead:** Share links create a **snapshot** (clone) of the session graph at share-time, or mark the session as `isShared = true` and treat it as immutable. The `ShareToken` table should point to a frozen session row or snapshot ID.

### Anti-Pattern 5: Letting the React App and Legacy App Share a Global State

**What people do:** Attempt to unify state between vanilla JS canvas and React via a global event bus or window object.

**Why it's wrong:** Tight coupling across framework boundaries; hard to reason about; breaks React's data flow.

**Do this instead:** Treat them as separate apps. The only shared surface is the backend API and the URL (query params for session loading). Navigate with `window.location.href` or `history.pushState` when switching modes.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI Responses API | Server-side `fetch()` proxy | Already implemented; no change needed. API keys remain server-side only. |
| PostgreSQL | Prisma ORM over TCP | Add `DATABASE_URL` to `.env`. Use connection pooling in production (PgBouncer or Prisma Accelerate). |
| File System (local) | Node.js `fs/promises` | Use `path.normalize()` and prefix checks to prevent traversal. Serve via API route, not direct `public/` exposure. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Legacy Canvas ↔ Server API | HTTP JSON (`fetch`) | Minimal changes: add `postJson('/api/sessions', state)` and `getJson('/api/sessions/' + id)` helpers. |
| React History App ↔ Server API | HTTP JSON (`fetch`) | Standard data fetching. Can use React Query or plain `fetch` + `useEffect`. |
| Server API ↔ Prisma | Function calls (in-process) | PrismaClient singleton imported by handlers. Ensure graceful shutdown (`$disconnect`). |
| Server API ↔ File Storage | `fs/promises` | Abstract behind `storage.js` so migration to S3 later is a drop-in replacement. |
| Legacy Canvas ↔ React History App | URL navigation only | No direct JS communication. Load session via `?sessionId=` query param. |

## Suggested Build Order (Component Dependencies)

1. **Prisma Schema + Migration** — Foundation for all persistence features.
2. **Storage Layer (`src/lib/storage.js`)** — Needed by asset handlers and image serving.
3. **Prisma Client Singleton (`src/lib/prisma.js`)** — Needed by all API handlers.
4. **Session API (`src/api/sessions.js`)** — Core requirement PERS-01 (save/load board).
5. **Asset API (`src/api/assets.js`)** — Needed to persist images before saving sessions.
6. **History API (`src/api/history.js`)** — Needed for PERS-02 (list sessions).
7. **React App Build Pipeline** — Build `app/` to `public/history/`; verify `serveStatic()` serves it.
8. **React History UI Integration** — Wire Sidebar/ContentArea to real `/api/history` and `/api/sessions/:id` endpoints.
9. **Share API (`src/api/share.js`)** — Depends on Session API (needs session rows to exist).
10. **Export/Import API (`src/api/exportImport.js`)** — Depends on Session API and Asset API.
11. **AI Title Generation (PERS-03)** — Extend `handleAnalyze` or add post-processing to generate session titles from analysis summary.
12. **Detail Page Image Explanation (HIST-03)** — New API endpoint or client-side call to LLM for generated image commentary.

**Dependency Graph:**
```
Prisma Schema → Storage Layer → Prisma Client
                     ↓                ↓
              Asset API ←────── Session API
                     ↘           ↙
                    History API
                         ↓
                   React App Build
                         ↓
                   React UI Integration
                         ↓
              Share API, Export/Import API
                         ↓
            AI Title, Image Explanation
```

## Sources

- ORYZAE Image Board codebase analysis (`server.js`, `public/app.js`, `public/index.html`) — 2026-04-25
- React history browser prototype (`app/src/components/cabinet/`, `app/package.json`, `app/vite.config.ts`) — 2026-04-25
- Prisma ORM best practices for brownfield Node.js projects — general industry consensus
- Strangler Fig pattern for incremental migration — Martin Fowler / industry standard

---
*Architecture research for: ORYZAE Image Board persistence & history milestone*
*Researched: 2026-04-25*
