import { z } from "zod";

export const ProviderType = z.enum([
  "openai",
  "anthropic",
  "ollama",
  "lmstudio",
  "custom",
]);
export type ProviderType = z.infer<typeof ProviderType>;

export const ProviderMetaSchema = z.object({
  type: ProviderType,
  model: z.string().min(1),
  baseURL: z.string().url().optional(),
});
export type ProviderMeta = z.infer<typeof ProviderMetaSchema>;

export const DEFAULT_BASE_URLS: Partial<Record<ProviderType, string>> = {
  ollama: "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1",
};

export const DEFAULT_MODELS: Partial<Record<ProviderType, string>> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-6",
  ollama: "llama3.2",
  lmstudio: "local-model",
};

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

export const SuggestionSchema = z.object({
  id: z.string(),
  originalText: z.string(),
  suggestedText: z.string(),
  reason: z.string(),
  section: z.enum(["summary", "experience", "skills", "education", "projects", "certifications", "other"]),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const LLMOptimizeResponseSchema = z.object({
  originalContent: z.string().optional(),
  suggestions: z.array(SuggestionSchema),
  gapAnalysis: GapAnalysisResultSchema,
});
export type LLMOptimizeResponse = z.infer<typeof LLMOptimizeResponseSchema>;

export const OptimizeResultSchema = z.object({
  originalContent: z.string().optional(),
  suggestions: z.array(SuggestionSchema),
  gapAnalysis: GapAnalysisResultSchema,
});
export type OptimizeResult = z.infer<typeof OptimizeResultSchema>;

export const OptimizeRequestSchema = z.object({
  resumeMarkdown: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  provider: ProviderMetaSchema,
  isPdf: z.boolean().optional(),
});
export type OptimizeRequest = z.infer<typeof OptimizeRequestSchema>;
