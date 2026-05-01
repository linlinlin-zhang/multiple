# Phase 15: Workbench Sync & File Management - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Workbench-to-material-library sync and material deletion. This phase delivers:
- Files uploaded on the workbench (images, PDF, PPT, TXT, Word, video) automatically create a MaterialItem entry
- Material library page gains a delete button on each card
- Delete removes the item from grid, database, and disk
- Deleting a material does NOT affect the original workbench session or nodes referencing it
- Read-only browsing was Phase 14; this phase adds the write path

</domain>

<decisions>
## Implementation Decisions

### Sync Mechanism
- **D-01:** Sync happens server-side in `handleStoreAsset` (src/api/assets.js) — after storing the asset, also create a MaterialItem if the mime type is a supported material type
- **D-02:** Supported material MIME types: all image/*, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.presentationml.presentation, text/plain, video/mp4, video/webm
- **D-03:** MaterialItem.filePath points to the same file stored by storeFile (reuse existing storage, no duplication)
- **D-04:** Hash-based dedup: if a MaterialItem with the same hash already exists, skip creation (idempotent)
- **D-05:** The 100-item limit from Phase 13 still applies — if limit reached, log a warning but don't fail the asset upload (material sync is best-effort)

### Delete Functionality
- **D-06:** Add a delete button (Trash2 icon) to MaterialCard component, visible on hover
- **D-07:** Delete calls `DELETE /api/materials/:id` (already exists from Phase 13)
- **D-08:** After successful delete, remove item from local state via refetch or optimistic update
- **D-09:** Show a confirmation dialog before delete (using existing AlertDialog from shadcn)

### Workbench Isolation
- **D-10:** Material deletion only removes the MaterialItem DB record and the file in material storage directory
- **D-11:** The original asset in upload/generated storage is NOT touched — workbench sessions remain intact
- **D-12:** Nodes referencing the asset via /api/assets/:hash continue to work

### Claude's Discretion
- Whether to use optimistic update or refetch after delete
- Confirmation dialog style and text
- Whether to add a success toast after delete
- How to handle the edge case where material file is missing from disk but DB record exists

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API (Phase 13 deliverables)
- `src/api/materials.js` — handleCreateMaterial, handleDeleteMaterial, handleListMaterials, handleGetMaterialFile
- `src/api/assets.js` — handleStoreAsset (sync integration point)
- `server.js` lines 150-157 — Asset route registration

### Storage
- `src/lib/storage.js` — storeFile, storeDataUrl, hashBuffer, readFile, findFilePathForHash

### UI Components (Phase 14 deliverables)
- `app/src/components/material/MaterialCard.tsx` — Card component (needs delete button)
- `app/src/components/material/MaterialGrid.tsx` — Grid component
- `app/src/components/material/MaterialLibraryPage.tsx` — Main page (needs delete handler)
- `app/src/hooks/useMaterials.ts` — Data hook (has refetch)

### UI Components (existing)
- `app/src/components/ui/alert-dialog.tsx` — Confirmation dialog

### Data Model
- `prisma/schema.prisma` — MaterialItem model

### Frontend Upload Flow
- `public/app.js` lines 1738-1830 — handleFile function (image and document upload)
- `public/app.js` — handleAttachment function

### Requirements
- `.planning/REQUIREMENTS.md` — LIB-02, LIB-08

</canonical_refs>

<specifics>
## Specific Ideas

- The sync should be a new helper function `syncToMaterialLibrary(hash, fileName, mimeType, fileSize)` called from handleStoreAsset
- MaterialCard delete button should use the Trash2 icon from lucide-react
- Confirmation dialog should use the existing AlertDialog component from shadcn
- The refetch function from useMaterials hook can be passed down to MaterialCard via props or context
- Consider using a callback pattern: MaterialLibraryPage passes onDelete to MaterialGrid, which passes it to MaterialCard

</specifics>

<deferred>
## Deferred Ideas

- Drag-to-canvas interaction (future milestone)
- Material editing (out of scope)
- Batch delete (not in requirements)
- Material metadata editing (not in requirements)

</deferred>

---

*Phase: 15-workbench-sync*
*Context gathered: 2026-05-01*
