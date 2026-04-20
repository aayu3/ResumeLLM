# ResumeLLM

An AI-powered resume optimization tool with a React web UI and an MCP server for agentic workflows. Users bring their own API keys or run fully local inference — no keys ever leave the browser.

---

## Architecture Overview

```
packages/core   ← Zod schemas, system prompts, LLM orchestration. Bundled into the frontend at build time.
apps/web        ← React SPA. Calls LLM providers directly from the browser — no backend required.
apps/api        ← Hono server + MCP server. For local agentic workflows only, not needed for the web app.
scripts/        ← Dev utilities (smoke-test, etc.)
```

### How it works

`packages/core` contains the prompts, schemas, and LLM logic as plain TypeScript. Vite bundles it directly into the frontend JavaScript at build time — there is no server involved at runtime for the web app.

When a user submits a resume, the browser:
1. Builds the prompt using `packages/core`
2. Constructs an OpenAI-compatible client pointed at the user's chosen provider
3. Calls the provider API directly (OpenAI, Anthropic, Ollama, LM Studio, or any custom endpoint)
4. Parses and renders the response locally

**API keys never touch a server.** They exist only in the browser and travel directly to the provider. The deployed app is 100% static files on a CDN.

### Provider support

| Provider | Key required | How it's called |
|---|---|---|
| OpenAI | Yes (user-supplied) | Direct from browser via OpenAI SDK |
| Anthropic | Yes (user-supplied) | Direct from browser via OpenAI SDK + `x-api-key` header |
| Ollama | No | Direct from browser to `localhost:11434` |
| LM Studio | No | Direct from browser to `localhost:1234` |
| Custom endpoint | Optional | Direct from browser to user-specified URL |

### MCP server (`apps/api`)

The API package exists for agentic use cases — running `gap_analysis` and `optimize_resume` as MCP tools inside Claude Code or Claude Desktop. It is run locally by the user, not deployed to the cloud. Keys are passed via environment variables in `claude_desktop_config.json`.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | LTS recommended |
| pnpm | 10+ | `npm install -g pnpm` |
| Git | any | |
| Ollama | latest | Optional — for local inference without an API key |
| LM Studio | latest | Optional — alternative local inference |

---

## Initial Setup

```bash
git clone <repo-url>
cd ResumeLLM
pnpm install
```

That's it. There are no environment files required to run the smoke test against a local provider.

---

## Running the Smoke Test

The smoke test exercises `runGapAnalysis` and `optimizeResume` end-to-end against a real provider. It prints structured results to the terminal.

### On Linux / macOS / WSL (bash)

```bash
# Ollama (default — must have ollama running and llama3.2 pulled)
pnpm smoke-test

# LM Studio (must have the server running on port 1234)
PROVIDER=lmstudio MODEL=your-model-name pnpm smoke-test

# OpenAI
PROVIDER=openai OPENAI_API_KEY=sk-... pnpm smoke-test

# Anthropic
PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... MODEL=claude-haiku-4-5-20251001 pnpm smoke-test

# Any OpenAI-spec-compatible endpoint (vLLM, LiteLLM, Together AI, etc.)
PROVIDER=custom BASE_URL=http://your-server/v1 MODEL=your-model pnpm smoke-test
```

### On Windows (PowerShell)

PowerShell does not support `KEY=value command` syntax. Set env vars separately:

```powershell
# Ollama
pnpm smoke-test

# LM Studio
$env:PROVIDER="lmstudio"; $env:MODEL="gemma-4-26b-a4b"; pnpm smoke-test

# OpenAI
$env:PROVIDER="openai"; $env:OPENAI_API_KEY="sk-..."; pnpm smoke-test

# Custom endpoint
$env:PROVIDER="custom"; $env:BASE_URL="http://localhost:11434/v1"; $env:MODEL="llama3.2"; pnpm smoke-test
```

> **Important:** PowerShell env vars persist for the session. After switching providers, clear stale vars or they will bleed into the next run:
> ```powershell
> "PROVIDER","MODEL","BASE_URL","OPENAI_API_KEY","ANTHROPIC_API_KEY" | ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
> ```

### Env var reference

| Variable | Required for | Default |
|---|---|---|
| `PROVIDER` | all | `ollama` |
| `MODEL` | all | provider-specific default (see below) |
| `BASE_URL` | `custom` (required), `ollama`/`lmstudio` (optional override) | provider-specific default |
| `OPENAI_API_KEY` | `openai` | — |
| `ANTHROPIC_API_KEY` | `anthropic` | — |

Default models: `openai` → `gpt-4o-mini`, `anthropic` → `claude-sonnet-4-6`, `ollama` → `llama3.2`, `lmstudio` → `local-model`.

Default base URLs: `ollama` → `http://localhost:11434/v1`, `lmstudio` → `http://localhost:1234/v1`.

---

## Current Implementation State

### Done — `packages/core`

This package is fully implemented and type-checks clean. It is the only package with real code today.

#### `src/schemas.ts`
Zod schemas and TypeScript types for all domain objects:

- **`ProviderType`** — `"openai" | "anthropic" | "ollama" | "lmstudio" | "custom"`
- **`ProviderMetaSchema`** — `{ type, model, baseURL? }`. No API keys. The `custom` type accepts any OpenAI-spec-compatible endpoint (vLLM, LiteLLM, Together AI, etc.).
- **`DEFAULT_MODELS`** / **`DEFAULT_BASE_URLS`** — convenience defaults for the API layer.
- **`GapAnalysisRequestSchema`** / **`GapAnalysisResultSchema`** — gap analysis request and structured result.
- **`OptimizeRequestSchema`** / **`OptimizeResultSchema`** — optimize request, `Suggestion[]` (bullet-level), and nested gap analysis result.

`Suggestion` shape:
```ts
{ id: string, originalText: string, suggestedText: string, reason: string,
  section: "summary" | "experience" | "skills" | "education" | "other" }
```

#### `src/prompts.ts`
Per-provider system prompts and user-turn builders.

- **`getSystemPrompt(task, providerType, override?)`** — returns the appropriate system prompt. Pass `override` to replace the default entirely (useful for A/B testing or provider-specific tuning).
- Cloud providers (`openai`, `anthropic`) get detailed schema descriptions.
- Local providers (`ollama`, `lmstudio`) get simpler instructions plus a **concrete filled-in example object** for the `suggestions` array. This is important — without the example, smaller models return suggestions as plain strings instead of objects.
- `custom` falls back to the OpenAI prompt by default.
- **`buildGapAnalysisPrompt(resumeMarkdown, jobDescription)`**
- **`buildOptimizePrompt(resumeMarkdown, jobDescription)`**

#### `src/llm.ts`
The two exported core functions:

- **`runGapAnalysis(request, client, systemPromptOverride?)`**
- **`optimizeResume(request, client, systemPromptOverride?)`**

Both accept a pre-built `OpenAI` client (constructed by the caller — never by core). Key behaviors:

- `response_format: { type: "json_object" }` is **only sent for `openai` provider type** with no `baseURL` override. All other providers rely on prompt instructions alone — many local/proxy endpoints reject this parameter.
- **`extractJson(raw)`** — strips markdown fences and scans for the first `{...}` block. Handles models that wrap JSON in prose.
- **`normalizeOptimizePayload`** — coerces `suggestions` entries that are plain strings (a known failure mode of some local models, observed with Gemma 4) into the full object shape before Zod validation.

#### `src/index.ts`
Barrel export — re-exports everything from the three files above.

---

## Design Decisions

**Why is `packages/core` bundled into the frontend?**
The prompts, schemas, and LLM orchestration are plain TypeScript with no server-side dependencies. Vite bundles them into the frontend JS at build time. This means the deployed app is 100% static — no server, no runtime cost, no infrastructure to maintain.

**Why does `packages/core` take a pre-built `OpenAI` client?**
Core functions never construct clients themselves, so they never touch API keys. The caller (browser or MCP server) is the only place a key is handled. This keeps the core testable and key-agnostic.

**Why `ProviderMeta` instead of passing keys through?**
`ProviderMeta` carries only `{ type, model, baseURL? }` — the non-secret metadata. Keys are passed separately and only as far as client construction. Nothing in `ProviderMeta` is sensitive.

**Why bullet-level suggestions?**
`Suggestion` maps each change to an `originalText` / `suggestedText` pair. The `originalText` string is enough to locate the bullet in the resume without needing character offsets, which keeps the schema simple and the editor integration flexible.

**Why per-provider system prompts?**
Local models need simpler, more literal instructions and concrete examples. Cloud models handle schema descriptions in prose. Keeping them separate means you can tune each independently without affecting function signatures.

**Why `normalizeOptimizePayload`?**
Observed in practice: Gemma 4 (via LM Studio) returned `suggestions` as an array of strings despite being shown the schema. The normalization coerces these into valid objects so the call succeeds rather than throwing a Zod validation error.

---

## Deploying to Cloudflare Pages

The web app is fully static — no server required. Deploy it to Cloudflare Pages for free.

### 1. Push your code to GitHub

### 2. Create a Cloudflare Pages project

- Go to [cloudflare.com](https://cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
- Select your `ResumeLLM` repo

### 3. Set build settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `pnpm --filter=@resume-llm/core build && pnpm --filter=@resume-llm/web build` |
| Build output directory | `apps/web/dist` |

No environment variables are needed — all provider calls go directly from the browser.

### 4. Deploy

Click **Save and Deploy**. Every push to `main` redeploys automatically.

**Cost: $0** — Cloudflare Pages free tier has unlimited bandwidth and no build minute limits for public repos.

---

## Running the MCP Server locally

The `apps/api` package exposes `gap_analysis` and `optimize_resume` as MCP tools for use in Claude Code or Claude Desktop. It is not deployed — run it locally.

```bash
pnpm dev
```

Configure your MCP client to point at `http://localhost:8787/mcp` and set your API key in the environment.

---

## Repo Scripts

| Command | What it does |
|---|---|
| `pnpm smoke-test` | Run end-to-end test against a real provider (see above) |
| `pnpm build` | Build all packages via Turborepo |
| `pnpm dev` | Start all apps in dev mode (nothing to start yet) |
| `pnpm test` | Run Vitest across all packages |
| `pnpm lint` | Type-check all packages |
| `pnpm inspect` | Launch MCP Inspector for testing MCP tools |
