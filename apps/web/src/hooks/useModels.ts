import { useState, useEffect } from "react";
import type { ProviderType } from "@resume-llm/core";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

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

    const params = new URLSearchParams({ provider: providerType });
    if (baseURL) params.set("baseURL", baseURL);

    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const signal = AbortSignal.any
      ? AbortSignal.any([controller.signal, AbortSignal.timeout(6000)])
      : controller.signal;

    fetch(`${API_BASE}/api/models?${params}`, { headers, signal })
      .then((r) => r.json())
      .then((json) => {
        const ids: string[] = (json?.models as string[] | undefined) ?? [];
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
