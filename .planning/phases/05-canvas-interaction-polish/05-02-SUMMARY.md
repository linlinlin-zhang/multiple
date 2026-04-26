---
phase: 5
plan: 05-02
subsystem: canvas-interaction
requirements: [CANV-04]
tags: [collapse, expand, node-interaction, canvas, ui]
dependency_graph:
  requires: []
  provides: [CANV-04]
  affects: [public/app.js, public/styles.css]
tech-stack:
  added: []
  patterns: [multi-click-detector, selective-visibility, state-persistence]
key-files:
  created: []
  modified:
    - public/app.js
    - public/styles.css
decisions:
  - "Use .collapse-dot (persistent DOM button) instead of SVG link pins for multi-click interaction — more reliable than re-attaching listeners to transient SVG elements"
  - "Introduce state.selectiveHidden Set alongside state.collapsed to support partial collapse without breaking existing full-collapse semantics"
  - "280ms click timeout for triple-click detection — standard UX threshold"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-26"
---

# Phase 5 Plan 05-02: Node Collapse / Expand Interaction Summary

**One-liner:** Implemented selective and full node collapse with single/double/triple-click on collapse dots, plus auto-collapse of unselected siblings after image generation.

## What Was Built

Upgraded the node collapse/expand system in `public/app.js` to support the CANV-04 requirement:

1. **Auto-collapse after generation:** When a user generates an image from one option node, all un-selected, un-generated sibling option nodes are automatically hidden via `state.selectiveHidden`.

2. **Multi-click collapse dot behavior:**
   - **Single click:** Toggles selective collapse — hides/shows only un-generated descendants.
   - **Double click:** Toggles full collapse — hides/shows ALL descendants via `state.collapsed`.
   - **Triple click:** Expands everything globally — clears both `state.collapsed` and `state.selectiveHidden`.

3. **Visual feedback:** The `.collapse-dot` button displays a badge count of hidden descendants and updates its `is-collapsed` / `has-children` classes accordingly.

4. **Persistence:** Both `collapsed` and `selectiveHidden` are included in `computeStateHash()`, `prepareStateForSave()`, and `loadSession()` so collapse states survive page refresh.

5. **Link rendering:** `drawLinks()` and `isNodeVisible()` respect the new `.selective-hidden` class, so hidden nodes have no links drawn to/from them.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

- [x] `public/app.js` modified with all required changes
- [x] `public/styles.css` updated with `.selective-hidden` rule
- [x] Commit `63da163` exists and contains the implementation
- [x] No accidental file deletions
- [x] JS syntax validated with `node --check`
