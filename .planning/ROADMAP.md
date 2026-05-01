# ORYZAE Image Board — Roadmap

**Current Milestone:** v2.0 Multi-Card Canvas Interaction
**Granularity:** Standard
**Phases:** 3 (Phases 16–18)
**Defined:** 2026-05-02

---

## Milestones

- ✅ **v1.0 Persistence & History** — Phases 1-4 (shipped 2026-04-26) · [Details](./milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Canvas Intelligence & Rich Input** — Phases 5-8 (shipped 2026-04-26) · [Details](./milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Interactive Canvas & Deep Analysis** — Phases 9-12 (shipped 2026-04-27) · [Details](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Material Library** — Phases 13-15 (shipped 2026-05-01) · [Details](./milestones/v1.3-ROADMAP.md)
- 🚧 **v2.0 Multi-Card Canvas Interaction** — Phases 16-18 (current)

---

## Phases

- [x] **Phase 16: Menu Cleanup & New Card** — Remove zoom/history/settings from `/` menu; add "New Card" command that creates a deletable card on canvas
- [x] **Phase 17: Connection Lines & Junction Nodes** — Drag-to-connect cards with SVG lines; junction nodes at connection points (max 5 cards, distinct visual style)
- [ ] **Phase 18: Blueprint Modal** — Double-click junction node opens modal showing connected cards; supports drag positioning and drawing relationship lines

---

## Phase Details

### Phase 16: Menu Cleanup & New Card
**Goal**: The `/` command menu is streamlined and users can create additional deletable cards on the canvas
**Depends on**: Nothing
**Requirements**: MC-01, MC-02, MC-13, MC-14, MC-15, MC-16
**Success Criteria** (what must be TRUE):
  1. Typing `/` no longer shows "zoom-in", "zoom-out", "history browser", or "settings" commands
  2. Typing `/` shows a "New Card" command in the command menu
  3. Selecting "New Card" creates a new card node on the canvas (distinct from the source card)
  4. The new card has a delete button visible on hover; clicking it removes the card from the canvas
  5. The source card (id="source") still cannot be deleted
**Plans:** 2 plans
Plans:
- [x] 16-01-PLAN.md — Remove zoom-in, zoom-out, history, settings from `/` menu
- [x] 16-02-PLAN.md — Add "New Card" command and card creation logic
**UI hint**: yes

### Phase 17: Connection Lines & Junction Nodes
**Goal**: Users can draw connection lines between cards, and junction nodes appear where lines meet to represent card groupings
**Depends on**: Phase 16
**Requirements**: MC-03, MC-04, MC-05, MC-06, MC-07
**Success Criteria** (what must be TRUE):
  1. User can drag from a card's edge to another card to create a visible connection line (Bezier curve in SVG `#linkLayer`)
  2. When two cards are connected, a junction node appears at the connection point between them
  3. Junction nodes are visually distinct from regular cards (different color and shadow)
  4. When a third card connects to either card in an existing pair, it automatically joins that junction node's group
  5. Attempting to connect a 6th card to a junction node is rejected (max 5 cards per junction)
**Plans:** 3 plans
Plans:
- [x] 17-01-PLAN.md — Junction node data model and visual style (MC-05)
- [x] 17-02-PLAN.md — Drag-to-connect interaction (MC-03)
- [x] 17-03-PLAN.md — Junction node logic: auto-create, auto-join, max capacity (MC-04, MC-06, MC-07)
**UI hint**: yes

### Phase 18: Blueprint Modal
**Goal**: Users can double-click a junction node to open a blueprint modal where they arrange cards and define relationships
**Depends on**: Phase 17
**Requirements**: MC-08, MC-09, MC-10, MC-11, MC-12
**Success Criteria** (what must be TRUE):
  1. Double-clicking a junction node opens a blueprint modal overlay
  2. The modal displays all cards connected to that junction node
  3. User can drag cards to reposition them within the modal
  4. User can draw lines between cards inside the modal to define upstream/downstream or parallel relationships
  5. Relationship lines defined in the modal are usable as context for subsequent exploration or generation actions
**Plans**: TBD
**UI hint**: yes

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| MC-01 | Phase 16 | Done |
| MC-02 | Phase 16 | Done |
| MC-03 | Phase 17 | Done |
| MC-04 | Phase 17 | Done |
| MC-05 | Phase 17 | Done |
| MC-06 | Phase 17 | Done |
| MC-07 | Phase 17 | Done |
| MC-08 | Phase 18 | Pending |
| MC-09 | Phase 18 | Pending |
| MC-10 | Phase 18 | Pending |
| MC-11 | Phase 18 | Pending |
| MC-12 | Phase 18 | Pending |
| MC-13 | Phase 16 | Done |
| MC-14 | Phase 16 | Done |
| MC-15 | Phase 16 | Done |
| MC-16 | Phase 16 | Done |

**Coverage: 16/16 requirements mapped (100%)**

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 16. Menu Cleanup & New Card | 2/2 | Done | 2026-05-02 |
| 17. Connection Lines & Junction Nodes | 3/3 | Done | 2026-05-02 |
| 18. Blueprint Modal | 0/0 | Not started | - |

---

*Created: 2026-05-02*
