---
phase: 11-research-mode
plan: 03
subsystem: frontend
tags: [modal, references, research-mode, ui]
dependency_graph:
  requires: [11-01, 11-02]
  provides: []
  affects: [public/index.html, public/styles.css, public/app.js]
tech-stack:
  added: []
  patterns: [modal pattern reuse, i18n t() helper, dark mode media queries]
key-files:
  created: []
  modified:
    - public/index.html
    - public/styles.css
    - public/app.js
decisions:
  - "Double-click on option nodes with references opens reference modal; nodes without references still toggle selection"
  - "Reused existing image-viewer modal pattern (backdrop, close button, Escape key) for consistency"
  - "Reference modal uses inline style display:none/show instead of hidden class to avoid CSS specificity conflicts with modal flex layout"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-27"
---

# Phase 11 Plan 03: Reference materials modal Summary

## One-liner
Implemented a reference materials modal that opens on double-clicking option nodes carrying explore-generated references, displaying title, URL, description, and type badges with clickable external links.

## What was built

- **Reference modal markup** (`public/index.html`): Added `#referenceModal` with backdrop, close button, title, and `.reference-list` container. Hidden by default.
- **Reference modal styles** (`public/styles.css`): Full styling consistent with the image viewer modal — 640px max-width, 80vh max-height, scrollable list, card-like items with type badges, blue links, dark mode support, and responsive mobile breakpoints.
- **Modal logic and wiring** (`public/app.js`):
  - `openReferenceModal(nodeId)` — finds node, reads `node.option.references`, renders items with badge, link (target="_blank" rel="noopener noreferrer"), and description.
  - `closeReferenceModal()` — hides modal and clears the list.
  - Double-click handler in `registerNode()` prioritizes opening the reference modal when `node.option.references` exists; otherwise falls back to `selectNode()`.
  - Escape key, backdrop click, and close button all close the modal.
  - Added i18n keys `reference.title` and `reference.empty` for both zh and en.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None beyond those already documented in the plan's threat model. External links open with `noopener noreferrer` as specified.

## Self-Check: PASSED

- [x] `public/index.html` contains `#referenceModal`
- [x] `public/styles.css` contains `.reference-modal`, `.reference-list`, `.reference-item`, `.ref-type-badge`
- [x] `public/app.js` contains `openReferenceModal`, `closeReferenceModal`, reference modal wiring, and i18n strings
- [x] All three tasks committed individually
