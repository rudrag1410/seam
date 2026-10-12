<div align="center">

# 🧵 Seam

**Resume tailoring you can review.**

Paste a job description and Seam proposes specific, inline edits to your resume, like tracked changes. You accept, reject or rewrite each one. Nothing changes unless you approve it, and nothing gets invented.

[Quick start](#-quick-start) · [Features](#-features) · [Configuration](#-configuration) · [Scripts](#-scripts) · [Architecture](docs/ARCHITECTURE.md)

</div>

## ✨ Features

- **One screen, a conversation.** Send the job description and the run streams into a chat beside your resume: read the job, score the resume, write suggestions section by section. Nothing runs until you press send.
- **Edits, not rewrites.** The model returns typed operations against your resume's structure, so untouched text can never drift and every change is exactly one decision.
- **Review like tracked changes.** Inline word-level diffs on the paper, with Accept, Reject, Edit and "ask for a different wording". Keyboard-first: `J` `K` move, `A` accept, `R` reject, `E` edit, `V` switch view, `⌘Z` undo.
- **Three views.** Suggestions, Clean (exactly what finalizing will save) and Original.
- **Nothing invented.** New numbers become `[X]` placeholders, new technologies are flagged, and anything the resume doesn't support needs a one-tap "only accept if true".
- **An honest score.** A match score broken down per requirement, estimated live as you accept, plus an ATS score with fix hints.
- **Versions.** Finalize into an immutable version, compare two versions, branch from one, and export to PDF, DOCX or plain text in two ATS-safe templates.
- **Cover letter and interview prep.** Streamed cover letters and likely interview questions for each version.
- **Onboarding that fills itself in.** Upload your resume and your profile is pre-filled from it. Works without an AI key through a built-in parser.
- **Signs you out properly.** Sessions are httpOnly cookies with rotating refresh tokens, and an expired session returns you to sign-in and back to the same page.

## 🚀 Quick start

Requires [Node 22](https://nodejs.org), [pnpm](https://pnpm.io) (`corepack enable`) and [uv](https://docs.astral.sh/uv/) (installs Python 3.12 for you).

```bash
git clone <this repo>
cd seam
pnpm install
pnpm bootstrap
pnpm dev
```

Open http://localhost:3000, create an account and upload a resume. The API runs on http://localhost:8000 and creates its SQLite database on first start.

`pnpm bootstrap` copies the two `.env.example` files and installs the API's Python dependencies. AI features need an `OPENAI_API_KEY` (see below).

### AI keys

Edit `apps/backend/.env`:

```bash
OPENAI_API_KEY=sk-...
TYPESAFE_API_KEY=
```

`TYPESAFE_API_KEY` is optional. Without it, the checks that decide what you see (is this a job description, how well does your resume cover each requirement, is a rewrite supported) fall back to deterministic code and the app says it is running in basic mode.

### With Postgres

```bash
docker compose up -d
```

Set `DATABASE_URL=postgresql+asyncpg://seam:seam@localhost:5432/seam` in `apps/backend/.env`, then `pnpm db:migrate`.

## 🧭 How to use

1. **Sign up** and upload your resume (PDF or DOCX, up to 5 MB). Check the details Seam pulled from it.
2. **Paste a job description**, or import one from a link, and press send.
3. **Watch it work.** The conversation ticks off each step while suggestions appear on your resume as they are written.
4. **Review.** Step through the suggestions, accept, reject or edit each one, or ask for a different wording.
5. **Finalize** to save a version, then export it, write a cover letter or prepare for the interview.

## ☁️ Deploying

The API and the web app deploy separately.

- **API (Render).** `render.yaml` defines the `seam-api` Docker service and its Postgres database. Apply it as a Blueprint, then set the values marked `sync: false`: `OPENAI_API_KEY`, `TYPESAFE_API_KEY`, `R2_*`, `APP_URL` and `CORS_ORIGINS`.
- **Web (Vercel).** Import the repo with the root directory `apps/frontend` and set `NEXT_PUBLIC_API_URL` to the API's URL.
- Set `APP_URL` and `CORS_ORIGINS` on the API to the Vercel URL. Cookies use `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` because the two live on different domains.

## ⚙️ Configuration

Everything is optional. `pnpm bootstrap` creates the files below from the examples.

| Variable                                                               | Default                               | Description                                                             |
| ---------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                       |                                       | Required for AI features (tailoring, cover letters, interview prep)     |
| `TYPESAFE_API_KEY`                                                     |                                       | Optional. Enables Jev for the checks that gate what you see             |
| `LLM_MODEL_OPENAI_FAST` / `_STRONG` / `_VISION`                        | `gpt-5-mini` / `gpt-5` / `gpt-5-mini` | Model ids. Pin to whatever is current for your account                  |
| `LLM_MAX_OUTPUT_TOKENS`                                                | `6000`                                | Ceiling on output per model call                                        |
| `LLM_MAX_JD_TOKENS`                                                    | `4000`                                | Longer job descriptions are rejected                                    |
| `LLM_MAX_RESUME_TOKENS`                                                | `8000`                                | Resume text sent to a model is clipped to this                          |
| `LLM_REASONING_EFFORT`                                                 | `low`                                 | Thinking effort for reasoning models. Lower is faster                   |
| `DATABASE_URL`                                                         | SQLite in `apps/backend/data`         | Any SQLAlchemy async URL. Use Postgres in production                    |
| `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`                                   | `change-me`                           | Set both to long random values anywhere that isn't your laptop          |
| `APP_URL`, `CORS_ORIGINS`                                              | `http://localhost:3000`               | Where the web app is served                                             |
| `COOKIE_SECURE`, `COOKIE_SAMESITE`                                     | `false`, `lax`                        | Use `true` and `none` when the web app and API are on different domains |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` |                                       | Cloudflare R2 for uploads and exports. Empty uses local disk            |
| `MAX_UPLOAD_MB`, `MAX_PAGES`                                           | `5`, `6`                              | Upload limits                                                           |
| `NEXT_PUBLIC_API_URL`                                                  | `http://localhost:8000`               | Web app setting, in `apps/frontend/.env.local`                          |

## 🧰 Stack

Next.js 15, React 19, Tailwind 4, TanStack Query and Zustand on the client. FastAPI, Pydantic 2 and async SQLAlchemy on the server, with OpenAI for writing and TypeSafe Jev for deciding. A pnpm and Turborepo monorepo; the TypeScript API client is generated from the API's OpenAPI document. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how everything fits together.

```
apps/
  backend/        FastAPI app: routers, services, AI pipeline, parsing, export, migrations
  frontend/       Next.js app: the tailoring workspace, resumes, activity, profile
packages/
  api-client/     Typed client and enums generated from the API
  resume-core/    Resume types, the apply-edits function, word diff, score projection
  ui/             Design tokens and components
  fixtures/       Shared test vectors, sample resumes and job descriptions
```

## 🛠 Scripts

| Command                             | Description                                                |
| ----------------------------------- | ---------------------------------------------------------- |
| `pnpm bootstrap`                    | Create the `.env` files and install the API's dependencies |
| `pnpm dev`                          | Web (3000) and API (8000) with hot reload                  |
| `pnpm build`                        | Production build of the web app                            |
| `pnpm lint` / `pnpm typecheck`      | Both languages                                             |
| `pnpm test`                         | Backend, frontend and shared-package tests                 |
| `pnpm generate`                     | Regenerate `openapi.json` and the TypeScript client        |
| `pnpm db:migrate`                   | Apply database migrations                                  |
| `pnpm --filter @seam/backend evals` | Run the AI quality evals (needs `OPENAI_API_KEY`)          |

## 🚢 Deploy

The API ships as a Docker image (`apps/backend/Dockerfile`) that migrates and serves; `render.yaml` is a ready blueprint. Deploy the web app to Vercel with `apps/frontend` as the root and `NEXT_PUBLIC_API_URL` pointing at the API. Set `OPENAI_API_KEY`, `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, `APP_URL` and `CORS_ORIGINS`, and `COOKIE_SECURE=true` with `COOKIE_SAMESITE=none` when the two live on different domains.
