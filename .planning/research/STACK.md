# Research: Technology Stack — Persistence & History Milestone

**Date:** 2026-04-25
**Context:** Adding PostgreSQL persistence, file storage, and React history UI to an existing zero-dependency Node.js canvas app.

## Recommended Stack

### Database

**PostgreSQL 16+** — Required by user. For single-tenant self-hosted use, any version 14+ works. Use `pg` npm package (native driver) or connect via Prisma.

**Prisma 6.x** — ORM and migration tool.
- `prisma` (CLI + client)
- `@prisma/client` (runtime)
- Rationale: Type-safe queries, excellent migration workflow (`prisma migrate dev`), good Node.js ES module support.
- Alternative NOT recommended: Drizzle is lighter but has less mature migration tooling; TypeORM is heavier and slower.
- Confidence: HIGH

### File Storage

**Local filesystem + SHA-256 content addressing**
- Store uploads and generated images in `storage/images/` with SHA-256 prefix dirs (`ab/cd/abcdef...jpg`)
- Deduplicates identical images automatically
- Serve via explicit API route (`/api/assets/:hash`) with path guards
- Rationale: Zero additional dependencies, works offline, trivial backups. S3/minio can be added later without schema changes.
- Confidence: HIGH

### Frontend (History Browser)

**React 19 + Vite 6 + Tailwind CSS 3.4 + shadcn/ui** — Already prototyped in `app/` folder.
- Build to `public/history/` as static files
- Served by existing Node.js `http` server
- Rationale: Prototype already exists; no rewrite needed.
- Confidence: HIGH

### API & Server

**Keep existing `node:http` server** — Do NOT add Express/Fastify yet.
- Extract new handlers to `src/api/*.js` modules
- Prisma Client imported in each handler module
- Rationale: Respects zero-dependency philosophy for core; only adds Prisma + pg. Framework migration can be a future phase.
- Confidence: HIGH

### LLM Integration (New Uses)

**Existing OpenAI Responses API** — Reuse existing integration.
- AI session title generation: call chat model with summary prompt
- AI image explanation: call vision model with generated image
- Rationale: Infrastructure already exists; just new prompt templates.
- Confidence: HIGH

## Dependencies to Add

```json
{
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0"
  }
}
```

## Migration Path

1. `npm install @prisma/client pg`
2. `npm install -D prisma`
3. `npx prisma init` → creates `prisma/schema.prisma`
4. Define schema (`Session`, `Node`, `Link`, `Asset`, `ShareToken`)
5. `npx prisma migrate dev --name init`
6. Extract new API handlers from `server.js` into `src/api/`
7. Build React app (`app/`) to `public/history/`

## What NOT to Use

| Technology | Why Rejected |
|------------|--------------|
| SQLite | User explicitly chose PostgreSQL |
| Express / Fastify | Adds complexity; current `node:http` is sufficient for <15 routes |
| MongoDB | Relational data (graph nodes + links) fits Postgres better |
| Base64 in database | Performance killer; use filesystem |
| JWT/auth libraries | Out of scope for v1 |

---
*Research: 2026-04-25*
