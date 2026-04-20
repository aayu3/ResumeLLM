import type OpenAI from "openai";
import { jsonrepair } from "jsonrepair";
import {
  GapAnalysisRequestSchema,
  GapAnalysisResultSchema,
  LLMOptimizeResponseSchema,
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
 * Handles models that wrap their output in prose or markdown fences,
 * and reasoning models that prefix output with thinking blocks.
 */
function extractJson(raw: string): string {
  // Strip reasoning/thinking blocks emitted by models like QwQ and DeepSeek-R1.
  // Formats seen in the wild:
  //   <|channel>thought ... <channel|>   (LM Studio reasoning models)
  //   <think> ... </think>               (DeepSeek-R1 and derivatives)
  let cleaned = raw
    .replace(/<\|channel>thought[\s\S]*?<channel\|>/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  // Fast path: already JSON.
  if (cleaned.startsWith("{")) return cleaned;

  // Strip markdown fences.
  const stripped = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (stripped.startsWith("{")) return stripped;

  // Scan for the first { ... } block in case the model added preamble.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) return cleaned.slice(start, end + 1);

  return cleaned; // Let JSON.parse throw a meaningful error.
}

const VALID_SECTIONS = new Set([
  "summary", "experience", "skills", "education", "projects", "certifications", "other",
]);

/**
 * Some local models (e.g. Gemma) return suggestions as an array of strings
 * instead of the expected objects. Coerce string entries into the full shape
 * so Zod validation passes and callers always get a consistent structure.
 *
 * Also coerces any unrecognised section value to "other" as a safety net,
 * in case the model invents a label not in the enum (e.g. "volunteer work").
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
    if (typeof s === "object" && s !== null) {
      const suggestion = s as Record<string, unknown>;
      // Always inject a sequential id — the model is not asked to produce one.
      suggestion.id = `s${i + 1}`;
      if (!suggestion.originalText) suggestion.originalText = "";
      if (!suggestion.reason) suggestion.reason = "";
      if (typeof suggestion.section === "string" && !VALID_SECTIONS.has(suggestion.section)) {
        suggestion.section = "other";
      }
      if (!suggestion.section) suggestion.section = "other";
    }
    return s;
  });
  return obj;
}

/**
 * Parse and validate an LLM response string against a Zod schema.
 * Runs jsonrepair first to handle common local-model JSON issues
 * (unescaped quotes, missing commas, trailing commas, etc.).
 */
function parseJsonResponse<T>(raw: string, schema: { parse: (v: unknown) => T }): T {
  return schema.parse(JSON.parse(jsonrepair(extractJson(raw))));
}

/** Parses the LLM optimize response (no optimizedMarkdown) after normalization. */
function parseLLMOptimizeResponse(raw: string) {
  const parsed = normalizeOptimizePayload(JSON.parse(jsonrepair(extractJson(raw))));
  return LLMOptimizeResponseSchema.parse(parsed);
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
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const { suggestions, gapAnalysis } = parseLLMOptimizeResponse(raw);
  return OptimizeResultSchema.parse({ suggestions, gapAnalysis });
}
