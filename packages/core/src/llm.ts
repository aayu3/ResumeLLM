import type OpenAI from "openai";
import {
  GapAnalysisRequestSchema,
  GapAnalysisResultSchema,
  OptimizeRequestSchema,
  OptimizeResultSchema,
  type GapAnalysisRequest,
  type GapAnalysisResult,
  type OptimizeRequest,
  type OptimizeResult,
  type ProviderType,
} from "./schemas.js";
import {
  buildGapAnalysisPrompt,
  buildOptimizePrompt,
  getSystemPrompt,
} from "./prompts.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Only OpenAI reliably enforces response_format: json_object.
 * Anthropic supports it via their own API but the OpenAI-compat layer is
 * inconsistent. Local providers (Ollama, LM Studio) and custom endpoints
 * may silently ignore it, causing the completion to return plain text with
 * the JSON embedded in prose — handled by extractJson below.
 */
function supportsJsonResponseFormat(providerType: ProviderType): boolean {
  return providerType === "openai";
}

/**
 * Extract the first complete JSON object from a string.
 * Handles models that wrap their output in prose or markdown fences.
 */
function extractJson(raw: string): string {
  // Fast path: the whole string is already JSON.
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;

  // Strip markdown fences.
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (stripped.startsWith("{")) return stripped;

  // Scan for the first { ... } block in case the model added preamble.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);

  return raw; // Let JSON.parse throw a meaningful error.
}

/**
 * Some local models (e.g. Gemma) return suggestions as an array of strings
 * instead of the expected objects. Coerce string entries into the full shape
 * so Zod validation passes and callers always get a consistent structure.
 */
function normalizeOptimizePayload(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) return parsed;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.suggestions)) return obj;

  obj.suggestions = obj.suggestions.map((s: unknown, i: number) => {
    if (typeof s === "string") {
      return {
        id: `s${i + 1}`,
        originalText: "",
        suggestedText: s,
        reason: s,
        section: "other",
      };
    }
    return s;
  });
  return obj;
}

/** Parse and validate an LLM response string against a Zod schema. */
function parseJsonResponse<T>(raw: string, schema: { parse: (v: unknown) => T }): T {
  return schema.parse(JSON.parse(extractJson(raw)));
}

/** Same as parseJsonResponse but runs normalizeOptimizePayload first. */
function parseOptimizeResponse(raw: string): OptimizeResult {
  const parsed = normalizeOptimizePayload(JSON.parse(extractJson(raw)));
  return OptimizeResultSchema.parse(parsed);
}

// ── Core functions ────────────────────────────────────────────────────────────
// Each function accepts a validated request object and a pre-built OpenAI-
// compatible client. The client is constructed by the API / MCP layer, which
// is the only place that ever touches secrets.

export async function runGapAnalysis(
  request: GapAnalysisRequest,
  client: OpenAI,
  systemPromptOverride?: string
): Promise<GapAnalysisResult> {
  const validated = GapAnalysisRequestSchema.parse(request);

  const response = await client.chat.completions.create({
    model: validated.provider.model,
    messages: [
      {
        role: "system",
        content: getSystemPrompt("gap_analysis", validated.provider.type, systemPromptOverride),
      },
      {
        role: "user",
        content: buildGapAnalysisPrompt(validated.resumeMarkdown, validated.jobDescription),
      },
    ],
    ...(supportsJsonResponseFormat(validated.provider.type)
      ? { response_format: { type: "json_object" as const } }
      : {}),
    temperature: 0.2,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return parseJsonResponse(raw, GapAnalysisResultSchema);
}

export async function optimizeResume(
  request: OptimizeRequest,
  client: OpenAI,
  systemPromptOverride?: string
): Promise<OptimizeResult> {
  const validated = OptimizeRequestSchema.parse(request);

  const response = await client.chat.completions.create({
    model: validated.provider.model,
    messages: [
      {
        role: "system",
        content: getSystemPrompt("optimize", validated.provider.type, systemPromptOverride),
      },
      {
        role: "user",
        content: buildOptimizePrompt(validated.resumeMarkdown, validated.jobDescription),
      },
    ],
    ...(supportsJsonResponseFormat(validated.provider.type)
      ? { response_format: { type: "json_object" as const } }
      : {}),
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return parseOptimizeResponse(raw);
}
