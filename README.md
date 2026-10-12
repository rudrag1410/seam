# Seam

Resume tailoring you can review. Paste a job description and Seam proposes **specific, inline edits to your resume**, like tracked changes. You accept, reject or rewrite each one. Nothing changes unless you approve it, and nothing gets invented.

Built for the Full Stack Developer assignment (Resume Customizer). The product design is in the assignment brief; this README documents what is built and how to run it.

> **Live app:** _add your deployed URL here after following [Deployment](#deployment)._ · **Demo video:** _optional_

## What it does

| Assignment requirement | How Seam does it |
| --- | --- |
| JD input + validation | A chat-style composer with a live character count, a 300-character minimum and a 16,000-character cap. Nothing runs until you send it. A classifier rejects text that isn't a JD (e.g. a pasted resume), injected instructions are stripped, and a posting can be imported from a URL (SSRF-guarded). |
| Resume upload (PDF/DOCX) | Drag and drop, shows file name, size, page count and what was found. Parsed server-side with PyMuPDF / python-docx; scanned or garbled PDFs fall back to OpenAI vision. |
| LLM customization | Per-section, per-role generation of **typed patch operations** (rewrite summary, rephrase/reorder/insert/remove bullets, add/remove skills), run in parallel. |
| Output display | One screen: a conversation on the left, the resume on the right. The run streams into the conversation step by step (read the job, score the resume, write suggestions per section), and the resume shows each suggestion as an inline word-level diff the moment it arrives. Three views: Suggestions, Clean (exactly what finalizing saves), Original. |
| Download | PDF, DOCX and plain text, in two ATS-safe templates. |
| Error handling | Stable typed error codes, mapped to copy and a recovery action in the UI. Inputs survive failures. Model calls retry on a fallback model, behind a circuit breaker. |

**Bonus features, all included:** match score (explainable, updates live as you accept), diff view, multiple versions with compare and branch, section-wise customization with intensity, cover letter (streamed), ATS score with fix hints, authentication (httpOnly-cookie sessions with rotating refresh tokens), streaming (SSE that resumes after a refresh).

**Beyond the brief:** onboarding that prefills your profile from your resume, a fit check against your preferences (CTC is compared in code and never sent to a model), a fabrication guard, asking for a different wording of any suggestion from the composer, interview prep, an activity feed, a command palette (`⌘K`), keyboard-first review (`J K A R E`), dark mode.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4, TanStack Query, Zustand, Motion, cmdk, react-hook-form + zod |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async) + Alembic |
| Database | SQLite for zero-setup local dev, PostgreSQL in production (same code, `DATABASE_URL`) |
| Storage | Local disk by default, Cloudflare R2 (S3 API) when `R2_ENDPOINT` is set |
| Parsing | PyMuPDF, python-docx, OpenAI vision for scans |
| Export | ReportLab (PDF), python-docx (DOCX), plain text |
| Monorepo | pnpm workspaces + Turborepo, one task graph for TypeScript and Python |

### LLM providers and models

- **OpenAI generates.** Resume structuring, JD analysis, section tailoring, cover letters, interview prep, vision parsing. Model ids come from env: `LLM_MODEL_OPENAI_FAST` (default `gpt-5-mini`), `LLM_MODEL_OPENAI_STRONG` (default `gpt-5`), `LLM_MODEL_OPENAI_VISION`. Pin them to whatever is current for your account.
- **TypeSafe Jev decides** ([docs](https://docs.typesafe.ai/introduction)). Jev is a classifier, not a generator: you send it a state and typed questions (`Choice`, `Score`, `Noul`) and get answers with calibrated confidence. Seam uses it to gate the input (is this a JD? any injected instructions?), read JD facets, rate how well the resume covers each requirement, verify each rewrite against the candidate's evidence, and route regenerate instructions. A different model checking the writer removes the "model agrees with itself" bias. Pinned via `TYPESAFE_DEFAULT_MODEL`.
- **Every call is capped.** Each task has an output-token budget under a global ceiling (`LLM_MAX_OUTPUT_TOKENS`), job descriptions are rejected over `LLM_MAX_JD_TOKENS`, and resume text is clipped to `LLM_MAX_RESUME_TOKENS` before it is sent. Reasoning models run at a lower effort for extraction tasks (`LLM_REASONING_EFFORT`).
- **OpenAI is optional for uploads.** Without a key, resumes are read by a built-in parser and tailoring explains that AI isn't set up.
- **Jev is optional.** Without `TYPESAFE_API_KEY` (or when Jev is down) every decision has a deterministic fallback, and the UI says _"Some checks are running in basic mode."_ OpenAI is the only required key.

## Architecture

```mermaid
flowchart TB
    subgraph FE["Next.js (Vercel)"]
        UI["Review workspace<br/>Zustand store, optimistic decisions"]
        CORE["@seam/resume-core<br/>applyOps, word diff, score projection"]
    end
    subgraph API["FastAPI"]
        R["Routers /v1"] --> S["Services"]
        S --> P["Parsing<br/>PyMuPDF, python-docx"]
        S --> T["Tailor pipeline<br/>fan-out per section"]
        T --> G["Guards<br/>references, fabrication, injection"]
        T --> GW["Gateway"]
        S --> E["Export<br/>PDF, DOCX, TXT"]
    end
    GW -->|"generate"| OAI["OpenAI"]
    GW -->|"decide"| JEV["TypeSafe Jev"]
    UI -- "REST + SSE" --> R
    S --> DB[("Postgres / SQLite")]
    S --> ST[("R2 / local disk")]
```

**Request flow for a tailor session**

1. `POST /v1/tailor-sessions` validates ownership, persists the session and returns `202 {id}` immediately.
2. A background task reads the job, then runs the pipeline. Model output is parsed as it streams, so each suggestion is checked, persisted and published to an in-process, replayable event log the moment the model finishes writing it. The first `tailoring` event carries the plan (pieces of work per section) and each piece reports back when it finishes, which is what lets the UI tick sections off one by one.
3. `GET /v1/tailor-sessions/{id}/stream` relays those events over SSE. Each SSE `id` is a sequence number, so a reconnecting `EventSource` resumes via `Last-Event-ID`. After the run, a refresh replays from the database.

**The workspace**

`/tailor/new` and `/tailor/{id}` render the same component (`features/workspace`). Sending the job description starts the session and swaps the address in place, so there is no second screen to load. The conversation is derived from the run's state (`steps.ts`, pure and unit-tested), so a refresh or a reconnect rebuilds the same thread. The suggestion under review sits in a fixed dock above the composer rather than floating over the resume, so accepting, rejecting and stepping never cover or move the document.

**The pipeline (the part that matters)**

```
analyze JD ──► Jev input gate (is it a JD? injected instructions?) ──► OpenAI structured analysis
resume AST (stable node ids) ──► score before (Jev rates every requirement; keyword fallback)
for each section / role, in parallel (semaphore of 6):
    OpenAI proposes ops as strict JSON  ──►  schema validation (+1 repair attempt)
    reference check  (target exists, right kind, in this section)
    fabrication guard (new numbers become [X] placeholders; new tech is flagged)
    Jev grounding battery: supported? overstated? contradicts? does the rewrite beat the original?
        contradicts / not an improvement / different work  → dropped
        overstated / unsupported / low confidence           → "only accept if true", needs one-tap confirm
score projected (accepted-by-default ops applied, re-scored)
```

Key design decisions:

- **The model never rewrites the document.** It emits operations that reference node ids, so untouched content cannot drift, every change maps to exactly one UI decision, and output tokens drop several-fold.
- **Prompt injection has nowhere to go.** Job descriptions are wrapped as untrusted data, invisible characters are stripped, suspicious lines are removed, and output is schema-constrained and id-referenced.
- **One pure function applies edits** (`apply_ops`), implemented in Python and TypeScript and run against the same JSON vectors in `packages/fixtures/apply-ops`, so the client preview and the server's finalized version cannot disagree.
- **Prompts are versioned files** (`apps/backend/app/ai/prompts/v1/*.j2`), and `prompt_version` is stored on each session.

### Repository layout

```
apps/
  frontend/              Next.js app (features/ sliced by domain, app/ routes)
  backend/               FastAPI app
    app/api/v1/          thin routers
    app/services/        business logic
    app/ai/              gateway (OpenAI, Jev, breaker), decisions (Jev batteries),
                         prompts, pipelines, guards, ops, scoring
    app/parsing/         validate, pdf, docx, heuristics, consistency check
    app/export/          pdf, docx, txt
    app/storage/         local + Cloudflare R2
    alembic/             migrations
    evals/               LLM eval harness
    tests/               unit + integration
packages/
  api-client/            generated OpenAPI types + typed fetch/SSE client
  resume-core/           AST types, applyOps, word diff, live score projection
  ui/                    design tokens + primitives
  fixtures/              shared test vectors, sample resumes and JDs
  tsconfig/
infra/                   docker-compose for Postgres (optional)
```

`@seam/api-client` is **generated, never hand-written**: the backend exports `openapi.json` without starting a server, and `openapi-typescript` turns it into types. Turborepo orders those tasks, so changing a Pydantic model and running `pnpm dev` regenerates the client before Next.js type-checks against it. CI fails on drift.

## Local setup

**Prerequisites:** Node 20+, pnpm 9+, [uv](https://docs.astral.sh/uv/) (installs Python 3.12 for you). Docker is optional.

```bash
pnpm install
```

```bash
uv sync --directory apps/backend
```

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Add `OPENAI_API_KEY` (and optionally `TYPESAFE_API_KEY`) to `apps/backend/.env`. No key? Set `AI_MODE=mock` for a deterministic offline stand-in so you can click through the whole product.

```bash
pnpm dev
```

This regenerates the API client, then starts Next.js on <http://localhost:3000> and the API on <http://localhost:8000>. SQLite is created automatically, so no database setup is needed.

To run against Postgres locally: `docker compose -f infra/docker-compose.yml up -d`, set `DATABASE_URL=postgresql+asyncpg://seam:seam@localhost:5432/seam`, then `pnpm db:migrate`.

| Command | What it does |
| --- | --- |
| `pnpm lint` / `typecheck` / `test` | Both languages, cached by Turborepo |
| `pnpm generate` | Regenerate `openapi.json` and the TypeScript client |
| `pnpm --filter @seam/backend evals` | Run the LLM eval harness (needs `OPENAI_API_KEY`, or `AI_MODE=mock`) |
| `pnpm db:migrate` | Apply Alembic migrations |
| `TEST_DATABASE_URL=postgresql://… pnpm test` | Run the backend suite against Postgres instead of SQLite |

## Testing

- **Backend (80 tests; SQLite by default, PostgreSQL via `TEST_DATABASE_URL`):** `apply_ops` against shared vectors, the fabrication and injection guards, keyword canonicalization, match / ATS / fit scorers, parsing and upload validation, the tailoring pipeline's gating logic (contradiction, overstatement, low confidence, no-op, scope) with scripted OpenAI and Jev fakes, gateway retry / repair / fallback / circuit breaker, and an end-to-end API flow (signup → upload → start from pasted text → stream → review → finalize → export → cover letter). The suite ignores `.env` and the shell environment, so it can never reach real services.
- **Frontend:** `@seam/resume-core` parity tests (the same vectors as the backend) the review view-model, which holds every review state (pending, accepted, rejected, edited, reordered, flagged) as pure, tested functions, the conversation's step model, and session-expiry handling.
- **Evals** (`apps/backend/evals`): resume × JD pairs, including an adversarial JD with injected instructions, gated on _zero unflagged invented claims_, concision and coverage lift. With real keys these are the numbers to tune prompts and Jev thresholds against.

## Deployment

The assignment requires a public URL. Everything needed is in the repo, but it needs **your accounts and keys**, so it isn't deployed from this repo as delivered.

**API (Render, free tier works):** create a Blueprint from `render.yaml`. Set `OPENAI_API_KEY`, optionally `TYPESAFE_API_KEY`, and `APP_URL` / `CORS_ORIGINS` to your Vercel URL. The Dockerfile runs migrations, then serves; `/readyz` is the health check. `DATABASE_URL` is wired from the managed Postgres, and `postgres://` URLs are normalised to the async driver automatically.

**Frontend (Vercel):** import the repo, set the root directory to `apps/frontend`, enable "include source files outside the root directory", set the install command to `cd ../.. && pnpm install --frozen-lockfile`, and set `NEXT_PUBLIC_API_URL` to the API URL. The generated client is committed, so the build needs no Python.

Because the frontend and API live on different domains, the blueprint sets `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`. If you can put both under one parent domain (`app.example.com` and `api.example.com`) set `COOKIE_DOMAIN` instead and keep `lax`. The browser's `EventSource` connects straight to the API domain, which avoids serverless duration limits and proxy buffering for SSE.

**Files:** on Render's free tier local disk is ephemeral. Set the `R2_*` variables for durable exports and uploads.

## Security and privacy

- Passwords hashed with argon2id. Short-lived access JWT plus a rotating refresh token in `httpOnly` cookies; presenting a used refresh token revokes the whole family.
- State-changing browser requests are origin-checked on top of `SameSite`.
- Compensation is encrypted at rest, decrypted only for its owner, and **excluded from every prompt**. Fit checks compare it in code.
- Uploads are validated by magic bytes, not extension: 5 MB and 6-page caps, password-protected PDFs rejected with a clear message. Files are stored privately and, with R2, served via 5-minute presigned URLs.
- URL import fetches server-side with scheme and private-IP (SSRF) checks, a 5 s timeout and a 2 MB cap.
- "Delete my data" removes the user, every row by cascade, and the user's stored files.
- Only `.env.example` files are committed.

## Known limitations and trade-offs

- **Single-process event log instead of Redis + a worker.** Generation runs as a background task in the API process and events are replayable from memory, then from the database after the run. That is simple and refresh-safe, but a deploy or restart mid-generation fails that session (the user can retry with their inputs saved), and it won't scale across multiple API instances. `TailorBroker` has the same contract as a Redis Streams relay, so swapping it in is contained.
- **No rate limiting** yet. Add a Redis token bucket before opening signups publicly.
- **Google OAuth, page thumbnails and the mobile swipe-to-review card stack** from the original brief are not built. Email + password auth is.
- **Exports use ReportLab, not WeasyPrint**, to avoid system dependencies (pango) in the container. The tradeoff is simpler typography than an HTML template would give.
- **Live OpenAI and Jev calls are not part of the automated suite.** The OpenAI client (structured output, streaming, repair, fallback, breaker) and Jev client (caching, degraded mode) are covered by tests with fakes, and one manual end-to-end run with real keys has been done. Use `pnpm --filter @seam/backend evals` with keys set to measure quality.
- **The composer in a review rewrites the selected suggestion; it is not a general chat.** There is no free-form conversation with the model yet.
- **Scores are estimates.** They are explainable and stable, but they aren't a real ATS vendor's algorithm, and the UI labels them so.
- **Compensation fit** only works when the JD states a range in the same currency; there is no currency conversion.
- **Jev thresholds are version-specific.** Re-run the evals before changing the pinned Jev model.
- **English only.**

Short architecture decision records are in [`docs/decisions`](docs/decisions).
