import type {
  GapAnalysisResult,
  OptimizeResult,
  ProviderMeta,
} from "@resume-llm/core";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface ApiPayload {
  resumeMarkdown: string;
  jobDescription: string;
  provider: ProviderMeta;
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

export const analyzeGap = (payload: ApiPayload, apiKey?: string) =>
  post<GapAnalysisResult>("/api/gap-analysis", payload, apiKey);

export const optimizeResume = (payload: ApiPayload, apiKey?: string) =>
  post<OptimizeResult>("/api/optimize", payload, apiKey);
