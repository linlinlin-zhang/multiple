# Testing Patterns

**Analysis Date:** 2026-04-25

## Test Framework & Tooling

**Status: No tests exist.**

There are zero test files, zero test frameworks, and zero test scripts in the repository.

- No `jest.config.*`, `vitest.config.*`, or `playwright.config.*` found
- No `*.test.*` or `*.spec.*` files anywhere in the project
- `package.json` scripts contain only `"dev"` and `"start"`: both run `node server.js`
- No test runner listed in `dependencies` or `devDependencies` (there are none at all)

## Test Coverage Assessment

| Area | Coverage | Notes |
|------|----------|-------|
| Server route handlers | 0% | `/api/health`, `/api/chat`, `/api/analyze`, `/api/generate` untested |
| Demo mode fallbacks | 0% | `buildDemoAnalysis`, `buildDemoChatReply`, `buildDemoImage` untested |
| OpenAI API client | 0% | `openAIResponses`, `collectText`, `findGeneratedImage` untested |
| JSON parsing utilities | 0% | `parseJsonFromText` untested |
| Normalization helpers | 0% | `normalizeAnalysis`, `normalizeOption`, `normalizeChatMessages` untested |
| Static file serving | 0% | `serveStatic`, `mimeType` untested |
| Frontend state logic | 0% | All canvas/node/graph logic in `public/app.js` untested |
| Image compression | 0% | `resizeImage` (canvas-based) untested |
| DOM rendering | 0% | `renderOptions`, `turnIntoGeneratedNode`, `drawLinks` untested |
| Configuration loading | 0% | `loadDotEnv`, `buildModelConfig` untested |

## What Is Tested vs Untested

**Tested:** Nothing.

**Untested (high risk):**
- `server.js` — entire HTTP server, all business logic, all external API calls
- `public/app.js` — all user interactions, canvas rendering, state mutations, drag-and-drop, zoom/pan
- `public/styles.css` — no visual regression or accessibility tests
- `public/index.html` — no structural or accessibility tests

## How to Run Tests

Not applicable. No test command exists.

Recommended addition to `package.json`:
```json
{
  "scripts": {
    "test": "node --test",
    "test:watch": "node --test --watch"
  }
}
```

Node.js 18+ includes the built-in `node:test` runner, which fits the zero-dependency philosophy of this project.

## Testing Gaps & Risks

**Critical gaps:**

1. **No API contract tests**
   - OpenAI Responses API format may change; `openAIResponses`, `collectText`, and `findGeneratedImage` assume specific response shapes
   - Risk: silent failures or crashes on API changes

2. **No demo mode verification**
   - Demo mode is the primary development path (no API key required)
   - `buildDemoImage` generates SVGs with embedded user text; `escapeXml` has no test coverage
   - Risk: XSS via demo SVG if `escapeXml` is bypassed or flawed

3. **No input validation tests**
   - `normalizeDataUrl` regex is the only guard against malicious uploads
   - `readJson` has a size limit but no content-type validation
   - Risk: malformed payloads could crash the server or produce unexpected behavior

4. **No frontend state tests**
   - `state.nodes`, `state.links`, `state.collapsed` form a graph structure with manual consistency maintenance
   - `getDescendants` uses iterative DFS; no verification of correctness for cycles or deep trees
   - Risk: UI bugs from state desync (e.g., links pointing to removed nodes)

5. **No error path tests**
   - Network failures, API 500s, malformed JSON, and oversized uploads are handled but unverified
   - Risk: error handlers may themselves throw, crashing the process

6. **No image processing tests**
   - `resizeImage` uses canvas `toDataURL`; behavior varies across browsers
   - No verification of output dimensions, file size reduction, or quality settings

## Suggested Test Priorities

**Phase 1 — Unit tests for pure utilities (no dependencies):**
- `stringOr`, `arrayOfStrings`, `slug`, `escapeXml`, `clamp`, `trimMiddle`
- `normalizeDataUrl` — valid/invalid inputs
- `parseJsonFromText` — valid JSON, markdown-wrapped JSON, invalid input
- `buildModelConfig` — env var fallback chain
- `loadDotEnv` — parsing edge cases (comments, quotes, empty lines)

**Phase 2 — Server route tests (using `node:test` + native `http`):**
- `GET /api/health` — verify mode badge response shape
- `POST /api/analyze` — demo mode returns expected structure; validate 400 on missing image
- `POST /api/chat` — demo mode returns expected reply categories
- `POST /api/generate` — demo mode returns SVG data URL
- `serveStatic` — 404 for missing files, 403 for path traversal attempts

**Phase 3 — Frontend integration tests (using Playwright or Puppeteer):**
- File upload flow
- Analyze button triggers node rendering
- Generate button transforms option node into generated node
- Drag, zoom, pan interactions
- Chat message send/receive cycle

**Phase 4 — Contract/mocking tests:**
- Mock `fetch` for `openAIResponses` to test response parsing
- Verify `collectText` and `findGeneratedImage` against real OpenAI response samples

---

*Testing analysis: 2026-04-25*
