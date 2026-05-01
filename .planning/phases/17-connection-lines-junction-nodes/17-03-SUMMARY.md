---
phase: 17-connection-lines-junction-nodes
plan: 03
status: complete
completed: "2026-05-02"
requirements: [MC-04, MC-06, MC-07]
---

# Plan 17-03 Summary: Junction Node Logic

## What Changed

### public/app.js
- Replaced `handleNewConnection` stub with full implementation: detects existing junctions for both cards, routes to create/merge/add logic
- Added `createJunctionAtMidpoint(cardAId, cardBId)`: calculates midpoint, creates junction node, adds both cards, rewires links
- Added `addCardToJunction(junctionId, cardId)`: checks capacity (max 5), adds card to junction, rewires links, shows toast on rejection
- Added `mergeJunctions(junctionAId, junctionBId)`: combines two junctions if within capacity, deletes empty junction
- Added `rewireLinksThroughJunction(junctionId)`: removes direct card-to-card links, adds card-to-junction links
- Added translation keys: `junction.maxCapacity` and `junction.mergeExceedsCapacity` (zh + en)

## Requirements Verified
- MC-04: When two cards are connected, a junction node appears at the connection midpoint
- MC-06: When a third card connects to an existing pair, it joins the junction's group
- MC-07: Maximum 5 cards per junction enforced with toast message
