---
phase: 09-card-selection-interaction
plan: 02
subsystem: canvas-ui
wave: 2
tags: [dialog, selection, toast, i18n, accessibility]
dependency_graph:
  requires:
    - 09-01
  provides:
    - SEL-01
    - SEL-02
  affects:
    - public/app.js
    - public/styles.css
    - public/index.html
tech-stack:
  added: []
  patterns:
    - "State-driven DOM mutation for enable/disable"
    - "CSS transition-based toast animation"
    - "i18n placeholder interpolation"
key-files:
  created: []
  modified:
    - public/app.js
    - public/styles.css
    - public/index.html
decisions:
  - "Toast uses opacity/transform transition instead of .hidden class to avoid conflict with existing display:none !important rule"
  - "Toast colors are theme-independent (rgba dark bg + white text) to ensure readability in both light and dark modes"
  - "keydown listener filters for printable characters only (event.key.length === 1) to avoid intercepting Tab/Enter/arrows"
  - "focus listener on disabled input serves as fallback for browsers that allow focus on disabled inputs"
  - "Timer deduplication via clearTimeout prevents rapid key press spam from accumulating timers (mitigates T-09-04)"
  - "chatbar.no-selection class provides optional subtle opacity reduction when no card is selected"
metrics:
  duration: "~2 min"
  completed_date: "2026-04-26"
  tasks: 3
  files_modified: 3
---

# Phase 09 Plan 02: Dialog Binding and Validation Summary

**One-liner:** Bind chat input enable/disable to card selection state with transient toast hint and i18n-aware placeholder.

## What Was Built

- **Toast notification system**: A fixed-position toast element (`#selectionToast`) that fades in/out with a slide animation when the user tries to interact with the disabled chat input.
- **Dialog state binding**: `updateDialogState()` enables/disables `#chatInput` and `#chatSendButton` based on `state.selectedNodeId`, and updates the placeholder to show the selected card's title.
- **Input event guards**: `keydown` listener intercepts printable character keys on a disabled input to show the toast; `focus` listener provides a fallback hint.
- **Disabled styling**: `.chat-input:disabled` and `.chat-send-button:disabled` rules provide clear visual feedback, including a dark-mode-aware override.
- **i18n expansion**: Added `chat.placeholderWithSelection` and `chat.selectCardFirst` keys for both zh and en.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| mitigate: T-09-04 | public/app.js | Rapid key presses could spam toast timers; mitigated by `clearTimeout(toastTimer)` before each `setTimeout` |

## Known Stubs

None.

## Self-Check: PASSED

- [x] `public/index.html` contains `#selectionToast` element
- [x] `public/styles.css` contains `.selection-toast`, `.selection-toast.visible`, `.chat-input:disabled`, `.chat-send-button:disabled`, and dark mode override
- [x] `public/app.js` contains `updateDialogState()`, `showSelectionToast()`, i18n keys, and event listeners
- [x] Commits verified: `66860e3`, `d8a6df6`
