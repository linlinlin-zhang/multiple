---
phase: 17-connection-lines-junction-nodes
plan: 02
status: complete
completed: "2026-05-02"
requirements: [MC-03]
---

# Plan 17-02 Summary: Drag-to-Connect Interaction

## What Changed

### public/app.js
- Updated `registerNode()` to call `addEdgeHandles()` for non-junction nodes
- Added `addEdgeHandles(element, nodeId)` function: creates right and left edge handle elements with pointerdown handlers
- Added `startConnection(event, fromNodeId, side)` function: initiates drag mode with temporary SVG line following cursor
- Added `createConnection(fromId, toId)` function: validates no duplicates, pushes link to state.links, calls handleNewConnection stub
- Added `connectionState` variable to track active connection drag

## Requirements Verified
- MC-03: User can drag from a card's edge to another card to create a visible connection line
