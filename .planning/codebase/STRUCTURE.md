# Codebase Structure

**Analysis Date:** 2026-04-25

## Directory Layout

```
E:/Desktop/multiple/
├── .planning/
│   └── codebase/          # GSD mapping documents (this directory)
├── .playwright-mcp/       # Playwright MCP tooling (external)
├── public/                # Static frontend assets served by Node.js
│   ├── index.html         # Single-page application shell
│   ├── app.js             # Frontend canvas logic (~20KB)
│   └── styles.css         # Design system and component styles (~12KB)
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore rules
├── package.json           # Node.js manifest (no dependencies)
├── README.md              # Project documentation (Chinese)
├── server.js              # Main HTTP server and API handlers (~23KB)
├── server.stderr.log      # Runtime stderr log
├── server.stdout.log      # Runtime stdout log
├── oryzae-board-flow.png              # UI flow diagram asset
├── oryzae-board-flow-spaced.png       # UI flow diagram asset
└── oryzae-board-collapse-flow.png     # UI flow diagram asset
```

## Directory Purposes

**`public/`: Frontend Assets**
- Purpose: All files served directly to the browser
- Contains: HTML, CSS, JS, and any future image/font assets
- Key files: `public/index.html`, `public/app.js`, `public/styles.css`
- Served by: `serveStatic()` in `server.js` with path traversal guard

**`.planning/codebase/`: GSD Documents**
- Purpose: Codebase analysis and planning artifacts for GSD commands
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md`, and future docs
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes (intended for repo)

## Key File Locations

**Entry Points:**
- `server.js`: Node.js server entry. Creates `http.createServer`, binds to `PORT`, serves static files and API routes.
- `public/index.html`: Browser entry. Loads `styles.css` and `app.js` as ES module.
- `public/app.js`: Frontend logic entry. Defines `state`, initializes board, wires controls.

**Configuration:**
- `.env.example`: Template for environment variables (`PORT`, `OPENAI_API_KEY`, role-specific keys, model names, image quality/size)
- `package.json`: Declares `"type": "module"`, Node >=18 engine, `dev`/`start` scripts both run `node server.js`

**Core Logic:**
- `server.js`: All server-side code in one file — HTTP routing, OpenAI API client, request/response normalization, demo data builders, static file serving
- `public/app.js`: All client-side code in one file — state management, DOM rendering, canvas interactions, image compression, API client helpers

**Testing:**
- Not detected. No test files, no test config, no test runner in `package.json`.

## Naming Conventions

**Files:**
- Lowercase with hyphens for multi-word assets: `oryzae-board-flow.png`
- Lowercase single word for core files: `server.js`, `app.js`, `styles.css`

**CSS Classes:**
- BEM-like naming with single hyphens: `.source-node`, `.option-node`, `.generated-node`
- Utility/state classes: `.hidden`, `.collapsed-hidden`, `.is-panning`, `.dragging`, `.loading`

**JavaScript:**
- camelCase for functions and variables: `handleFile`, `analyzeImage`, `buildDemoAnalysis`
- PascalCase not used
- Global `state` object holds all mutable frontend state

**Server Functions:**
- Handlers prefixed by HTTP method concept: `handleChat`, `handleAnalyze`, `handleGenerate`
- Builders prefixed with `build`: `buildDemoAnalysis`, `buildDemoChatReply`, `buildDemoImage`
- Normalizers prefixed with `normalize`: `normalizeAnalysis`, `normalizeOption`, `normalizeDataUrl`

## Where to Add New Code

**New API Endpoint:**
- Add route check in the `http.createServer` callback in `server.js` (~line 21)
- Add handler function near existing handlers (`handleChat`, `handleAnalyze`, `handleGenerate`)
- Reuse `sendJson()`, `readJson()`, and `openAIResponses()` utilities

**New Frontend Feature:**
- Add DOM selectors and state fields at the top of `public/app.js`
- Add initialization logic in `init()` or `wireControls()`
- Add rendering functions near `renderAnalysis()` / `renderOptions()`
- Add styles in `public/styles.css` using existing CSS custom properties in `:root`

**New Static Asset:**
- Place in `public/` directory
- Reference with root-relative path (e.g., `/new-asset.png`)
- `serveStatic()` in `server.js` will serve it automatically

**New Environment Variable:**
- Add to `.env.example` with comment
- Load in `server.js` via `process.env.VAR_NAME` (custom `loadDotEnv()` parses `.env` file)

## Special Directories

**`.playwright-mcp/`: External Tooling**
- Purpose: Playwright MCP (Model Context Protocol) integration
- Not part of the application runtime
- Should not be modified for feature work

**`public/`: Static Asset Root**
- Purpose: Only directory exposed to HTTP clients
- Path traversal guard in `serveStatic()` prevents escaping this directory
- No build step; files served as-is

---

*Structure analysis: 2026-04-25*
