# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Multi-Card Canvas Interaction

**Shipped:** 2026-05-02
**Phases:** 3 | **Plans:** 8

### What Was Built
- New Card command with deletable, draggable blank cards
- Drag-to-connect with SVG Bezier curves and edge handles
- Junction nodes with auto-create, auto-join, max 5-card capacity, cyan-to-blue gradient
- Blueprint modal: card drag, relationship drawing (upstream/downstream/parallel), type picker
- Blueprint AI context integration — relationships inform chat systemContext
- Menu cleanup: removed zoom/history/settings from `/` menu

### What Worked
- Wave-based execution for Phase 18 (3 waves, sequential within waves sharing files)
- Plan 01 verification task caught zero issues — all 7 implementations correct from Wave 1
- Hardcoded fallback approach for blueprintContext avoided i18n scope creep

### What Was Inefficient
- Junction persistence was identified as a gap during research but could have been caught in Phase 17 planning
- STATE.md updates by executor agents caused minor conflicts with orchestrator edits

### Patterns Established
- Verification tasks that check existing implementations before adding new code (Plan 18-02 Task 1)
- Click-to-delete directly on SVG path elements rather than overlay buttons
- Blueprint cleanup order: after junction state update, before DOM removal

### Key Lessons
1. Coordinate system risks in modals — always verify 1:1 vs scaled coordinates early
2. Fire-and-forget pattern works for non-critical side effects (material sync, blueprint persistence)
3. Hardcoded fallback text is acceptable when locale keys don't exist yet

### Cost Observations
- Model mix: 100% sonnet (executor agents)
- Sessions: 1 (continuous execution of 3 waves)
- Notable: Wave-based execution completed Phase 18 (3 plans) in ~6 minutes total

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v2.0 | 3 | 8 | Wave-based parallel execution, verification tasks |

### Top Lessons (Verified Across Milestones)

1. Coordinate system clarity prevents modal/canvas interaction bugs
2. Incremental feature building (foundation → interaction → integration) works well for complex UI
3. State cleanup must happen before DOM removal to avoid stale references
