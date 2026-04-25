# Coding Conventions

**Analysis Date:** 2026-04-25

## Naming Patterns

**Files:**
- All lowercase with kebab-case: `server.js`, `styles.css`, `index.html`
- No subdirectories for source; everything lives at root or `public/`

**Functions:**
- camelCase for all functions: `handleChat`, `buildModelConfig`, `normalizeDataUrl`
- Async handlers prefixed with `handle` or the action verb: `handleFile`, `analyzeImage`, `generateOption`
- Pure utility functions use verb-noun or noun-verb: `buildDemoImage`, `parseJsonFromText`, `collectText`
- Boolean checks prefixed with `is`: `isDemoRole`, `isHiddenByCollapsedAncestor`

**Variables:**
- camelCase: `sourceImage`, `latestAnalysis`, `chatMessages`
- DOM element references use the element ID as the variable name: `fileInput`, `sourcePreview`, `chatForm`
- Constants at module scope use UPPER_SNAKE_CASE: `PORT`, `DEMO_MODE`, `MAX_BODY_BYTES`, `IMAGE_QUALITY`

**Types:**
- No TypeScript; no explicit type annotations. Objects are shaped by convention.
- Data shapes (e.g., analysis, option, node) are normalized via `normalize*` functions rather than constructors.

## Code Style

**Formatting:**
- 2-space indentation
- Double quotes for strings
- Semicolons always used
- Trailing commas in multi-line objects/arrays: not consistently used
- Braces on same line (K&R style)
- Max line length is generous; some strings are long concatenated arrays joined with `\n`

**Quotes:**
- Double quotes for JS strings and HTML attributes
- Backticks for template literals and interpolated strings

**Comments:**
- Minimal inline comments; code is expected to be self-describing
- No JSDoc/TSDoc present

## Import/Module Patterns

**Backend (`server.js`):**
- ES modules (`"type": "module"` in `package.json`)
- Node built-ins imported with `node:` prefix: `import http from "node:http"`
- No external npm dependencies; only Node standard library
- No barrel files or index re-exports

**Frontend (`public/app.js`):**
- No module imports; single vanilla JS file loaded via `<script type="module">`
- No bundler; relies on browser-native module loading for a single file
- DOM queries at top of file, global mutable `state` object

## Error Handling

**Backend:**
- Top-level `try/catch` in HTTP request handler wraps all route logic
- Errors logged with `console.error(error)`
- JSON error responses always include `error` and `message` fields
- Async helpers throw on API failure; caller catches and returns 500
- JSON parse failures in `readJson` reject with explicit message

**Frontend:**
- `try/catch` around every async API call
- Errors surfaced via `setStatus(error.message, "error")`
- `parseApiResponse` checks `response.ok` and throws with server message or status text
- Image load failures reject with localized Chinese message: `new Error("图片读取失败")`

## Configuration Loading

**Environment variables (`server.js`):**
- Custom `.env` parser: `loadDotEnv()` in `server.js` (lines 638-652)
- Reads `.env` file line-by-line; skips comments and blank lines
- Strips surrounding quotes from values
- Only sets `process.env[key]` if not already defined (does not override existing env)
- No `.env` validation; missing values fall back to hardcoded defaults

**Role-based model configuration:**
- `buildModelConfig(role, defaultModel)` constructs per-role config objects
- Each role (`CHAT`, `ANALYSIS`, `IMAGE`) can have its own `API_KEY`, `API_BASE_URL`, and `MODEL`
- Falls back through a priority chain: role-specific env var -> `OPENAI_{ROLE}_*` -> `OPENAI_API_KEY` / `OPENAI_BASE_URL`

## Demo Mode vs Production Mode

**Detection:**
- `DEMO_MODE` env var forces all roles into demo mode
- Per-role demo mode triggered when `config.apiKey` is empty: `isDemoRole(config)`
- `appMode()` returns `"demo"`, `"mixed"`, or `"api"` based on role states

**Behavior:**
- Demo mode returns synthetic data instead of calling OpenAI API
- `buildDemoAnalysis()` returns hardcoded Chinese analysis with 5 preset options
- `buildDemoChatReply()` uses regex heuristics on user message to pick a canned response
- `buildDemoImage()` generates an SVG data URL with gradient and geometric shapes

**Frontend awareness:**
- `checkHealth()` calls `/api/health` and displays mode badge (`demo` / `mixed` / `api`)
- Badge tooltip explains demo mode in Chinese

## Repeated Patterns & Abstractions

**Normalization helpers:**
- `stringOr(value, fallback)` — coerce to trimmed string or fallback
- `arrayOfStrings(value, fallback)` — filter and trim string array
- `normalizeDataUrl(value)` — validate base64 image data URL format
- `normalizeAnalysis()`, `normalizeOption()`, `normalizeChatAnalysis()`, `normalizeChatMessages()` — defensive object shaping with fallbacks

**API helpers:**
- `sendJson(res, status, data)` — uniform JSON response
- `readJson(req)` — stream-based body reader with size limit (`MAX_BODY_BYTES`)
- `getJson(url)`, `postJson(url, payload)` — frontend fetch wrappers
- `parseApiResponse(response)` — frontend response validator

**State management (frontend):**
- Single global `state` object with nested `view` sub-object
- `Map` for node registry: `state.nodes`
- Arrays for links and chat messages
- `Set` for collapsed node tracking
- Direct mutation; no immutability patterns

**DOM construction:**
- Template cloning for repeatable structures: `optionTemplate.content.cloneNode(true)`
- Imperative element creation with `document.createElement` for dynamic nodes
- `svgElement(tag, attributes)` helper for SVG node creation

## Security Patterns

**Static file serving:**
- `path.normalize()` + `startsWith(publicDir)` check prevents directory traversal
- `decodeURIComponent()` on request path before resolution

**Input sanitization:**
- `normalizeDataUrl()` strictly validates `data:image/{png,jpeg,webp,gif};base64,` prefix
- `MAX_BODY_BYTES` caps request body at ~22MB
- `escapeXml()` used when embedding user-derived text into demo SVG
- Chat message and input truncation: `.slice(0, 2000)` for messages, `.slice(0, 1200)` for chat history items

## Localization

- UI strings and model prompts are in Chinese
- Error messages mix Chinese and English
- No i18n framework; all strings are hardcoded
