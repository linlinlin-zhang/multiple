# External Integrations

**Analysis Date:** 2026-04-25

## APIs & External Services

**OpenAI API (primary and only external service):**
- Used for three distinct roles: chat, image analysis, and image generation
- Client: native Node.js `fetch` (no SDK package installed)
- Base URL default: `https://api.openai.com/v1`
- Endpoint called: `POST {baseUrl}/responses` (OpenAI Responses API)
  - Implementation: `openAIResponses()` in `server.js` (line 285)

**Role-specific configuration pattern:**
Each role can be independently configured with its own API key, base URL, and model. Fallback chain per role (`buildModelConfig()` in `server.js` line 69):
1. `{ROLE}_API_KEY` / `{ROLE}_API_BASE_URL` / `{ROLE}_MODEL`
2. `OPENAI_{ROLE}_API_KEY` / `OPENAI_{ROLE}_API_BASE_URL` / `OPENAI_{ROLE}_MODEL`
3. `OPENAI_API_KEY` / `OPENAI_API_BASE_URL` / `OPENAI_BASE_URL` / default model

Roles:
- **Chat** (`CHAT_*`) — `POST /api/chat`, model default `gpt-5-mini`
- **Analysis** (`ANALYSIS_*`) — `POST /api/analyze`, model default `gpt-5-mini`
- **Image** (`IMAGE_*`) — `POST /api/generate`, model default `gpt-5-mini`

## Data Flow to/from External Systems

**Image analysis flow (`POST /api/analyze`):**
1. Frontend sends `imageDataUrl` (base64 JPEG) + `fileName` to `/api/analyze`
2. Backend constructs a Chinese-language system prompt requesting JSON output with summary, subjects, mood keywords, and 5 creative direction options
3. Backend calls OpenAI Responses API with `input_image` (detail: `low`) + `input_text`
4. Backend parses JSON from model text output (with regex fallback), normalizes, and returns it
5. Frontend renders analysis node and option nodes on the canvas

**Image generation flow (`POST /api/generate`):**
1. Frontend sends `imageDataUrl` + selected `option` object to `/api/generate`
2. Backend constructs a Chinese-language prompt referencing the original image and the chosen direction
3. Backend calls OpenAI Responses API with:
   - `input_image` (detail: `high`)
   - `input_text`
   - `tools: [{ type: "image_generation", quality, size, input_fidelity: "high" }]`
4. Backend extracts base64 image from `image_generation_call` result in response
5. Backend returns `imageDataUrl` (PNG base64 data URL) to frontend
6. Frontend replaces the option node with a generated image node

**Chat flow (`POST /api/chat`):**
1. Frontend sends `message`, `imageDataUrl` (optional), `analysis`, and recent `messages`
2. Backend constructs a Chinese system context including current analysis and chat history
3. Backend calls OpenAI Responses API with `input_text` + optional `input_image` (detail: `low`)
4. Backend returns `reply` text to frontend

## Authentication Patterns for External APIs

**API Key:**
- Bearer token in `Authorization` header: `Bearer ${apiKey}`
- Sent on every request to OpenAI Responses API (`server.js` line 289)

**Demo mode (no API key):**
- If `DEMO_MODE=true` or a role-specific API key is missing/empty, that role falls back to demo responses
- `isDemoRole()` checks `DEMO_MODE` or empty `config.apiKey` (`server.js` line 98)
- Demo responses are generated locally:
  - Analysis: `buildDemoAnalysis()` returns hardcoded Chinese directions (`server.js` line 429)
  - Chat: `buildDemoChatReply()` returns rule-based Chinese replies (`server.js` line 415)
  - Image: `buildDemoImage()` returns a procedurally generated SVG data URL (`server.js` line 480)

## Environment Configuration

**Required env vars (from `.env.example`):**
- `PORT` — server port (default 3000)
- `OPENAI_API_KEY` — shared fallback API key
- `OPENAI_API_BASE_URL` — shared fallback base URL
- `CHAT_API_KEY`, `CHAT_API_BASE_URL`, `CHAT_MODEL`
- `ANALYSIS_API_KEY`, `ANALYSIS_API_BASE_URL`, `ANALYSIS_MODEL`
- `IMAGE_API_KEY`, `IMAGE_API_BASE_URL`, `IMAGE_MODEL`
- `OPENAI_IMAGE_QUALITY` — default `medium`
- `OPENAI_IMAGE_SIZE` — default `1024x1024`

**Secrets location:**
- `.env` file in project root (loaded by custom parser, not `dotenv` package)
- `.env.example` is committed; `.env` is not (implied by `.env.example` presence)

## Data Storage

**Databases:** Not applicable — no persistent storage
**File Storage:** Local filesystem only (static files served from `public/`)
**Caching:** None

## Monitoring & Observability

**Error Tracking:** None — errors logged to `console.error` only
**Logs:** `console.log` for startup, `console.error` for request errors

## CI/CD & Deployment

**Hosting:** Not specified
**CI Pipeline:** Not detected

## Webhooks & Callbacks

**Incoming:** None
**Outgoing:** None — all OpenAI interactions are synchronous request/response

---

*Integration audit: 2026-04-25*
