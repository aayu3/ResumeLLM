import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  runGapAnalysis,
  optimizeResume,
  GapAnalysisRequestSchema,
  OptimizeRequestSchema,
  ProviderType,
  DEFAULT_BASE_URLS,
} from "@resume-llm/core";
import { buildClient, extractApiKey } from "./client.js";

// Terms that indicate a non-chat OpenAI model (audio, vision-gen, realtime, etc.).
const OPENAI_EXCLUDE_TERMS = [
  "audio", "image", "realtime", "search", "transcribe", "tts", "codex", "vision", "embedding", "sora", "whisper", "omni", "davinci", "dall-e", "babbage", "moderation",
];
function isOpenAIChatModel(id: string) {
  const lower = id.toLowerCase();
  return !OPENAI_EXCLUDE_TERMS.some((term) => lower.includes(term));
}

// Keep only Claude 3+ chat models; drop legacy claude-2, claude-instant, etc.
const ANTHROPIC_EXCLUDE_TERMS = ["claude-2", "claude-instant"];
function isAnthropicChatModel(id: string) {
  const lower = id.toLowerCase();
  return lower.startsWith("claude-") &&
    !ANTHROPIC_EXCLUDE_TERMS.some((term) => lower.startsWith(term));
}

// Sort Anthropic models newest-first by extracting the YYYYMMDD date suffix when present.
function sortAnthropicModels(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const dateA = a.match(/(\d{8})$/)?.[1] ?? "0";
    const dateB = b.match(/(\d{8})$/)?.[1] ?? "0";
    return dateB.localeCompare(dateA);
  });
}

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/models", async (c) => {
  const providerRaw = c.req.query("provider");
  const baseURLParam = c.req.query("baseURL");

  const providerResult = ProviderType.safeParse(providerRaw);
  if (!providerResult.success) {
    return c.json({ error: "Invalid or missing provider query parameter" }, 400);
  }
  const provider = providerResult.data;

  try {
    if (provider === "openai") {
      let apiKey: string;
      try {
        apiKey = extractApiKey(c.req.header("Authorization"), provider);
      } catch (err) {
        return c.json({ error: (err as Error).message }, 401);
      }
      const client = buildClient({ type: "openai", model: "" }, apiKey);
      const list = await client.models.list();
      const models = list.data
        .map((m) => m.id)
        .filter(isOpenAIChatModel)
        .sort();
      return c.json({ models });
    }

    if (provider === "anthropic") {
      let apiKey: string;
      try {
        apiKey = extractApiKey(c.req.header("Authorization"), provider);
      } catch (err) {
        return c.json({ error: (err as Error).message }, 401);
      }
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!res.ok) {
        return c.json({ error: `Anthropic returned ${res.status}` }, 502);
      }
      const json = (await res.json()) as { data?: { id: string }[] };
      const models = sortAnthropicModels(
        (json.data ?? []).map((m) => m.id).filter(isAnthropicChatModel)
      );
      return c.json({ models });
    }

    // ollama / lmstudio / custom — proxy to baseURL/models
    const baseURL =
      baseURLParam ?? DEFAULT_BASE_URLS[provider as keyof typeof DEFAULT_BASE_URLS];
    if (!baseURL) {
      return c.json({ error: "baseURL is required for custom providers" }, 400);
    }
    const res = await fetch(baseURL.replace(/\/$/, "") + "/models", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return c.json({ error: `Provider returned ${res.status}` }, 502);
    }
    const json = (await res.json()) as { data?: { id: string }[] };
    const models = (json.data ?? []).map((m) => m.id).filter(Boolean);
    return c.json({ models });
  } catch (err) {
    console.error("[models] error:", err);
    return c.json({ error: "Failed to fetch models", detail: String(err) }, 502);
  }
});

app.post("/api/gap-analysis", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = GapAnalysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { type, model } = parsed.data.provider;
  console.log(`[gap-analysis] provider=${type} model=${model}`);

  let apiKey: string;
  try {
    apiKey = extractApiKey(c.req.header("Authorization"), type);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 401);
  }

  const client = buildClient(parsed.data.provider, apiKey);

  try {
    const result = await runGapAnalysis(parsed.data, client);
    console.log(`[gap-analysis] ok score=${result.overallMatchScore}`);
    return c.json(result);
  } catch (err) {
    console.error("[gap-analysis] LLM error:", err);
    return c.json({ error: "LLM request failed", detail: String(err) }, 502);
  }
});

app.post("/api/optimize", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = OptimizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { type, model } = parsed.data.provider;
  console.log(`[optimize] provider=${type} model=${model}`);

  let apiKey: string;
  try {
    apiKey = extractApiKey(c.req.header("Authorization"), type);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 401);
  }

  const client = buildClient(parsed.data.provider, apiKey);

  try {
    const result = await optimizeResume(parsed.data, client);
    console.log(`[optimize] ok suggestions=${result.suggestions.length}`);
    return c.json(result);
  } catch (err) {
    console.error("[optimize] LLM error:", err);
    return c.json({ error: "LLM request failed", detail: String(err) }, 502);
  }
});

export default app;
