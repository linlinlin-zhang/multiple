---
phase: 02-history-browser-ui-navigation
plan: 02
subsystem: history-browser-ui
phase_number: 2
tags: [react, typescript, ui, sidebar, svg]
dependency_graph:
  requires: ["02-01"]
  provides: ["02-03"]
  affects: []
tech_stack:
  added: []
  patterns:
    - Static read-only SVG thumbnail (no canvas logic duplication)
    - Grouped sidebar items with type icons
    - Type-specific detail rendering with metadata grid
key_files:
  created:
    - app/src/components/cabinet/AssetSidebar.tsx
    - app/src/components/cabinet/AssetDetailPane.tsx
    - app/src/components/cabinet/NodeGraphThumbnail.tsx
  modified:
    - app/src/components/cabinet/HistoryPage.tsx
    - app/src/components/cabinet/Sidebar.tsx
    - app/src/components/cabinet/SidebarItem.tsx
    - app/src/components/cabinet/ContentArea.tsx
    - app/src/components/cabinet/ContentRenderer.tsx
decisions:
  - Replaced the old HistoryPage.tsx (which used ContentArea/ContentRenderer for text notes) with a new composition using AssetSidebar + NodeGraphThumbnail + AssetDetailPane
  - AssetDetailPane does NOT use ContentArea/ContentRenderer; it renders type-specific content directly
  - NodeGraphThumbnail uses the same cubic bezier curve math as the live canvas but is purely static SVG with no interactivity
  - Sidebar icons are passed as React.ReactNode via the SidebarItemData interface, keeping the icon system flexible
metrics:
  duration_minutes: ~25
  tasks_completed: 3
  files_created: 3
  files_modified: 5
---

# Phase 2 Plan 02: History Browser Page (Sidebar + Detail Pane + Node Thumbnail) Summary

**One-liner:** Built the history browser page that displays a session's assets in a grouped sidebar with type icons, a read-only SVG node graph thumbnail, and a right-hand detail pane with type-specific rendering for images, files, links, and chat messages.

## What Was Built

### AssetSidebar (app/src/components/cabinet/AssetSidebar.tsx)
- Transforms `SessionDetail` into grouped `SidebarItemData[]` in order: Images, Files, Links, Chat
- **Images:** generated assets with `Image` icon, showing MIME type and formatted file size
- **Files:** upload assets with `FileText` icon, showing file name and size
- **Links:** nodes with `data.option.referenceUrl` using `ExternalLink` icon, URL truncated to 60 chars
- **Chat:** up to 20 chat messages with `MessageSquare` icon, role label (You/AI) and content excerpt
- Includes `formatBytes()` helper for human-readable sizes (B/KB/MB/GB)

### AssetDetailPane (app/src/components/cabinet/AssetDetailPane.tsx)
- **Image assets:** `<img>` with `loading="lazy"`, `buildAssetUrl()` for src, metadata grid (file name, MIME type, size, hash prefix, created date)
- **File assets:** centered `File` icon + file name + same metadata grid
- **Link assets:** `ExternalLink` icon + clickable `<a>` with `target="_blank" rel="noopener noreferrer"` + optional description
- **Chat messages:** role badge (You/AI) with distinct background colors + full content with `whitespace-pre-wrap` + timestamp
- Placeholder state when no asset selected: "Select an asset from the sidebar to view details."

### NodeGraphThumbnail (app/src/components/cabinet/NodeGraphThumbnail.tsx)
- **Static, read-only SVG** — no pan, zoom, drag, or interactivity
- Computes bounding box from all nodes, adds 40px padding, sets `viewBox` accordingly
- Draws links as cubic bezier curves using the same math as the live canvas:
  `distance = max(120, abs(end.x - start.x) * 0.42)`
- Link start = node center-right (`x + width - 18`, `y + height * 0.48`)
- Link end = node center-left (`x + 18`, `y + height * 0.48`)
- Node colors by type: source `#3d9a92`, analysis `#d9bc68`, option `#f0ece4` (with stroke), generated `#bd453c`
- Node labels centered, truncated to 12 chars, light text on dark nodes
- "No nodes" placeholder when `nodes.length === 0`

### HistoryPage (app/src/components/cabinet/HistoryPage.tsx)
- Uses `useSession(sessionId)` to fetch session detail
- Composes: `AssetSidebar` (left) + header + `NodeGraphThumbnail` + `AssetDetailPane` (right)
- **Session header:** title, timestamp, node count, asset count, "Open in Canvas" `<a>` link to `/?session={id}`
- **Skeleton loading:** pulsing sidebar + detail placeholders
- **Error banner:** red banner with error message and Retry button calling `refetch()`
- **Auto-select:** on session load, selects first image > first file > first node > first chat message

### Updated Components
- **Sidebar.tsx:** Extended `SidebarItemData` with optional `icon?: React.ReactNode`, passes it through to `SidebarItem`
- **SidebarItem.tsx:** Added optional `icon` prop, renders 16x16 icon left of title in a flex row with `gap-2`
- **ContentArea.tsx / ContentRenderer.tsx:** Added legacy comments noting they are not used in HistoryPage

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None.

## Known Stubs

| File | Line | Description | Reason |
|------|------|-------------|--------|
| AssetDetailPane.tsx | Image section | No AI explanation for generated images | Real AI explanation will be implemented in Phase 4 (HIST-03) |

## Threat Flags

None. The detail pane renders chat content as React text nodes (JSX escaping), and images use native `<img>` with `loading="lazy"`.

## Self-Check: PASSED

- [x] `app/src/components/cabinet/AssetSidebar.tsx` exists
- [x] `app/src/components/cabinet/AssetDetailPane.tsx` exists
- [x] `app/src/components/cabinet/NodeGraphThumbnail.tsx` exists
- [x] `app/src/components/cabinet/HistoryPage.tsx` exists and composes all three
- [x] TypeScript compiles (`npx tsc --noEmit` passes)
- [x] Vite build succeeds (`npx vite build --outDir ../public/history --emptyOutDir` succeeds)
- [x] Commits exist:
  - `576ea4a` feat(02-02): add AssetSidebar with grouped asset items and icon support
  - `dd22c2d` feat(02-02): add AssetDetailPane with type-specific rendering
  - `5c68b29` feat(02-02): add NodeGraphThumbnail and HistoryPage composition
