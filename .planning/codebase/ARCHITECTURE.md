# Architecture

**Analysis Date:** 2026-04-25

## Pattern Overview

**Overall:** Single-file monolith with a lightweight HTTP server and a vanilla-JS canvas frontend. No framework, no bundler, no database.

**Key Characteristics:**
- Pure Node.js `http` module server (no Express/Fastify)
- Zero frontend dependencies; vanilla ES modules in the browser
- All state lives in-memory on the client; server is stateless
- Single-page application with an infinite canvas metaphor
- Demo mode allows full offline/local operation without API keys

## Layers

**Server (`server.js`):**
- Purpose: Serve static assets, proxy LLM calls, provide demo fallbacks
- Location: `server.js`
- Contains: HTTP router, request handlers, OpenAI Responses API client, demo data builders, utility functions
- Depends on: Node.js built-ins (`http`, `fs`, `path`, `url`), environment variables
- Used by: Frontend via HTTP

**Frontend (`public/app.js`):**
- Purpose: Canvas board UI, node graph rendering, image compression, user interactions
- Location: `public/app.js`
- Contains: DOM event wiring, canvas pan/zoom/drag, node lifecycle, SVG link drawing, chat UI, API client helpers
- Depends on: Browser APIs (Canvas, Fetch, Pointer Events, FileReader)
- Used by: Browser

**Static Assets (`public/`):**
- Purpose: HTML shell, CSS design system, favicon
- Location: `public/index.html`, `public/styles.css`
- Contains: Semantic layout markup, CSS custom properties, responsive breakpoints
- Depends on: None
- Used by: Browser

## Data Flow

**User Upload -> Analysis -> Options -> Generation:**

1. **Upload & Compress**
   - User selects image via `<input type="file">` in `public/index.html`
   - `handleFile()` in `public/app.js` resizes image on a `<canvas>` to max 1600px, JPEG quality 0.88
   - Compressed base64 `dataUrl` stored in `state.sourceImage`

2. **Analyze**
   - User clicks "分析" button -> `analyzeImage()` sends `POST /api/analyze`
   - Server `handleAnalyze()` in `server.js` forwards image + prompt to OpenAI Responses API (vision model)
   - Model returns JSON with `summary`, `detectedSubjects`, `moodKeywords`, and 5 `options`
   - Server normalizes with `normalizeAnalysis()` and returns to frontend
   - Frontend renders `analysisNode` and 5 `option-node` elements on the board

3. **Select Direction**
   - Each `option-node` displays `title`, `description`, `tone`, `layoutHint`
   - User clicks "生成这张图" -> `generateOption()` sends `POST /api/generate`

4. **Generate Image**
   - Server `handleGenerate()` in `server.js` sends reference image + prompt to OpenAI Responses API with `image_generation` tool
   - Model returns base64 PNG
   - Server wraps in `data:image/png;base64` and returns
   - Frontend transforms the `option-node` into a `generated-node` showing the image, with download/regenerate actions

5. **Chat Loop (optional)**
   - User types in bottom chatbar -> `POST /api/chat`
   - Server sends message + current analysis context + last 8 messages to chat model
   - Reply appended to chat history UI

## Server Architecture

**HTTP Routes & Handlers:**

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/health` | inline | Returns mode (`demo`/`api`/`mixed`), model configs per role |
| POST | `/api/chat` | `handleChat()` | Creative assistant dialogue |
| POST | `/api/analyze` | `handleAnalyze()` | Vision analysis + direction generation |
| POST | `/api/generate` | `handleGenerate()` | Image generation from selected option |
| GET | `/*` | `serveStatic()` | Serves files from `public/` with path traversal guard |

**Request Handling Pattern:**
- Single `http.createServer()` callback with a `try/catch` wrapper
- URL parsed via `new URL(req.url, "http://" + req.headers.host)`
- JSON bodies read via `readJson()` with a 22MB max size guard
- Errors normalized to JSON responses via `sendJson(res, status, data)`

**OpenAI Client:**
- `openAIResponses(payload, config)` in `server.js` makes `fetch()` to `${config.baseUrl}/responses`
- Supports role-specific API keys and base URLs via `buildModelConfig(role, defaultModel)`
- Response text extracted via `collectText()` or `findGeneratedImage()` depending on endpoint

**Demo Fallbacks:**
- `DEMO_MODE` env var or missing API key triggers demo mode per role
- `buildDemoAnalysis()` returns hardcoded 5 directions with Chinese prompts
- `buildDemoChatReply()` returns rule-based Chinese replies
- `buildDemoImage()` generates parameterized SVG placeholders with color palettes

## Frontend Architecture

**Canvas System:**
- Viewport: `#viewport` (CSS grid cell, `overflow: hidden`)
- Board: `#board` (absolutely positioned, 2400x1500px, CSS `transform` for pan/zoom)
- Link Layer: `#linkLayer` (SVG overlay, same dimensions, draws Bezier curves between nodes)
- Pan: pointer drag on viewport background
- Zoom: Ctrl/Cmd + wheel, or toolbar buttons
- Initial scale: 0.86 (0.64 on mobile <820px)

**Node Graph:**
- Nodes registered in `state.nodes` Map with `{ id, element, x, y, width, height, option?, generated? }`
- Built-in nodes: `source` (upload), `analysis` (model read)
- Dynamic nodes: `option-${id}` (up to 6, positioned from `optionPositions` array)
- Nodes are draggable via Pointer Events; dragging updates `x/y` and redraws SVG links

**Node Types & Lifecycle:**

1. **Source Node**
   - Contains file input, empty state label, preview `<img>`
   - Upload triggers compression, then enables "分析" button

2. **Analysis Node**
   - Hidden until analysis completes
   - Displays `summary` paragraph and `keyword-list` pills

3. **Option Node**
   - Cloned from `<template id="optionTemplate">`
   - Shows tone/layout hint eyebrow, title, description, generate button
   - Slight rotation via CSS `--tilt` for organic feel

4. **Generated Node**
   - Same DOM element mutated via `turnIntoGeneratedNode()`
   - Replaces content with generated image, title, description, download/regenerate buttons

**Collapse System:**
- Each node with children gets a `.collapse-dot` button
- `state.collapsed` Set tracks collapsed node IDs
- `getDescendants()` walks `state.links` graph recursively
- `applyCollapseState()` toggles `collapsed-hidden` class and redraws links

**State Management:**
- Single `state` object at top of `app.js`:
  ```js
  {
    sourceImage, fileName, latestAnalysis,
    chatMessages, nodes, links, collapsed,
    generatedCount, view: { x, y, scale }
  }
  ```
- No reactive framework; all UI updates are imperative DOM mutations after async API calls

**Event Handling:**
- `wireControls()` binds all listeners at init time
- File input -> `handleFile`
- Analyze button -> `analyzeImage`
- Chat form -> `handleChatSubmit`
- Generate buttons -> `generateOption` (delegated via cloned template)
- Pointer events for pan (viewport) and drag (nodes)
- Wheel + Ctrl for zoom

## Communication Patterns

**Frontend -> Backend:**
- `getJson(url)` and `postJson(url, payload)` thin wrappers around `fetch()`
- `parseApiResponse()` checks `response.ok` and throws on errors
- All payloads are JSON; images travel as base64 `dataUrl` strings

**Backend -> LLM APIs:**
- `openAIResponses()` uses standard `fetch()` to OpenAI-compatible `/responses` endpoint
- Auth via `Authorization: Bearer ${apiKey}` header
- Supports text + image inputs in the same message content array

**Error Handling:**
- Server: top-level `try/catch` in request handler returns 500 JSON with message
- Frontend: `try/catch` around each async handler; `setStatus()` shows error text in status bar
- Network failures in `checkHealth()` show "offline" badge

## Cross-Cutting Concerns

**Logging:** Server logs errors to `console.error`; no structured logging
**Validation:** Input normalization functions (`normalizeDataUrl`, `normalizeOption`, `normalizeChatMessages`) sanitize and fallback missing fields
**Authentication:** None (single-user local prototype); API keys stored in `.env`
**Image Security:** `normalizeDataUrl()` regex-restricts to `data:image/(png|jpeg|webp|gif);base64,`
**Rate Limiting:** None implemented

---

*Architecture analysis: 2026-04-25*
