---
phase: 16-menu-cleanup-new-card
plan: 01
subsystem: public
tags: [menu, cleanup, commands]
dependency_graph:
  requires: []
  provides: [cleaned-command-menu]
  affects: [public/app.js]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified: [public/app.js]
decisions:
  - "Keep zoomBy/resetView functions since they are used by other code paths (buttons, wheel zoom)"
  - "Keep translation keys for removed commands since they may be used by sidebar nav labels"
metrics:
  duration_seconds: 60
  completed: "2026-05-02"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 16 Plan 01: Remove Commands from / Menu Summary

Removed zoom-in, zoom-out, history browser, and settings from the slash command menu, leaving 6 canvas-relevant commands.

## Tasks Completed

### Task 1: Remove zoom-in, zoom-out, history, settings from getWorkbenchCommands and clean up handlers

**Commit:** 4a539b1
**Files modified:** `public/app.js`

**Changes:**
- Removed 4 command entries from `getWorkbenchCommands()`: zoom-in, zoom-out, history, settings
- Removed dead handler branches from `executeWorkbenchCommand()` for the 4 removed commands
- Remaining commands: save, export, import, sessions, fit, arrange (6 total)
- `zoomBy()` and `resetView()` functions preserved (used by zoom buttons and wheel zoom)

## Verification

- `getWorkbenchCommands()` returns exactly 6 commands
- No `id: "zoom-in"`, `id: "zoom-out"`, `id: "history"`, or `id: "settings"` in command array
- No handler branches for removed commands in `executeWorkbenchCommand()`
- All 6 remaining commands have working handlers
- `zoomBy` and `resetView` functions still exist in the codebase

## Decisions Made

1. **Keep translation keys** for removed commands (`command.zoomIn`, `command.zoomOut`, `command.history`, `command.settings` and their `*Desc` variants) since they may be used by sidebar nav labels. Removing them is out of scope.

2. **Keep `zoomBy` and `resetView` functions** since they are called from other code paths (zoom buttons at lines 1097-1098, wheel zoom at line 1302, and canvas actions at lines 2629-2630).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.
