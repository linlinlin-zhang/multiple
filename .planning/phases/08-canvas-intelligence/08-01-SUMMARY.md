---
phase: 08
plan: 01
subsystem: canvas-intelligence
tags: [canvas, layout, animation, ui]
requires: []
provides: [TOOL-01]
affects: [public/app.js, public/styles.css, public/index.html]
tech-stack:
  added: []
  patterns: [requestAnimationFrame ease-out-cubic, CSS pointer-events toggle, tree depth layout]
key-files:
  created: []
  modified:
    - public/app.js
    - public/styles.css
    - public/index.html
decisions:
  - "Used ease-out-cubic (1 - (1-t)^3) for arrange animation to feel snappy and natural"
  - "Column gap of 420px accommodates widest generated node (360px) plus link gap"
  - "is-arranging CSS class disables pointer-events on nodes during rAF animation to prevent drag conflicts"
  - "No persistent 'arranged' flag — positions save via normal autoSave, but arrange state is transient"
metrics:
  duration: "12m"
  completed-date: "2026-04-26"
  tasks: 3
  files-modified: 3
---

# Phase 8 Plan 01: Auto-arrange canvas layout Summary

**One-liner:** One-click "Arrange" button that collapses un-generated option nodes and animates visible nodes into a clean layered tree layout with ease-out-cubic interpolation.

## What Was Built

### Task 1 — Arrange button in toolbar
- Added `id="arrangeButton"` button with broom emoji (🧹) to `.nav-settings-grid` in `public/index.html`
- Added i18n keys `session.arrange` for zh ("一键整理") and en ("Arrange Canvas")
- Wired click listener to `arrangeCanvasLayout()` in `wireControls()`
- Added title localization in `renderAllText()` `btnTitles` map

### Task 2 — Tree layout algorithm + animation
- `arrangeCanvasLayout()`:
  - Iterates all nodes, adds un-generated `option-*` IDs to `state.selectiveHidden`
  - Calls `applyCollapseState()` and `updateCollapseControls()`
  - Computes depth for each visible node: source=0, analysis=1, others=parentDepth+1
  - Groups nodes by depth and positions them in columns (420px gap) with vertical centering
  - Clamps positions to board bounds (2400x1500)
  - Invokes `animateNodesToPositions(targetPositions, 400)`
- `animateNodesToPositions()`:
  - Adds `is-arranging` class to board
  - Uses `requestAnimationFrame` with timestamp-based ease-out-cubic
  - Updates `node.x`, `node.y`, and `element.style.left/top` each frame
  - Calls `drawLinks()` each frame and `autoSave()` after completion
  - Removes `is-arranging` class when done

### Task 3 — CSS for animation state
- Added `.board.is-arranging .node` rule:
  - `pointer-events: none` — prevents drag during animation
  - `transition: none` — avoids CSS transition conflicts with rAF

## Verification

- [x] Arrange button visible in sidebar toolbar
- [x] Clicking Arrange hides all un-generated option nodes
- [x] Visible nodes (source, analysis, generated) move to clean columnar positions
- [x] Animation is smooth (~400ms ease-out-cubic)
- [x] After animation, links redraw correctly
- [x] Dragging nodes still works after arrange
- [x] Saving session persists new positions
- [x] Reloading session restores positions
- [x] No console errors during arrange

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. All arrange logic is client-side; no new server boundary or untrusted input path introduced.

## Self-Check: PASSED

- [x] `public/index.html` contains `arrangeButton`
- [x] `public/app.js` contains `arrangeCanvasLayout` and `animateNodesToPositions`
- [x] `public/styles.css` contains `.board.is-arranging .node`
- [x] Commits verified: cc8364d, 7989c6e, 1e60173
