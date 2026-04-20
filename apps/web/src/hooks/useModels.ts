import { useState, useEffect } from "react";
import { DEFAULT_BASE_URLS, type ProviderType } from "@resume-llm/core";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const LOCAL_PROVIDERS = new Set<ProviderType>(["ollama", "lmstudio"]);

// Session-level cache — keyed by "providerType|baseURL|apiKey".
// Survives re-renders and dropdown changes; cleared on page reload.
const cache = new Map<string, string[]>();

function cacheKey(providerType: ProviderType, baseURL: string | undefined, apiKey: string) {
  return `${providerType}|${baseURL ?? ""}|${apiKey}`;
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
    // Serve from cache immediately — no fetch needed.
    if (cache.has(key)) {
      setModels(cache.get(key)!);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const signal = AbortSignal.any
      ? AbortSignal.any([controller.signal, AbortSignal.timeout(6000)])
      : controller.signal;

    const fetchUrl = LOCAL_PROVIDERS.has(providerType)
      ? `${(baseURL ?? DEFAULT_BASE_URLS[providerType as keyof typeof DEFAULT_BASE_URLS] ?? "").replace(/\/$/, "")}/models`
      : `${API_BASE}/api/models?${new URLSearchParams({ provider: providerType, ...(baseURL ? { baseURL } : {}) })}`;

    fetch(fetchUrl, { headers: LOCAL_PROVIDERS.has(providerType) ? {} : headers, signal })
      .then((r) => r.json())
      .then((json) => {
        // Our API returns { models: string[] }; direct provider calls return { data: { id }[] }.
        const ids: string[] =
          Array.isArray(json?.models) ? json.models :
          Array.isArray(json?.data) ? (json.data as { id: string }[]).map((m) => m.id).filter(Boolean) :
          [];
        cache.set(key, ids);
        setModels(ids);
      })
      .catch(() => {
        // Don't cache failures — allow retry on next mount.
        setModels([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [key]);

  return { models, loading };
}
