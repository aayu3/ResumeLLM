import type OpenAI from "openai";
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
} from "./schemas.ts";
import {
  buildGapAnalysisPrompt,
  buildOptimizePrompt,
  getSystemPrompt,
} from "./prompts.ts";

function supportsJsonResponseFormat(providerType: ProviderType): boolean {
  return providerType === "openai";
}

function extractJson(raw: string): string {
  let cleaned = raw
    .replace(/<\|channel>thought[\s\S]*?<channel\|>/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  if (cleaned.startsWith("{")) return cleaned;

  const stripped = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (stripped.startsWith("{")) return stripped;

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) return cleaned.slice(start, end + 1);

  return cleaned;
}

const VALID_SECTIONS = new Set([
  "summary", "experience", "skills", "education", "projects", "certifications", "other",
]);

function normalizeOptimizePayload(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) return parsed;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.suggestions)) return obj;

  obj.suggestions = obj.suggestions.map((s: unknown, i: number) => {
    if (typeof s === "string") {
      return { id: `s${i + 1}`, originalText: "", suggestedText: s, reason: s, section: "other" };
    }
    if (typeof s === "object" && s !== null) {
      const suggestion = s as Record<string, unknown>;
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

function parseJsonResponse<T>(raw: string, schema: { parse: (v: unknown) => T }): T {
  return schema.parse(JSON.parse(extractJson(raw)));
}

function parseLLMOptimizeResponse(raw: string) {
  const parsed = normalizeOptimizePayload(JSON.parse(extractJson(raw)));
  return LLMOptimizeResponseSchema.parse(parsed);
}

export async function runGapAnalysis(
  request: GapAnalysisRequest,
  client: OpenAI,
  systemPromptOverride?: string
): Promise<GapAnalysisResult> {
  const validated = GapAnalysisRequestSchema.parse(request);

  const response = await client.chat.completions.create({
    model: validated.provider.model,
    messages: [
      { role: "system", content: getSystemPrompt("gap_analysis", systemPromptOverride) },
      { role: "user", content: buildGapAnalysisPrompt(validated.resumeMarkdown, validated.jobDescription) },
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
  const task = validated.isPdf ? "optimize_pdf" : "optimize";

  const response = await client.chat.completions.create({
    model: validated.provider.model,
    messages: [
      { role: "system", content: getSystemPrompt(task, systemPromptOverride) },
      { role: "user", content: buildOptimizePrompt(validated.resumeMarkdown, validated.jobDescription) },
    ],
    ...(supportsJsonResponseFormat(validated.provider.type)
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const { originalContent, suggestions, gapAnalysis } = parseLLMOptimizeResponse(raw);
  return OptimizeResultSchema.parse({ originalContent, suggestions, gapAnalysis });
}
