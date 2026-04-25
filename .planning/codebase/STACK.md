# Technology Stack

**Analysis Date:** 2026-04-25

## Languages

**Primary:**
- JavaScript (ES2022/ES modules) — entire codebase (`server.js`, `public/app.js`)
- CSS (vanilla, custom properties) — `public/styles.css`
- HTML (single-page) — `public/index.html`

**Secondary:**
- SVG (inline, dynamically generated) — demo image generation in `server.js`

## Runtime

**Environment:**
- Node.js >= 18 (specified in `package.json` engines)
- ES modules (`"type": "module"` in `package.json`)

**Package Manager:**
- npm (implied by `package.json`)
- Lockfile: not present

## Frameworks

**Core:**
- None — vanilla Node.js `http` server (`server.js` line 1: `import http from "node:http"`)
- No Express, Fastify, or other HTTP framework

**Frontend:**
- None — vanilla JavaScript, no React/Vue/Angular
- Canvas and DOM manipulation via native APIs (`document.querySelector`, `createElement`, `getContext("2d")`)

**Testing:**
- Not detected

**Build/Dev:**
- No build step; `npm run dev` runs `node server.js` directly
- No bundler (Vite, Webpack, Rollup, etc.)
- No transpiler (Babel, TypeScript, etc.)

## Key Dependencies

**Critical:**
- None — zero runtime dependencies in `package.json`
- All functionality uses Node.js built-in modules (`http`, `fs`, `path`, `url`)
- Frontend uses browser built-ins (`fetch`, `CanvasRenderingContext2D`, `PointerEvent`)

**Infrastructure:**
- `fetch` API — used server-side for OpenAI API calls (`server.js` line 286)
  - Relies on Node.js 18+ global `fetch`

## Configuration

**Environment:**
- `.env` file loaded via custom `loadDotEnv()` parser in `server.js` (line 638)
- `.env.example` documents all supported variables
- No `dotenv` npm package; custom parser handles `KEY=value` lines, skips comments and blank lines

**Build:**
- No build configuration files (no `vite.config.js`, `webpack.config.js`, `tsconfig.json`, etc.)

## Frontend Stack

**JavaScript approach:**
- Vanilla JS in a single module file (`public/app.js`)
- No framework, no state management library
- Manual DOM manipulation and event handling
- Module loaded via `<script type="module">` in `public/index.html`

**CSS approach:**
- Vanilla CSS with CSS custom properties (`:root` variables in `public/styles.css`)
- No preprocessor (Sass, Less, PostCSS)
- No CSS framework (Tailwind, Bootstrap)
- Custom grid layout (`app-shell` uses `display: grid`)

**UI libraries:**
- None — all UI components are custom HTML/CSS
- Inline SVG used for link layer and generated demo images

## Platform Requirements

**Development:**
- Node.js >= 18
- A modern browser supporting `fetch`, `PointerEvent`, and CSS custom properties

**Production:**
- Single Node.js process serving static files and API routes on a single port
- No containerization config detected
- No reverse proxy config included

---

*Stack analysis: 2026-04-25*
