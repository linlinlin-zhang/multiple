# ORYZAE 3.0

ORYZAE is a multimodal AI canvas for visual research, image generation, file understanding, and voice-driven workspace control. It turns images, documents, links, and conversations into persistent canvas cards, then lets Qwen models analyze, search, plan, generate, and reorganize the workspace.

Version 3.0 shifts the project from a simple image-board prototype into an AI workbench: the canvas is the primary surface, chat and voice are control layers, and every session can be reviewed through the history browser and material library.

## Core Experience

- **Workbench canvas**: upload source images/files, create independent cards, connect ideas, resize and move cards, organize complex reasoning flows, and return to previous sessions.
- **Image workflow**: analyze source images, generate 5-8 direction cards, create Qwen images from selected directions, edit generated images, share, download, and rename assets.
- **File understanding**: upload documents and produce a file-understanding card with summary, structure, key materials, and actionable directions such as research, task planning, report structure, web analysis, material collection, or image generation.
- **Chat controller**: talk freely with the AI even when no card is selected; the model can call canvas tools such as selecting cards, arranging the canvas, creating cards, searching the web, searching images, generating images, analyzing files, and exporting reports.
- **Deep research workflow**: Qwen Deep Research is treated as a separate workflow from ordinary thinking mode. Research should surface planning, search queries, evidence cards, intermediate findings, and final reports.
- **Realtime voice**: speech-to-text and realtime voice control use Qwen voice models so the same tool layer can be driven by conversation or voice.
- **History and materials**: sessions, output folders, chat records, generated assets, uploaded files, and material-library items are persisted for later review.

## System Architecture

```text
Browser UI
  public/app.js                    Workbench canvas and chat panel
  app/                             React pages for history, sharing, settings, materials

Node server
  server.js                        HTTP routes, model proxy, canvas tool orchestration
  src/api/                         Session, history, assets, settings, materials, RAG, file understanding APIs
  src/lib/                         Storage, parsers, file understanding, RAG helpers
  src/prompts/                     Prompt registry for analysis, chat, research, generation, voice

Persistence
  PostgreSQL + Prisma              Sessions, nodes, assets, settings, materials, shares, RAG chunks
  local storage folder             Uploaded and generated files
```

The system intentionally separates task types instead of putting everything into one prompt:

```text
task classifier -> prompt registry -> model router -> tool executor -> canvas/session update
```

This keeps image analysis, file understanding, free chat, canvas actions, deep research, voice control, and image generation easier to test and explain.

## Default Model Stack

All default model settings are now Qwen/DashScope based.

| Role | Provider | Default model |
| --- | --- | --- |
| Chat controller | DashScope compatible-mode API | `qwen3.6-plus` |
| Vision and file analysis | DashScope compatible-mode API | `qwen3.6-plus` |
| Image generation | DashScope multimodal generation API | `qwen-image-2.0-pro` |
| Speech-to-text | DashScope compatible-mode API | `qwen3-livetranslate-flash-2025-12-01` |
| Realtime voice | DashScope realtime WebSocket API | `qwen3.5-omni-plus-realtime` |
| Deep research | DashScope text-generation service | `qwen-deep-research` |
| Session RAG embedding | DashScope compatible-mode API | `text-embedding-v3` |

The settings page exposes these roles so they can be changed without editing code.

## Environment

Copy `.env.example` to `.env`, then fill in your local values.

```bash
cp .env.example .env
```

Minimal local configuration:

```bash
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/oryzae?schema=public"
STORAGE_PATH="./storage"
DASHSCOPE_API_KEY=your_dashscope_key
```

Common Qwen configuration:

```bash
CHAT_PROVIDER=dashscope-qwen
CHAT_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
CHAT_MODEL=qwen3.6-plus

ANALYSIS_PROVIDER=dashscope-qwen
ANALYSIS_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ANALYSIS_MODEL=qwen3.6-plus

IMAGE_PROVIDER=dashscope-qwen-image
IMAGE_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
IMAGE_MODEL=qwen-image-2.0-pro

ASR_PROVIDER=dashscope-livetranslate
ASR_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ASR_MODEL=qwen3-livetranslate-flash-2025-12-01

REALTIME_PROVIDER=dashscope-realtime
REALTIME_API_BASE_URL=wss://dashscope.aliyuncs.com/api-ws/v1/realtime
REALTIME_MODEL=qwen3.5-omni-plus-realtime

DEEPTHINK_PROVIDER=dashscope-deep-research
DEEPTHINK_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
DEEPTHINK_MODEL=qwen-deep-research

EMBEDDING_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_MODEL=text-embedding-v3
EMBEDDING_DIM=1024
```

Role-specific keys such as `CHAT_API_KEY`, `ANALYSIS_API_KEY`, `IMAGE_API_KEY`, `ASR_API_KEY`, `REALTIME_API_KEY`, `DEEPTHINK_API_KEY`, and `EMBEDDING_API_KEY` can override `DASHSCOPE_API_KEY` when needed.

## Commands

Install dependencies:

```bash
npm install
cd app
npm install
cd ..
```

Generate Prisma client:

```bash
npm run db:generate
```

Apply database migrations:

```bash
npm run db:migrate
```

Build the React pages used by the history/share/material/settings UI:

```bash
npm run build:app
```

Start the server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The Node server serves both the backend APIs and the static frontend.

## Useful API Routes

- `GET /api/health` checks active model roles and mode.
- `GET /api/settings` returns current model and UI settings.
- `PUT /api/settings` updates API endpoints, models, keys, advanced options, theme, and language.
- `POST /api/analyze` analyzes an uploaded image.
- `POST /api/analyze-text` analyzes text as a source.
- `POST /api/analyze-url` analyzes a URL source.
- `POST /api/analyze-explore` creates deeper creative or research directions.
- `POST /api/generate` generates an image from a direction or prompt.
- `POST /api/chat` runs the chat controller and returns replies plus canvas actions.
- `POST /api/deep-research` or `POST /api/deep-think` runs the deep research workflow.
- `POST /api/asr` performs speech-to-text.
- `POST /api/realtime-voice` routes realtime voice commands.
- `POST /api/image-search` supports text/image-oriented image search flows.
- `POST /api/file-understanding` creates a file-understanding card for an uploaded material.
- `POST /api/context/ingest` and `POST /api/context/retrieve` maintain session-level RAG context.
- `GET /api/history` lists saved sessions for the history browser.
- `GET /api/materials` lists material-library items.

## Project Structure

```text
.
|-- app/                    React history/share/material/settings UI
|-- prisma/                 Prisma schema and migrations
|-- public/                 Workbench frontend and static app build output
|-- scripts/                Build, copy, and test helpers
|-- src/
|   |-- api/                Route handlers
|   |-- lib/                Storage, parsing, RAG, file understanding
|   `-- prompts/            Prompt builders and prompt routing
|-- server.js               Main Node server
|-- .env.example            Qwen/DashScope environment template
`-- README.md               ORYZAE 3.0 system guide
```

## Development Notes

- The app can run in mixed mode: roles without a configured key fall back to demo behavior where available.
- Settings stored in the database override environment defaults.
- Old legacy defaults in the database are normalized to the current Qwen defaults when settings are read.
- Keep real API keys in `.env`; do not commit `.env`.
- Large generated files, uploaded materials, and local storage artifacts should stay out of git.

## Current Direction

ORYZAE 3.0 is aimed at becoming a demo-ready multimodal canvas system where:

- the canvas expresses AI reasoning and knowledge structure;
- deep research creates evidence cards and reports instead of only chat text;
- voice, chat, research, and agents share the same tool interface;
- file understanding expands the system beyond image generation into practical work, learning, and research scenarios.
