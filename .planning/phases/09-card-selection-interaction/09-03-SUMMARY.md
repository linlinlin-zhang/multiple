---
phase: 09-card-selection-interaction
plan: 03
subsystem: canvas-interaction
tags: [delete, rename, inline-edit, i18n, css]
dependency_graph:
  requires: [09-01, 09-02]
  provides: []
  affects: [public/app.js, public/styles.css]
tech_stack:
  added: []
  patterns: [hover-reveal-button, inline-contenteditable-replacement, toast-guard-messages]
key_files:
  created: []
  modified:
    - public/app.js
    - public/styles.css
decisions:
  - "Use textContent (not innerHTML) for all title rendering to prevent XSS from edited titles"
  - "Preserve edited analysis title during language switch by checking for active input before overwriting"
  - "Hide delete button on source nodes via CSS (.source-node .node-delete-btn { display: none }) rather than conditional JS creation for simplicity"
  - "Keep delete button visible on nodes with children but show toast on click (option a) to avoid dynamic button visibility complexity"
metrics:
  duration: "~4 min"
  completed_date: "2026-04-26"
  tasks: 3
  files_modified: 2
---

# Phase 09 Plan 03: Card delete and rename Summary

**One-liner:** Hover-reveal delete button with source/children guards and double-click inline title editing with Enter-save, Escape-cancel, blur-save.

## What Was Built

### Task 1: Delete button with hover reveal and guards
- Added `canDeleteNode(nodeId)` — returns false for source nodes and nodes with children.
- Added `deleteNode(nodeId)` — removes node from state, links, DOM; updates counts; redraws links; auto-saves. Shows toast if deletion is blocked.
- Modified `showSelectionToast(message)` to accept an optional custom message (reused from 09-02).
- In `registerNode()`, appended a `.node-delete-btn` to every node element.
- Added `.node-delete-btn` CSS with hover reveal (`opacity: 0` → `1` on `.node:hover`), danger color on hover, and `z-index: 10` to stay clickable on selected nodes.
- Added i18n keys: `node.delete`, `node.cannotDeleteSource`, `node.cannotDeleteWithChildren` (zh + en).

### Task 2: Inline title editing
- Added `makeTitleEditable(nodeId, titleElement)` — replaces title text with an `<input>` on double-click.
- Save: Enter or blur. Cancel: Escape. Restores original text if empty or unchanged.
- Updates `node.option.title` on save and triggers `autoSave()`.
- Wired into:
  - `renderOptions()` — `.option-title` elements
  - `turnIntoGeneratedNode()` — `h3` title elements
  - `renderAnalysis()` — `h2` title element
  - `loadSession()` — restored option/generated nodes
- Added `.node-title-input` CSS with theme-colored border, focus ring, and inherited font sizing.

### Task 3: Edge cases and visual polish
- Added `.source-node .node-delete-btn { display: none }` to completely hide delete button on source nodes.
- Added title hover cue (`background: rgba(0, 112, 204, 0.06)`) to indicate editability.
- Fixed `renderAllText()` to preserve edited analysis titles during language switch — skips overwriting if an inline input is currently active inside the title element.
- Verified `makeDraggable` already ignores `input` elements, so dragging while editing is prevented.

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None.

## Known Stubs

None. All functionality is fully wired.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: xss-prevention | public/app.js | `textContent` used for all title display; input value sanitized by `textContent` assignment |

## Self-Check: PASSED

- [x] `canDeleteNode`, `deleteNode`, `makeTitleEditable` exist in `public/app.js`
- [x] `.node-delete-btn`, `.node-title-input`, title hover cues exist in `public/styles.css`
- [x] i18n keys added for zh and en
- [x] All three commits verified in git log
- [x] No unexpected file deletions
