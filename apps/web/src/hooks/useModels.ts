import { useState, useEffect } from "react";
import { DEFAULT_BASE_URLS, type ProviderType } from "@resume-llm/core";

// Session-level cache — keyed by "providerType|baseURL|apiKey".
const cache = new Map<string, string[]>();

function cacheKey(providerType: ProviderType, baseURL: string | undefined, apiKey: string) {
  return `${providerType}|${baseURL ?? ""}|${apiKey}`;
}

function buildModelsUrl(providerType: ProviderType, baseURL: string | undefined): string {
  if (providerType === "anthropic") {
    const base = baseURL ?? "https://api.anthropic.com/v1";
    return `${base.replace(/\/$/, "")}/models`;
  }
  if (providerType === "openai") {
    return "https://api.openai.com/v1/models";
  }
  // ollama, lmstudio, custom — call their /models endpoint directly
  const base = baseURL ?? DEFAULT_BASE_URLS[providerType as keyof typeof DEFAULT_BASE_URLS] ?? "";
  return `${base.replace(/\/$/, "")}/models`;
}

function buildModelsHeaders(providerType: ProviderType, apiKey: string): Record<string, string> {
  if (providerType === "anthropic") {
    return { "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
  }
  if (providerType === "openai" || providerType === "custom") {
    return { "Authorization": `Bearer ${apiKey}` };
  }
  return {};
}

export function useModels(
  providerType: ProviderType,
  baseURL: string | undefined,
  apiKey: string
) {
  const key = cacheKey(providerType, baseURL, apiKey);

  const [models, setModels] = useState<string[]>(() => cache.get(key) ?? []);
  const [loading, setLoading] = useState(() => !cache.has(key));

  useEffect(() => {
    if (cache.has(key)) {
      setModels(cache.get(key)!);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const signal = AbortSignal.any
      ? AbortSignal.any([controller.signal, AbortSignal.timeout(6000)])
      : controller.signal;

    fetch(buildModelsUrl(providerType, baseURL), {
      headers: buildModelsHeaders(providerType, apiKey),
      signal,
    })
      .then((r) => r.json())
      .then((json) => {
        // Anthropic + OpenAI return { data: [{ id }] }; local providers return { data: [{ id }] } or { models: string[] }
        const ids: string[] =
          Array.isArray(json?.models) ? json.models :
          Array.isArray(json?.data) ? (json.data as { id: string }[]).map((m) => m.id).filter(Boolean) :
          [];
        cache.set(key, ids);
        setModels(ids);
      })
      .catch(() => {
        setModels([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [key]);

  return { models, loading };
}
