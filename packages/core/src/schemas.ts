import { z } from "zod";

// ── Provider metadata (no secrets) ──────────────────────────────────────────
// Core only needs to know the provider type (for prompt selection) and model.
// API keys and base URLs are handled exclusively by the API / MCP layer.

export const ProviderType = z.enum([
  "openai",
  "anthropic",
  "ollama",
  "lmstudio",
  "custom", // Any OpenAI-spec-compatible endpoint (vLLM, LiteLLM, Together AI, etc.)
]);
export type ProviderType = z.infer<typeof ProviderType>;

export const ProviderMetaSchema = z.object({
  type: ProviderType,
  model: z.string().min(1),
  /**
   * Optional base URL override.
   * - openai/anthropic: leave unset to use the provider's default endpoint.
   * - ollama: defaults to http://localhost:11434/v1
   * - lmstudio: defaults to http://localhost:1234/v1
   * - custom: required — point at any OpenAI-spec-compatible endpoint.
   */
  baseURL: z.string().url().optional(),
});
export type ProviderMeta = z.infer<typeof ProviderMetaSchema>;

// Default base URLs used by the API layer when baseURL is not provided.
export const DEFAULT_BASE_URLS: Partial<Record<ProviderType, string>> = {
  ollama: "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1",
  // openai/anthropic: the openai SDK uses its own defaults; leave undefined.
  // custom: caller must always supply baseURL.
};

// Default model names per provider — used by the API layer when the caller
// doesn't specify a model.
export const DEFAULT_MODELS: Partial<Record<ProviderType, string>> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-6",
  ollama: "llama3.2",
  lmstudio: "local-model",
  // custom: no safe default — caller must always specify model.
};

// ── Gap analysis ─────────────────────────────────────────────────────────────

export const GapAnalysisResultSchema = z.object({
  missingKeywords: z.array(z.string()),
  missingSkills: z.array(z.string()),
  toneIssues: z.array(z.string()),
  strengthsFound: z.array(z.string()),
  overallMatchScore: z.number().min(0).max(100).transform(Math.round),
});
export type GapAnalysisResult = z.infer<typeof GapAnalysisResultSchema>;

export const GapAnalysisRequestSchema = z.object({
  resumeMarkdown: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  provider: ProviderMetaSchema,
});
export type GapAnalysisRequest = z.infer<typeof GapAnalysisRequestSchema>;

// ── Optimize ──────────────────────────────────────────────────────────────────

export const SuggestionSchema = z.object({
  id: z.string(),
  originalText: z.string(),
  suggestedText: z.string(),
  reason: z.string(),
  section: z.enum(["summary", "experience", "skills", "education", "projects", "certifications", "other"]),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

/**
 * What the LLM is asked to return — no optimizedMarkdown.
 * We compute that ourselves by applying suggestions to the original.
 */
export const LLMOptimizeResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema),
  gapAnalysis: GapAnalysisResultSchema,
});
export type LLMOptimizeResponse = z.infer<typeof LLMOptimizeResponseSchema>;

export const OptimizeResultSchema = z.object({
  suggestions: z.array(SuggestionSchema),
  gapAnalysis: GapAnalysisResultSchema,
});
export type OptimizeResult = z.infer<typeof OptimizeResultSchema>;

export const OptimizeRequestSchema = z.object({
  resumeMarkdown: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  provider: ProviderMetaSchema,
});
export type OptimizeRequest = z.infer<typeof OptimizeRequestSchema>;