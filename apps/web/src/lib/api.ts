import OpenAI from "openai";
import {
  runGapAnalysis,
  optimizeResume as coreOptimizeResume,
  DEFAULT_BASE_URLS,
  type GapAnalysisResult,
  type OptimizeResult,
  type ProviderMeta,
} from "@resume-llm/core";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface ApiPayload {
  resumeMarkdown: string;
  jobDescription: string;
  provider: ProviderMeta;
}

const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio"]);

function isLocal(provider: ProviderMeta): boolean {
  return LOCAL_PROVIDERS.has(provider.type);
}

function buildLocalClient(provider: ProviderMeta): OpenAI {
  return new OpenAI({
    apiKey: "no-key",
    baseURL: provider.baseURL ?? DEFAULT_BASE_URLS[provider.type as keyof typeof DEFAULT_BASE_URLS],
    dangerouslyAllowBrowser: true,
  });
}

async function post<T>(path: string, payload: ApiPayload, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export async function analyzeGap(payload: ApiPayload, apiKey?: string): Promise<GapAnalysisResult> {
  if (isLocal(payload.provider)) {
    return runGapAnalysis(
      { resumeMarkdown: payload.resumeMarkdown, jobDescription: payload.jobDescription, provider: payload.provider },
      buildLocalClient(payload.provider)
    );
  }
  return post<GapAnalysisResult>("/api/gap-analysis", payload, apiKey);
}

export async function optimizeResume(payload: ApiPayload, apiKey?: string): Promise<OptimizeResult> {
  if (isLocal(payload.provider)) {
    return coreOptimizeResume(
      { resumeMarkdown: payload.resumeMarkdown, jobDescription: payload.jobDescription, provider: payload.provider },
      buildLocalClient(payload.provider)
    );
  }
  return post<OptimizeResult>("/api/optimize", payload, apiKey);
}
