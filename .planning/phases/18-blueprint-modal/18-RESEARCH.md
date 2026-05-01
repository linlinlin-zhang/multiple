# Phase 18: Blueprint Modal - Research

**Researched:** 2026-05-02
**Domain:** Modal UI, SVG interaction, relationship data model, vanilla JS canvas patterns
**Confidence:** HIGH

## Summary

Phase 18 adds a blueprint modal that opens when double-clicking a junction node. Inside the modal, users see all cards connected to that junction, can drag them into an arrangement, draw relationship lines between them (upstream/downstream, parallel), and use those relationships as AI context.

The codebase already has strong foundations: a modal pattern (reference modal), a drag system (`makeDraggable`), SVG link drawing (`drawLinks`/`curvePath`), edge-handle connection drawing, and junction state management (`state.junctions`). The implementation adapts these existing patterns for a contained modal environment rather than building from scratch.

**Primary recommendation:** Build the blueprint modal as a fixed overlay with an internal drag-and-connect mini-canvas, reusing the existing pointer-event drag pattern and SVG Bezier curve drawing. Store blueprint data (card positions + relationship lines) in a new `state.blueprints` Map keyed by junction ID.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MC-08 | Double-click junction node opens blueprint modal | Intercept in `registerNode` dblclick handler; junction nodes have `isJunction: true` flag |
| MC-09 | Modal shows all connected cards | Read `state.junctions.get(junctionId).connectedCardIds`; render card thumbnails/clones |
| MC-10 | Drag cards inside modal | Adapt `makeDraggable` pointer-event pattern for modal-local coordinates |
| MC-11 | Draw lines between cards in modal | Reuse `curvePath` SVG Bezier pattern + pointer-based drag-to-connect |
| MC-12 | Relationships usable as AI context | Extend `buildSelectedNodeContext()` to include blueprint relationship data |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Modal overlay rendering | Browser / Client | -- | DOM-based modal, no server involvement |
| Card drag positioning | Browser / Client | -- | Pointer events, local coordinate transforms |
| SVG line drawing | Browser / Client | -- | Same `curvePath` pattern as main board |
| Blueprint data persistence | Browser / Client | API / Backend | Local `state.blueprints` Map; save with session |
| Relationship context for AI | API / Backend | Browser / Client | Injected into chat systemContext before API call |

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES2022+ | All modal logic | Zero-runtime-dep constraint from CLAUDE.md |
| SVG | -- | Relationship lines in modal | Already used for `#linkLayer` Bezier curves |
| CSS variables | -- | Modal theming | Already used project-wide; dark mode via `[data-theme="dark"]` |

### No new dependencies required

This phase uses only existing browser APIs and patterns already in the codebase. No npm packages needed.

**Installation:** None required.

## Architecture Patterns

### System Architecture Diagram

```
User double-clicks junction node
        |
        v
  registerNode dblclick handler
  (checks isJunction flag)
        |
        v
  openBlueprintModal(junctionId)
        |
        +---> Read state.junctions.get(junctionId).connectedCardIds
        +---> Read state.blueprints.get(junctionId) for saved positions/lines
        +---> Render modal overlay (fixed position, z-index: 200+)
        +---> Render card thumbnails at saved positions
        +---> Render SVG relationship lines
        |
        v
  [Inside Modal]
  +-- Drag cards (pointer events, modal-local coords)
  +-- Draw relationship lines (edge-handle drag to target card)
  +-- Select relationship type (upstream/downstream/parallel)
  |
  v
  User closes modal or triggers AI exploration
        |
        +---> Save blueprint data to state.blueprints
        +---> autoSave() persists with session
        +---> If "explore" action: inject relationships into chat systemContext
```

### Recommended Project Structure

No new files. All changes in existing files:

```
public/
  app.js          -- openBlueprintModal(), closeBlueprintModal(),
                     makeModalDraggable(), drawBlueprintLinks(),
                     state.blueprints Map, dblclick handler update
  styles.css      -- .blueprint-modal, .blueprint-card, .blueprint-link styles
  index.html      -- <div id="blueprintModal"> template (optional; can be built in JS)
```

### Pattern 1: Blueprint Modal Overlay

**What:** A fixed-position modal overlay containing a scrollable/pannable mini-workspace where cards are arranged.

**When to use:** Always (this is the core of the phase).

**Example** (adapted from existing reference modal pattern):
```javascript
// Source: public/app.js openReferenceModal() pattern (line 4188)
function openBlueprintModal(junctionId) {
  const junction = state.junctions.get(junctionId);
  if (!junction) return;

  const modal = document.querySelector("#blueprintModal");
  const canvas = modal.querySelector(".blueprint-canvas");
  canvas.replaceChildren(); // Clear previous

  // Render each connected card as a mini card in the modal
  for (const cardId of junction.connectedCardIds) {
    const node = state.nodes.get(cardId);
    if (!node) continue;
    const cardEl = createBlueprintCard(cardId, node);
    canvas.appendChild(cardEl);
  }

  // Restore saved positions and lines
  const blueprint = state.blueprints.get(junctionId);
  if (blueprint) {
    restoreBlueprintPositions(canvas, blueprint);
    drawBlueprintLinks(canvas, blueprint.relationships);
  }

  modal.style.display = "";
  modal.dataset.junctionId = junctionId;
  document.body.style.overflow = "hidden";
}
```

### Pattern 2: Modal-Internal Drag

**What:** Adapt the existing `makeDraggable` pattern for modal-local coordinates (no board transform division needed).

**When to use:** For each card rendered inside the blueprint modal.

**Example:**
```javascript
// Source: public/app.js makeDraggable() pattern (line 4657)
function makeModalDraggable(element, cardId, canvas) {
  let start = null;

  element.addEventListener("pointerdown", (event) => {
    const interactive = event.target.closest("button, input, label");
    if (interactive) return;
    start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      elX: parseFloat(element.style.left) || 0,
      elY: parseFloat(element.style.top) || 0
    };
    element.classList.add("dragging");
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    element.style.left = `${start.elX + dx}px`;
    element.style.top = `${start.elY + dy}px`;
    drawBlueprintLinks(canvas); // Redraw lines on drag
  });

  element.addEventListener("pointerup", () => {
    start = null;
    element.classList.remove("dragging");
  });
}
```

### Pattern 3: Relationship Line Drawing Inside Modal

**What:** SVG overlay inside the modal canvas for drawing Bezier curves between blueprint cards.

**When to use:** After cards are positioned; redraw on drag.

**Example:**
```javascript
// Source: public/app.js curvePath() (line 4736) and drawLinks() (line 4698)
function drawBlueprintLinks(canvas) {
  const svg = canvas.querySelector(".blueprint-svg");
  if (!svg) return;
  const fragments = document.createDocumentFragment();

  const relationships = getBlueprintRelationships(canvas);
  for (const rel of relationships) {
    const fromCard = canvas.querySelector(`[data-card-id="${rel.from}"]`);
    const toCard = canvas.querySelector(`[data-card-id="${rel.to}"]`);
    if (!fromCard || !toCard) continue;

    const start = getCardAnchor(fromCard, "right");
    const end = getCardAnchor(toCard, "left");
    const path = curvePath(start, end); // Reuse existing function

    const line = svgElement("path", {
      d: path,
      class: "blueprint-link",
      "data-relationship": rel.type // "upstream", "downstream", "parallel"
    });
    fragments.appendChild(line);
  }

  svg.replaceChildren(fragments);
}
```

### Pattern 4: Drag-to-Connect Inside Modal

**What:** Edge handles on blueprint cards allow drawing a line to another card, defining a relationship.

**When to use:** When user wants to define a new relationship between cards.

**Example:**
```javascript
// Source: public/app.js startConnection() pattern (line 3349)
function startBlueprintConnection(event, fromCardId, canvas) {
  event.stopPropagation();
  event.preventDefault();

  const svg = canvas.querySelector(".blueprint-svg");
  const dragLine = svgElement("path", { class: "blueprint-drag-line" });
  svg.appendChild(dragLine);

  const fromCard = canvas.querySelector(`[data-card-id="${fromCardId}"]`);
  const startPoint = getCardAnchor(fromCard, "right");

  const onPointerMove = (moveEvent) => {
    const canvasRect = canvas.getBoundingClientRect();
    const endX = moveEvent.clientX - canvasRect.left + canvas.scrollLeft;
    const endY = moveEvent.clientY - canvasRect.top + canvas.scrollTop;
    dragLine.setAttribute("d", curvePath(startPoint, { x: endX, y: endY }));
  };

  const onPointerUp = (upEvent) => {
    dragLine.remove();
    // Find target card under pointer
    const targetEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
      ?.closest("[data-card-id]");
    const targetId = targetEl?.dataset.cardId;
    if (targetId && targetId !== fromCardId) {
      showRelationshipTypePicker(fromCardId, targetId, canvas);
    }
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}
```

### Anti-Patterns to Avoid

- **Don't create a separate HTML file for the modal.** Use a `<div>` in index.html or build it dynamically in app.js, consistent with the existing reference modal and settings panel patterns.
- **Don't use CSS transforms for modal card positioning.** Use absolute positioning with `left`/`top` like the main board cards. This avoids nested transform coordinate issues.
- **Don't use canvas 2D for relationship lines.** Use SVG, consistent with the existing `#linkLayer` pattern. SVG allows CSS styling, theming, and pointer events per-element.
- **Don't store blueprint data only in DOM.** Store positions and relationships in `state.blueprints` so they persist with `autoSave()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG path generation | Custom Bezier math | Existing `curvePath()` function | Already tested, produces correct control points |
| SVG element creation | `document.createElement("svg:...")` | Existing `svgElement()` helper | Handles namespace correctly |
| Modal close on backdrop click | Custom event delegation | Existing `[data-close-modal]` pattern | Consistent with reference modal, image viewer |
| Toast notifications | Custom popup | Existing `showToast()` | Consistent UX |
| i18n strings | Hardcoded Chinese/English | Existing `t()` function with locale keys | Supports zh/en toggle |

**Key insight:** The codebase already solves SVG drawing, pointer-event dragging, and modal management. Reuse these patterns rather than introducing new approaches.

## Common Pitfalls

### Pitfall 1: Coordinate System Mismatch in Modal
**What goes wrong:** Drag positions calculated relative to viewport instead of modal canvas, causing cards to jump or misalign.
**Why it happens:** The main board uses `board.getBoundingClientRect()` with `state.view.scale` division, but the modal has no scale transform.
**How to avoid:** Use `canvas.getBoundingClientRect()` for coordinate conversion in the modal. Do NOT divide by `state.view.scale` -- the modal canvas is 1:1 scale.
**Warning signs:** Cards jump to wrong position on first drag; lines don't connect to cards.

### Pitfall 2: SVG Layer Pointer Events
**What goes wrong:** SVG overlay captures pointer events, preventing card dragging.
**Why it happens:** SVG element sits on top of cards in z-order.
**How to avoid:** Set `pointer-events: none` on the SVG container, same as existing `.link-layer` (line 392 in styles.css). Only individual relationship line paths should have `pointer-events: auto` for selection/click.
**Warning signs:** Cards can't be dragged; clicks go "through" cards to SVG.

### Pitfall 3: Blueprint Data Not Persisted
**What goes wrong:** User arranges cards and draws lines, closes modal, reopens -- everything is gone.
**Why it happens:** Blueprint state only exists in DOM, not in `state.blueprints` or session save payload.
**How to autoSave:** After every drag-end and line creation/deletion, call `autoSave()`. Include `state.blueprints` in `computeStateHash()` and `prepareStateForSave()`.
**Warning signs:** Lost work on modal close or page refresh.

### Pitfall 4: Junction Nodes Not Persisted Across Sessions
**What goes wrong:** Junction nodes and their `connectedCardIds` disappear on session reload.
**Why it happens:** Currently, `state.junctions` is populated only during live connection events, NOT during `loadSession()`. The links are saved, but junction metadata is not.
**How to avoid:** This is a pre-existing issue from Phase 17. During `loadSession()`, after links are restored, scan for `kind: "junction"` links to reconstruct `state.junctions` entries. Alternatively, add junction data to the save payload. This is a prerequisite for blueprint modal to work across sessions.
**Warning signs:** Blueprint modal can't find junction data after page refresh.

### Pitfall 5: Double-Click Conflicts with Single-Click Selection
**What goes wrong:** Double-clicking a junction node triggers both selection (single click) and modal open (double click), causing flicker.
**Why it happens:** The `dblclick` event fires after two `click` events.
**How to avoid:** In the `registerNode` dblclick handler, junction nodes should open the blueprint modal AND NOT call `selectNode()`. The handler already has early-return logic for reference modals; add the same for junctions.
**Warning signs:** Modal opens briefly then closes; node selection state flickers.

## Code Examples

### Existing Modal Toggle Pattern (Reference Modal)

```javascript
// Source: public/app.js line 4188-4233
function openReferenceModal(nodeId) {
  // ... populate content ...
  if (referenceModal) {
    referenceModal.style.display = "";
    document.body.style.overflow = "hidden";
    const closeBtn = referenceModal.querySelector(".modal-close");
    if (closeBtn) closeBtn.focus();
  }
}

function closeReferenceModal() {
  if (referenceModal) {
    referenceModal.style.display = "none";
    document.body.style.overflow = "";
  }
}
```

### Existing Drag Pattern (Main Board)

```javascript
// Source: public/app.js line 4657-4696
function makeDraggable(element, id) {
  let start = null;
  element.addEventListener("pointerdown", (event) => {
    const interactive = event.target.closest("button, input, label");
    if (interactive && event.target.tagName !== "SECTION") return;
    const node = state.nodes.get(id);
    if (!node) return;
    start = {
      pointerId: event.pointerId,
      x: event.clientX, y: event.clientY,
      nodeX: node.x, nodeY: node.y
    };
    element.classList.add("dragging");
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (!start) return;
    const node = state.nodes.get(id);
    node.x = start.nodeX + (event.clientX - start.x) / state.view.scale;
    node.y = start.nodeY + (event.clientY - start.y) / state.view.scale;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    drawLinks();
  });
  element.addEventListener("pointerup", () => {
    start = null;
    element.classList.remove("dragging");
    autoSave();
  });
}
```

### Existing SVG Bezier Curve

```javascript
// Source: public/app.js line 4736-4743
function curvePath(start, end) {
  const distance = Math.max(120, Math.abs(end.x - start.x) * 0.42);
  const c1x = start.x + distance;
  const c2x = end.x - distance;
  const c1y = start.y + (end.y - start.y) * 0.08;
  const c2y = end.y - (end.y - start.y) * 0.08;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}
```

### Existing Link Type Kinds

```javascript
// From state.links usage across app.js:
// "analysis"   - source -> analysis
// "option"     - analysis -> option cards
// "connection" - user-drawn card-to-card connections
// "junction"   - card -> junction node (rewired)
// "deep-think" - deep-think branch links
// NEW: "blueprint" - relationships defined in blueprint modal
```

### Integration: Injecting Blueprint Context into AI Chat

```javascript
// Extends buildSelectedNodeContext() at line 2061
function buildSelectedNodeContext() {
  // ... existing code ...
  const context = { /* existing fields */ };

  // NEW: If selected node is part of a junction, include blueprint
  const junctionId = findJunctionForCard(nodeId);
  if (junctionId) {
    const blueprint = state.blueprints.get(junctionId);
    if (blueprint?.relationships?.length > 0) {
      context.blueprint = {
        junctionId,
        relationships: blueprint.relationships.map(r => ({
          from: r.from, to: r.to, type: r.type
        }))
      };
    }
  }

  return context;
}
```

## Data Model

### New State Property

```javascript
// Add to state object (line 83)
const state = {
  // ... existing ...
  blueprints: new Map()
  // junctionId -> {
  //   positions: { cardId: { x, y } },
  //   relationships: [
  //     { from: cardId, to: cardId, type: "upstream" | "downstream" | "parallel" }
  //   ]
  // }
};
```

### Relationship Types

| Type | Meaning | Visual Style |
|------|---------|--------------|
| `upstream` | `from` depends on / derives from `to` | Solid arrow, blue |
| `downstream` | `from` feeds into / informs `to` | Solid arrow, cyan |
| `parallel` | `from` and `to` are alternatives / siblings | Dashed line, gray |

### Persistence Integration

```javascript
// In computeStateHash() at line 4926, add:
blueprints: Array.from(state.blueprints.entries())

// In prepareStateForSave() at line 4942, add:
payload.blueprints = Object.fromEntries(state.blueprints);

// In loadSession() after link restoration, add:
if (data.blueprints) {
  state.blueprints = new Map(Object.entries(data.blueprints));
}
```

## CSS Design Tokens

### New CSS Classes (in styles.css)

```css
/* Blueprint modal -- follows .reference-modal pattern */
.blueprint-modal { /* fixed overlay, z-index: 200 */ }
.blueprint-modal .modal-backdrop { /* same as .reference-modal .modal-backdrop */ }
.blueprint-modal .modal-content { /* larger: 90vw x 85vh */ }
.blueprint-canvas { /* position: relative, overflow: auto, background: var(--ice) */ }
.blueprint-svg { /* position: absolute, inset: 0, pointer-events: none */ }
.blueprint-card { /* position: absolute, similar to .option-node but smaller */ }
.blueprint-card .edge-handle { /* reuse existing .edge-handle styles */ }
.blueprint-link { /* stroke: var(--ps-blue), similar to .link */ }
.blueprint-drag-line { /* stroke-dasharray, similar to .drag-line */ }
.blueprint-link.parallel { /* stroke-dasharray: 6 4; stroke: var(--muted) */ }
.blueprint-relationship-picker { /* small popup for selecting relationship type */ }
```

### Dark Mode

All blueprint modal styles should use CSS variables (`var(--paper)`, `var(--ice)`, `var(--ps-blue)`, etc.) so they automatically adapt to dark mode via the existing `html[data-theme="dark"]` variable overrides.

## Common Pitfalls (Continued)

### Pitfall 6: Modal Content Too Large for Screen
**What goes wrong:** When a junction has 5 cards, the modal content overflows or cards overlap.
**Why it happens:** Fixed card sizes don't account for modal viewport.
**How to avoid:** Auto-arrange cards in a grid or circle layout when first opening the modal. Use the modal's scroll/pan for overflow. Default card spacing: 200px horizontal, 160px vertical.
**Warning signs:** Cards overlap on open; scrollbar appears immediately.

### Pitfall 7: Relationship Lines Survive Card Deletion
**What goes wrong:** User deletes a card from the canvas, but blueprint relationships still reference it.
**Why it happens:** `deleteNode()` doesn't clean up blueprint data.
**How to avoid:** In `deleteNode()`, iterate `state.blueprints` and remove any relationship entries referencing the deleted card ID. If a junction's `connectedCardIds` becomes empty, delete the blueprint entry too.
**Warning signs:** Console errors when opening blueprint modal; orphaned relationship lines.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Junction nodes not persisted | Junction links saved as `kind: "junction"` | Phase 17 | Junction metadata (connectedCardIds) still not persisted -- needs fix |
| Double-click only selects nodes | Double-click opens reference modal for nodes with references | Phase 11 | Blueprint modal extends this pattern for junction nodes |
| Links rendered in main `#linkLayer` | Blueprint links rendered in modal-local SVG | Phase 18 (new) | Isolated SVG per modal, no interference with main board |

**Deprecated/outdated:**
- None identified. This phase extends existing patterns.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Junction nodes are NOT currently persisted across sessions (connectedCardIds lost on reload) | Pitfall 4 | Blueprint modal won't work without fixing junction persistence first; may need a sub-task |
| A2 | Relationship type picker is a small popup (3 buttons) rather than a dropdown or context menu | Data Model | UX design choice; low risk, easy to change |
| A3 | Blueprint positions are stored as absolute px values relative to modal canvas, not percentages | Data Model | If modal resizes, positions won't scale; acceptable for fixed-size modal |
| A4 | No server-side changes needed -- blueprint data stored in existing session JSON payload | Persistence Integration | If session payload has size limits, large blueprints could fail; unlikely given current payload sizes |
| A5 | `curvePath()` function produces acceptable curves for modal-scale distances (typically 150-400px apart) | Pattern 3 | May need distance tuning; `Math.max(120, ...)` minimum might be too large for tight modal layouts |

## Open Questions

1. **Junction persistence prerequisite**
   - What we know: Junction `connectedCardIds` are only in `state.junctions` (in-memory). Links with `kind: "junction"` ARE saved, but the junction metadata (which cards belong together) is not.
   - What's unclear: Whether Phase 18 should fix junction persistence, or whether it's a separate prerequisite phase.
   - Recommendation: Include a "restore junctions from links" step in Phase 18's first plan. Scan saved links for `kind: "junction"` entries and reconstruct `state.junctions` on load. This is a small addition (~20 lines) that unblocks the entire phase.

2. **Card representation inside modal**
   - What we know: Cards on the main board are full DOM elements (318px wide option nodes, 360px generated nodes).
   - What's unclear: Should the blueprint modal show full-size cards, thumbnails, or simplified card representations?
   - Recommendation: Show simplified cards (title + small image thumbnail if generated, ~200px wide) to fit 5 cards comfortably. Full-size cards would require excessive scrolling.

3. **Relationship type selection UX**
   - What we know: The connection line is drawn first, then the type must be specified.
   - What's unclear: Should the type picker appear on line drop, or should there be a default type with the option to change?
   - Recommendation: Show a small 3-button popup (upstream / downstream / parallel) at the drop point. Default to "upstream" if dismissed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Server runtime | -- | -- | -- |
| PostgreSQL | Session persistence | -- | -- | -- |
| Browser (Chrome/Edge) | SVG + pointer events | -- | -- | -- |

**Note:** This phase is entirely client-side (public/app.js, public/styles.css, public/index.html). No new server endpoints or database schema changes are needed. Blueprint data is stored within the existing session JSON payload.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual testing (vanilla JS, no test framework detected) |
| Config file | N/A |
| Quick run command | `npm run dev` then manual interaction |
| Full suite command | Manual verification of all 5 success criteria |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MC-08 | Double-click junction opens modal | manual | Open browser, create 2+ connected cards, dblclick junction | N/A |
| MC-09 | Modal shows connected cards | manual | Verify all connected cards appear in modal | N/A |
| MC-10 | Drag cards inside modal | manual | Drag cards, verify positions update | N/A |
| MC-11 | Draw lines between cards | manual | Use edge handles to draw lines, verify SVG paths | N/A |
| MC-12 | Relationships usable as AI context | manual | Define relationships, send chat message, verify context includes blueprint | N/A |

### Sampling Rate
- **Per task commit:** Visual inspection of implemented feature
- **Per wave merge:** All 5 success criteria verified
- **Phase gate:** Full manual verification before `/gsd-verify-work`

### Wave 0 Gaps
- None -- this is a UI-only phase with manual testing

## Sources

### Primary (HIGH confidence)
- `public/app.js` lines 83-108: State object with junctions Map
- `public/app.js` lines 3265-3305: `createJunctionNode()` function
- `public/app.js` lines 3327-3441: Connection mode (edge handles, drag-to-connect)
- `public/app.js` lines 4188-4233: `openReferenceModal()` / `closeReferenceModal()` pattern
- `public/app.js` lines 4326-4358: `registerNode()` with dblclick handler
- `public/app.js` lines 4657-4696: `makeDraggable()` pointer event pattern
- `public/app.js` lines 4698-4748: `drawLinks()`, `anchor()`, `curvePath()`, `svgElement()`
- `public/styles.css` lines 390-417: `.link-layer`, `.link`, `.link-shadow`, `.link-pin` styles
- `public/styles.css` lines 513-541: `.junction-node` styles
- `public/styles.css` lines 3067-3222: `.reference-modal` styles (modal pattern)
- `public/index.html` lines 353-360: Reference modal HTML template

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md`: Phase 18 success criteria and requirement mapping
- `.planning/REQUIREMENTS.md`: MC-08 through MC-12 requirement definitions
- Phase 17 plans (17-01, 17-02, 17-03): Junction node implementation details

### Tertiary (LOW confidence)
- Assumption A5: `curvePath()` minimum distance tuning for modal-scale layouts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing patterns
- Architecture: HIGH -- follows established modal + drag + SVG patterns
- Pitfalls: HIGH -- all pitfalls identified from codebase analysis, not guesswork

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (stable -- vanilla JS patterns don't change)
