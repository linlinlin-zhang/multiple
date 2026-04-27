---
phase: 11
plan: 01
subsystem: UI
phase_name: research-mode
tags: [ui, dropdown, i18n, research]
dependency_graph:
  requires: []
  provides: [11-02]
  affects: [public/index.html, public/app.js, public/styles.css]
tech_stack:
  added: []
  patterns: [hover-dropdown, tooltip-bubble, i18n-translation]
key_files:
  created: []
  modified:
    - public/index.html
    - public/app.js
    - public/styles.css
decisions:
  - "Reused existing primary-button styling for research-button to maintain visual consistency"
  - "Used :hover on parent wrapper + .is-open class for dropdown visibility to support both hover and click dismissal"
  - "Tooltip appears to the right of each option with CSS arrow pointing left"
  - "canResearchNode() validates node type before allowing research; only source, analysis, and ungenerated option nodes are valid"
  - "handleExplore() is a stub showing toast; full implementation deferred to 11-02"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-27"
---

# Phase 11 Plan 01: Research button UI with dropdown and tooltips Summary

**One-liner:** Replaced the single "Analyze" button with a "Research" hover-dropdown containing "Analyze" (no-thinking) and "Explore" (thinking) modes, each with explanatory tooltips.

## What Was Built

- **Research dropdown UI** in `public/index.html` replacing `#analyzeButton`
- **Hover-triggered dropdown** with two options: Analyze and Explore
- **Tooltip bubbles** on each option explaining the mode
- **Dark mode styling** for all new elements
- **i18n support** for all labels and tooltips (zh/en)
- **Node type validation** with toast error for invalid selections

## Commits

| Hash | Message |
|------|---------|
| `92129aa` | feat(11-01): replace analyze button with research dropdown markup and handlers |
| `bc2fca7` | feat(11-01): style research dropdown and tooltips |

## Changes by File

### public/index.html
- Replaced `<button id="analyzeButton">` with `.research-dropdown-wrapper` containing:
  - `#researchButton` (disabled by default)
  - `.research-dropdown` with two `.research-option` items
  - `.option-tooltip` on each option

### public/app.js
- Replaced `analyzeButton` DOM reference with `researchButton`
- Added i18n keys: `research.button`, `research.analyze`, `research.explore`, `research.analyzeTooltip`, `research.exploreTooltip`, `research.cannotResearch`
- Added `canResearchNode(nodeId)` validator
- Added `handleAnalyze(mode = "analyze")` with node validation
- Added `handleExplore()` stub with node validation
- Updated `analyzeSource(mode)` to accept mode parameter
- Added hover/click event wiring for research dropdown
- Updated `renderAllText()` to translate research dropdown content
- Updated all `analyzeButton.disabled` references to `researchButton.disabled`

### public/styles.css
- Added `.research-dropdown-wrapper` (relative, inline-block)
- Added `.research-button` (matches primary-button styling)
- Added `.research-dropdown` (absolute, hidden by default, shown on hover)
- Added `.research-option` (padding, hover highlight, cursor pointer)
- Added `.option-tooltip` (absolute bubble with left arrow, dark background)
- Added dark mode variants for all new elements

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Description |
|------|------|-------------|
| public/app.js | 1109 | `handleExplore()` shows "Explore mode coming soon" toast; full implementation planned in 11-02 |

## Threat Flags

None - no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] `public/index.html` contains research dropdown markup
- [x] `public/app.js` contains research handlers and i18n keys
- [x] `public/styles.css` contains research dropdown and tooltip styles
- [x] Commits `92129aa` and `bc2fca7` exist in git log
