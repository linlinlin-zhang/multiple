# Codebase Concerns

**Analysis Date:** 2026-04-25

## Security Concerns

### File Upload Validation Is Weak
- The `fileInput` in `public/index.html` restricts via `accept="image/png,image/jpeg,image/webp,image/gif"`, but this is client-side only.
- `public/app.js` (`resizeImage`) checks `file.type.startsWith("image/")` before processing, but MIME types are spoofable.
- The backend `server.js` (`normalizeDataUrl`) only validates the data URL prefix with a regex (`/^data:image\/(png|jpe?g|webp|gif);base64,/i`). It does not verify the actual image bytes, dimensions, or decode the base64 to check for malicious payloads.
- **Impact:** A crafted data URL or manipulated file type could reach the server and be forwarded to the LLM API.
- **Files:** `server.js` (lines 606-610), `public/app.js` (lines 550-553)

### No CORS Configuration
- `server.js` does not set any CORS headers. In a production deployment, this could block legitimate cross-origin requests or, conversely, if deployed without a reverse proxy, could allow unwanted origins.
- **Impact:** Unexpected behavior when embedding or accessing from a different origin; no explicit security boundary defined.
- **Files:** `server.js`

### API Keys in Environment Variables Only
- The application relies entirely on `process.env` for API keys. There is no validation that keys are non-empty before attempting requests (it falls back to demo mode, which is fine, but there is no warning log when a key is unexpectedly missing).
- **Impact:** Silent fallback to demo mode may confuse operators who think they are using live APIs.
- **Files:** `server.js` (lines 69-88)

### No Rate Limiting
- There is no rate limiting on `/api/analyze`, `/api/generate`, or `/api/chat`.
- **Impact:** Vulnerable to abuse; expensive image generation endpoints can be hammered, leading to high API costs or server overload.
- **Files:** `server.js`

### No Input Sanitization on Chat Messages
- `handleChat` truncates messages to 2000 characters but does not sanitize or escape content before including it in the LLM prompt context.
- **Impact:** Potential prompt injection vectors from user chat input.
- **Files:** `server.js` (lines 109-162)

## Performance Concerns

### Large Base64 Images in Memory
- Images are resized client-side to a max of 1600px (`resizeImage` in `public/app.js`), but the resulting base64 JPEG is still stored in `state.sourceImage` and transmitted in full for every API call (`/api/analyze`, `/api/chat`, `/api/generate`).
- **Impact:** High memory usage on the client, large request payloads, and repeated transmission of the same image data.
- **Files:** `public/app.js` (lines 120-123, 151-153, 178-183, 290-293)

### No Request Timeouts
- `fetch` calls in `openAIResponses` (`server.js`) and `postJson`/`getJson` (`public/app.js`) do not use `AbortController` or timeout wrappers.
- **Impact:** Hanging requests can exhaust server/client resources and degrade UX.
- **Files:** `server.js` (lines 285-309), `public/app.js` (lines 589-609)

### Synchronous File Reads for Static Assets
- `serveStatic` in `server.js` uses `fs.readFile` without streaming. Every static request reads the entire file into memory.
- **Impact:** Under load, this increases memory pressure and latency for large assets.
- **Files:** `server.js` (lines 563-582)

### Canvas Resize on Main Thread
- `resizeImage` in `public/app.js` draws to an HTML canvas on the main thread. For very large images, this can block UI rendering.
- **Impact:** Jank or unresponsiveness during image compression.
- **Files:** `public/app.js` (lines 550-578)

## Scalability Limitations

### Single-Process Node.js HTTP Server
- The server is a single `http.createServer` instance with no clustering or worker processes.
- **Impact:** Cannot utilize multiple CPU cores; throughput is bounded by a single event loop.
- **Files:** `server.js` (lines 21-67)

### No Persistent Storage
- All state lives in the client (`public/app.js` `state` object). The server is completely stateless, which is good, but there is no session persistence, image caching, or generated image storage.
- **Impact:** Refreshing the page loses all work. Regenerating the same option re-runs the full (expensive) API call.
- **Files:** `public/app.js` (lines 23-37)

### No Request Deduplication or Caching
- Identical `/api/generate` or `/api/analyze` requests are not cached or deduplicated.
- **Impact:** Redundant API calls increase latency and cost.
- **Files:** `server.js`

## Error Handling Gaps

### Generic 500 for All Server Errors
- The top-level `try/catch` in the request handler returns a generic 500 with the error message.
- **Impact:** Leaks internal error details to the client (e.g., raw API response text), which can expose backend internals or API keys in error messages.
- **Files:** `server.js` (lines 55-61)

### Silent Failures in Client-Side Health Check
- `checkHealth` in `public/app.js` catches errors silently and sets the badge to "offline".
- **Impact:** No user-facing error details if the server is unreachable.
- **Files:** `public/app.js` (lines 104-112)

### Missing Validation for `option` Object in `/api/generate`
- `normalizeOption` provides defaults for missing fields, but it does not validate that the prompt content is safe, non-empty, or within reasonable length bounds before sending to the image generation API.
- **Impact:** Could forward malformed or oversized prompts to the provider.
- **Files:** `server.js` (lines 368-378)

### No Handling for Partial LLM JSON
- `parseJsonFromText` extracts the first `{...}` block via regex. If the model returns multiple JSON objects or malformed JSON inside valid braces, parsing may silently produce incorrect data.
- **Impact:** Subtle data corruption in analysis results.
- **Files:** `server.js` (lines 332-346)

## Hardcoded Values and Magic Numbers

### Layout Coordinates
- `optionPositions` in `public/app.js` is a hardcoded array of pixel coordinates.
- **Impact:** Not responsive; adding more than 6 options causes wrap-around collision due to the modulo operator (`index % optionPositions.length`).
- **Files:** `public/app.js` (lines 39-46)

### Size and Quality Limits
- `MAX_BODY_BYTES` is hardcoded to 22MB (`22 * 1024 * 1024`).
- Image resize max dimension is hardcoded to 1600px with quality 0.88.
- Chat message truncation is hardcoded to 1200 characters; context messages are hard-limited to the last 8.
- **Impact:** Inflexible for different deployment environments or use cases.
- **Files:** `server.js` (line 19), `public/app.js` (lines 120, 407, 410)

### Board Dimensions
- The SVG `viewBox` and `.board` dimensions are hardcoded to `2400x1500`.
- **Impact:** Limits the usable canvas area; nodes placed beyond this may be clipped or unreachable.
- **Files:** `public/index.html` (line 42), `public/styles.css` (lines 192-193, 200-201)

### Zoom Limits
- Zoom clamp is hardcoded to `0.45` and `1.35`.
- **Files:** `public/app.js` (line 612)

## Code Smells and Duplication

### Repetitive Normalization Logic
- `stringOr`, `arrayOfStrings`, and `slug` are small utilities, but the normalization pattern is repeated across `normalizeAnalysis`, `normalizeOption`, `normalizeChatAnalysis`, and `normalizeChatMessages`.
- **Impact:** Adding a new field requires updating multiple normalization functions consistently.
- **Files:** `server.js` (lines 348-413)

### Inline SVG Generation in Demo Mode
- `buildDemoImage` constructs a large SVG string via template literals with inline XML escaping.
- **Impact:** Difficult to maintain; no separation of template and data.
- **Files:** `server.js` (lines 480-524)

### Tight Coupling of DOM and State
- `public/app.js` directly mutates the DOM inside state mutation functions (e.g., `turnIntoGeneratedNode`, `renderOptions`). There is no virtual DOM or component boundary.
- **Impact:** Hard to test, easy to introduce UI bugs when state and DOM drift.
- **Files:** `public/app.js` (lines 241-275, 311-355)

## Maintainability Issues

### No TypeScript or Type Checking
- The entire codebase is plain JavaScript (ES modules). There are no JSDoc types or runtime schema validation for API payloads.
- **Impact:** Refactoring is risky; type mismatches (e.g., `option` shape) are only caught at runtime.
- **Files:** All `.js` files

### No Linting or Formatting Configuration
- No `.eslintrc`, `.prettierrc`, or `biome.json` is present.
- **Impact:** Inconsistent style as the project grows; no automated catch for common bugs.
- **Files:** Project root

### Monolithic Frontend File
- `public/app.js` is ~650 lines handling state, DOM, networking, canvas drawing, and event handling.
- **Impact:** Cognitive load is high; changes in one area risk regressions in another.
- **Files:** `public/app.js`

### Monolithic Backend File
- `server.js` is ~650 lines handling routing, business logic, API clients, static serving, and utilities.
- **Impact:** Difficult to add new endpoints or swap out the LLM provider without touching many unrelated functions.
- **Files:** `server.js`

## Demo Mode Risks

### Demo Mode Can Be Enabled Accidentally in Production
- `DEMO_MODE` is triggered by an env var or by missing any API key. There is no explicit "production" guard.
- The `/api/health` endpoint exposes whether the server is in demo mode.
- **Impact:** If deployed without keys, the app silently serves fake data. Users may not realize they are not using real AI.
- **Files:** `server.js` (lines 13, 98-107)

### Demo Data Is Hardcoded in Chinese
- `buildDemoAnalysis` and `buildDemoChatReply` contain hardcoded Chinese strings.
- **Impact:** Not localized; if the app is adapted for other languages, demo mode will still output Chinese.
- **Files:** `server.js` (lines 415-427, 429-478)

## State Management Complexity

### Global Mutable State Object
- `state` in `public/app.js` is a single mutable object with nested arrays, Maps, and Sets.
- **Impact:** No undo/redo capability. Race conditions are possible if async operations (e.g., rapid clicks on generate) overlap, although button disabling mitigates this partially.
- **Files:** `public/app.js` (lines 23-37)

### No Unique IDs for Generated Nodes
- Generated node IDs are derived from `option.id` or index (`option-${option.id || index}`). If the same option is regenerated after clearing, IDs may collide or be reused.
- **Impact:** Potential DOM key collisions if the app is extended to support history or multiple generations per option.
- **Files:** `public/app.js` (lines 247-249)

### Links Are Rebuilt from Scratch on Every State Change
- `applyCollapseState` and `drawLinks` iterate over all links and nodes to recalculate visibility and SVG paths.
- **Impact:** O(n) cost on every collapse/expand or drag event. For large boards, this will become sluggish.
- **Files:** `public/app.js` (lines 404-410, 498-518)

## Missing Critical Features

### No Image Persistence or Export
- Generated images exist only as data URLs in the DOM. There is no save-to-server, local storage, or project export.
- **Impact:** Users lose all work on page refresh.
- **Files:** `public/app.js`

### No Accessibility for Dynamic Content
- Collapse buttons have `aria-label`, but dynamically generated option nodes do not announce themselves to screen readers.
- **Impact:** Poor accessibility for assistive technology users.
- **Files:** `public/app.js` (lines 241-275)

### No Test Coverage
- No test files, test runners, or testing scripts exist.
- **Impact:** No safety net for regressions.
- **Files:** Project root

---

*Concerns audit: 2026-04-25*
