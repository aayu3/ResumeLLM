# ResumeLLM

An AI-powered resume optimization tool with a React web UI and an MCP server for agentic workflows. Users bring their own API keys or run fully local inference — no keys are ever stored on the server.

---

## Architecture Overview

```
packages/core        ← The source of truth. Zod schemas, system prompts, LLM orchestration.
apps/api             ← Hono server. REST backend for the web UI + MCP server for agents.  [NOT YET BUILT]
apps/web             ← React frontend with resume editor.                                  [NOT YET BUILT]
scripts/             ← Dev utilities (smoke-test, etc.)
```

### The Stateless Relay Pattern (Security Model)

`packages/core` functions **never receive API keys**. Instead:

- **Web flow**: The UI sends the key in the `Authorization` header. The API layer extracts it, constructs an OpenAI-compatible client, and passes that client into core functions.
- **Agent flow**: The MCP server reads the key from environment variables set in `claude_desktop_config.json`.
- **Local flow**: Ollama and LM Studio require no keys at all — the client is constructed with a dummy key and a `baseURL` pointing at localhost.

This means if a request body or log is ever exposed, no secrets leak.

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

### Not Yet Built

#### `apps/api` — Hono API + MCP Server
This is the next thing to build. Responsibilities:

1. **Client construction** — extract the API key from the `Authorization: Bearer <key>` header (or env var for agent flow), read `ProviderMeta` from the request body, and build an `OpenAI` client:
   ```ts
   new OpenAI({
     apiKey,
     baseURL: meta.baseURL ?? DEFAULT_BASE_URLS[meta.type]
   })
   ```
2. **REST routes** (for the web UI):
   - `POST /api/gap-analysis` → calls `runGapAnalysis`
   - `POST /api/optimize` → calls `optimizeResume`
3. **MCP tools** (for Claude Code / agentic flows):
   - `gap_analysis` tool
   - `optimize_resume` tool
4. **Transport**: SSE or Streamable HTTP. The plan targets Cloudflare Workers (Wrangler) for local dev, migrating to Azure Functions for production.

#### `apps/web` — React Frontend
Not started. Planned features:
- Resume input (paste Markdown or upload)
- Job description input
- Provider/model selector UI (sends `ProviderMeta` + key per request — no server-side key storage)
- Results view with Accept/Reject suggestions
- Editor (Tiptap or similar — kept decoupled from core so it can be swapped)

---

## Design Decisions Recorded Here

**Why Option B for API keys (key-agnostic core)?**
Core functions take a pre-built `OpenAI` client instead of raw credentials. This means keys never appear in request bodies, log lines, or error reports. The API/MCP layer is the only place that ever touches a secret.

**Why `ProviderMeta` instead of a full provider config with keys?**
`ProviderMeta` carries only `{ type, model, baseURL? }` — the non-secret metadata core needs. This is what travels in request bodies and what gets logged safely.

**Why bullet-level suggestions?**
`Suggestion` maps each change to an `originalText` / `suggestedText` pair. The `originalText` string is enough to locate the bullet in the resume without needing character offsets, which keeps the schema simple and the editor integration flexible.

**Why per-provider system prompts?**
Local models need simpler, more literal instructions and concrete examples. Cloud models handle schema descriptions in prose. Keeping them separate (with `getSystemPrompt`) means you can tune each independently without affecting the function signatures callers depend on.

**Why `normalizeOptimizePayload`?**
Observed in practice: Gemma 4 (via LM Studio) returned `suggestions` as an array of human-readable strings despite being shown the schema. The normalization coerces these into valid objects so the call succeeds rather than throwing a Zod validation error. The improved local model prompts (with a concrete example object) are the primary fix; the coercion is a safety net.

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
