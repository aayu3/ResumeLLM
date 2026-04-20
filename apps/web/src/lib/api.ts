import OpenAI from "openai";
import {
  runGapAnalysis,
  optimizeResume as coreOptimizeResume,
  DEFAULT_BASE_URLS,
  type GapAnalysisResult,
  type OptimizeResult,
  type ProviderMeta,
} from "@resume-llm/core";

export interface ApiPayload {
  resumeMarkdown: string;
  jobDescription: string;
  provider: ProviderMeta;
  isPdf?: boolean;
}

function buildClient(provider: ProviderMeta, apiKey: string): OpenAI {
  if (provider.type === "anthropic") {
    return new OpenAI({
      apiKey: "no-key",
      baseURL: provider.baseURL ?? "https://api.anthropic.com/v1",
      defaultHeaders: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      dangerouslyAllowBrowser: true,
    });
  }

  return new OpenAI({
    apiKey: provider.type === "ollama" || provider.type === "lmstudio" ? "no-key" : apiKey,
    baseURL: provider.baseURL ?? DEFAULT_BASE_URLS[provider.type as keyof typeof DEFAULT_BASE_URLS],
    dangerouslyAllowBrowser: true,
  });
}

export async function analyzeGap(payload: ApiPayload, apiKey?: string): Promise<GapAnalysisResult> {
  return runGapAnalysis(
    { resumeMarkdown: payload.resumeMarkdown, jobDescription: payload.jobDescription, provider: payload.provider },
    buildClient(payload.provider, apiKey ?? "no-key")
  );
}

export async function optimizeResume(payload: ApiPayload, apiKey?: string): Promise<OptimizeResult> {
  return coreOptimizeResume(
    { resumeMarkdown: payload.resumeMarkdown, jobDescription: payload.jobDescription, provider: payload.provider, isPdf: payload.isPdf },
    buildClient(payload.provider, apiKey ?? "no-key")
  );
}
