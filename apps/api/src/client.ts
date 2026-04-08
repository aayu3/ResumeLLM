import OpenAI from "openai";
import { DEFAULT_BASE_URLS } from "@resume-llm/core";
import type { ProviderMeta } from "@resume-llm/core";

/**
 * Construct an OpenAI-compatible client from provider metadata and a resolved
 * API key. This is the only place in the API layer that ever touches a secret.
 */
export function buildClient(meta: ProviderMeta, apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: meta.baseURL ?? DEFAULT_BASE_URLS[meta.type],
  });
}

/**
 * Extract the API key for the current request.
 * - Local providers (ollama, lmstudio) need no real key.
 * - Cloud providers require `Authorization: Bearer <key>`.
 */
export function extractApiKey(
  authHeader: string | undefined | null,
  providerType: ProviderMeta["type"]
): string {
  if (providerType === "ollama" || providerType === "lmstudio") return "no-key";
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header — expected: Bearer <key>");
  }
  return authHeader.slice(7);
}
