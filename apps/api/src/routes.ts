import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  runGapAnalysis,
  optimizeResume,
  GapAnalysisRequestSchema,
  OptimizeRequestSchema,
} from "@resume-llm/core";
import { buildClient, extractApiKey } from "./client.js";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

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
