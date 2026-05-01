# Phase 14: Material Library Page - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Material library browsing page with masonry grid, search, and sort. This phase delivers:
- New "素材库" navigation entry in sidebar linking to `/history/?view=library`
- Independent React page with masonry grid layout for material items
- Image thumbnails for image files, type-specific cover icons for non-image files
- Real-time filename search filtering
- Sort dropdown (modified date, added date, filename A-Z, file size)
- No write operations — read-only browsing (delete is Phase 15)

</domain>

<decisions>
## Implementation Decisions

### Routing
- **D-01:** Material library is a new view under `/history/?view=library`, following existing `?view=settings` pattern in `App.tsx`
- **D-02:** Add `"library"` to `ActivePage` type in `AppNavigation.tsx`
- **D-03:** Navigation entry uses `FolderOpen` icon from lucide-react

### Component Architecture
- **D-04:** New components live in `app/src/components/material/` directory
- **D-05:** Main page component `MaterialLibraryPage` orchestrates search, sort, and grid
- **D-06:** `MaterialGrid` renders CSS-based masonry layout (CSS columns, not JS library)
- **D-07:** `MaterialCard` shows thumbnail for images, `FileIcon` for non-images
- **D-08:** `useMaterials` hook handles data fetching with 300ms search debounce

### API Integration
- **D-09:** Use existing `GET /api/materials?q=&sort=` endpoint from Phase 13
- **D-10:** Add `GET /api/materials/:id/file` endpoint to serve material files for image thumbnails
- **D-11:** Image thumbnails served via the new file endpoint; non-images show type icons

### File Type Handling
- **D-12:** Image MIME types (image/*) display actual thumbnails
- **D-13:** PDF, DOC, PPT, TXT show type-specific lucide icons with file type badge
- **D-14:** Video files show `Video` icon
- **D-15:** Unknown types show generic `File` icon

### Claude's Discretion
- Exact masonry implementation (CSS columns vs CSS grid with auto-placement)
- Thumbnail size and aspect ratio choices
- Whether to add a file serving endpoint or use filePath directly
- Loading skeleton count and layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Design Contract
- `.planning/phases/14-material-library-page/14-UI-SPEC.md` — Full visual/interaction spec, component inventory, layout, colors, typography, spacing

### Existing Navigation & Routing
- `app/src/App.tsx` — View routing via `?view=` query param (lines 4-7)
- `app/src/components/AppNavigation.tsx` — Navigation sidebar with ActivePage type (lines 5, 28-33)

### Existing Patterns
- `app/src/components/cabinet/FileCabinet.tsx` — Main history page layout pattern, search, navigation integration
- `app/src/components/cabinet/HistoryPage.tsx` — Content page with sidebar pattern
- `app/src/hooks/useHistory.ts` — Data fetching hook pattern
- `app/src/lib/i18n.ts` — i18n key registration pattern (dictionaries object)
- `app/src/types/index.ts` — Type definitions pattern

### API (Phase 13 deliverables)
- `src/api/materials.js` — GET/POST/DELETE handlers, query params for search/sort
- `server.js` lines 208-219 — Material routes registration

### Data Model
- `prisma/schema.prisma` — MaterialItem model (id, fileName, mimeType, fileSize, hash, filePath, addedAt, updatedAt)

### Requirements
- `.planning/REQUIREMENTS.md` — LIB-01, LIB-04, LIB-05, LIB-06, LIB-07

</canonical_refs>

<specifics>
## Specific Ideas

- Masonry layout should use CSS `columns` for simplicity (no JS library dependency)
- Search debounce at 300ms matches UI-SPEC
- Default sort is "added" (加入日期) per UI-SPEC
- Image thumbnails need a file serving endpoint — `GET /api/materials/:id/file`
- The existing `AppNavigation` component needs a new entry and the `ActivePage` type updated
- The `FileCabinet` component's output tabs area is NOT reused — material library is a completely separate page component

</specifics>

<deferred>
## Deferred Ideas

- Delete functionality (Phase 15)
- Drag-to-canvas interaction (future milestone)
- Material editing (out of scope)
- Thumbnail generation/caching (serve original file for now)

</deferred>

---

*Phase: 14-material-library-page*
*Context gathered: 2026-05-01*
