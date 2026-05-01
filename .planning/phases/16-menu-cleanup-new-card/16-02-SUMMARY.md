---
phase: 16-menu-cleanup-new-card
plan: 02
subsystem: canvas
tags: [feature, canvas, multi-card, command-menu]
depends_on: [16-01]
requirements: [MC-01, MC-02]
key_files:
  created: []
  modified:
    - public/app.js
    - public/styles.css
tech_stack:
  added: []
  patterns: [new-card-node creation pattern, collision-avoidant positioning]
decisions: []
metrics:
  duration: ~5m
  completed: "2026-05-01T17:35:00Z"
  tasks: 2
  files: 2
---

# Phase 16 Plan 02: New Card Summary

New Card command added to `/` menu with `createNewCardNode()` function that places deletable, draggable blank cards on the canvas with dashed-border styling.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Add New Card translation keys and command entry | 365d65a | Done |
| 2 | Implement createNewCardNode function and new card styles | d4edd38 | Done |

## What Was Built

### Task 1: Translation keys and command entry

Added `command.newCard` and `command.newCardDesc` translation keys to both `zh` and `en` dictionaries in `public/app.js`. Registered a new command entry `{ id: "new-card", icon: "N", ... }` in `getWorkbenchCommands()` and wired the handler in `executeWorkbenchCommand()` to call `createNewCardNode()`.

### Task 2: createNewCardNode function and CSS

Implemented `createNewCardNode()` in `public/app.js` (after `createOptionNode`). The function:
- Generates a unique ID with `new-card-{timestamp}` pattern
- Positions the card offset from the source node with jitter-based collision avoidance (up to 10 attempts)
- Creates a `<section class="node new-card-node">` element with eyebrow, title, and description
- Calls `registerNode()` which adds the delete button and collapse control automatically
- Calls `makeDraggable()`, `applyCollapseState()`, `updateCounts()`, `drawLinks()`, and `autoSave()`
- Does NOT set `generated: true` (so new cards don't affect the options/generated counts)

Added `.new-card-node` CSS styles with dashed border to visually distinguish blank cards from solid-bordered option cards.

## Verification

All acceptance criteria met:
- `/` menu includes "New Card" command with icon "N"
- `executeWorkbenchCommand("new-card")` calls `createNewCardNode()`
- `createNewCardNode()` creates element with class `new-card-node`, registers via `registerNode()`
- Delete button appears on hover (standard `.node-delete-btn` behavior from `registerNode()`)
- `canDeleteNode()` returns true for new card IDs (not "source", no children)
- `.new-card-node` CSS has dashed border styling
- `autoSave()` called so new cards persist across sessions

## Stubs

None. The empty `description.textContent = ""` is intentional — new cards are blank by design.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes. The function only manipulates DOM and in-memory state via existing mechanisms.

## Deviations from Plan

None. Plan executed exactly as written.

## Known Issues

None.

## Self-Check: PASSED

- public/app.js: FOUND
- public/styles.css: FOUND
- .planning/phases/16-menu-cleanup-new-card/16-02-SUMMARY.md: FOUND
- Commit 365d65a (Task 1): FOUND
- Commit d4edd38 (Task 2): FOUND
