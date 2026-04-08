import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runGapAnalysis,
  optimizeResume,
  ProviderMetaSchema,
  DEFAULT_MODELS,
  DEFAULT_BASE_URLS,
} from "@resume-llm/core";
import { buildClient } from "./client.js";

/**
 * Resolve the API key for agent flow.
 * Keys come from environment variables set in claude_desktop_config.json —
 * never from the MCP tool arguments themselves.
 */
function resolveEnvApiKey(providerType: string): string {
  if (providerType === "ollama" || providerType === "lmstudio") return "no-key";
  if (providerType === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY env var is not set");
    return key;
  }
  if (providerType === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY env var is not set");
    return key;
  }
  // custom — caller must set a key via CUSTOM_API_KEY or similar; fall back gracefully
  return process.env.CUSTOM_API_KEY ?? "no-key";
}

// ── Shared input schema for both tools ───────────────────────────────────────

const toolInputSchema = {
  resumeMarkdown: z.string().min(1).describe("The resume content in Markdown format"),
  jobDescription: z.string().min(1).describe("The target job description text"),
  provider: ProviderMetaSchema.optional().describe(
    "Provider metadata. Defaults to ollama/llama3.2 when omitted."
  ),
};

function resolveProvider(raw: z.infer<typeof ProviderMetaSchema> | undefined) {
  const type = raw?.type ?? "ollama";
  const model = raw?.model ?? DEFAULT_MODELS[type] ?? "llama3.2";
  const baseURL = raw?.baseURL ?? DEFAULT_BASE_URLS[type];
  return { type, model, baseURL } as z.infer<typeof ProviderMetaSchema>;
}

// ── MCP server ────────────────────────────────────────────────────────────────

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "resume-llm",
    version: "0.1.0",
  });

  server.tool(
    "gap_analysis",
    "Analyse gaps between a resume and a job description. Returns missing keywords, missing skills, tone issues, strengths found, and an overall match score.",
    toolInputSchema,
    async ({ resumeMarkdown, jobDescription, provider: rawProvider }) => {
      const provider = resolveProvider(rawProvider);
      const apiKey = resolveEnvApiKey(provider.type);
      const client = buildClient(provider, apiKey);

      const result = await runGapAnalysis({ resumeMarkdown, jobDescription, provider }, client);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "optimize_resume",
    "Rewrite a resume to better match a job description. Returns an optimized Markdown resume, bullet-level suggestions, and a gap analysis.",
    toolInputSchema,
    async ({ resumeMarkdown, jobDescription, provider: rawProvider }) => {
      const provider = resolveProvider(rawProvider);
      const apiKey = resolveEnvApiKey(provider.type);
      const client = buildClient(provider, apiKey);

      const result = await optimizeResume({ resumeMarkdown, jobDescription, provider }, client);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
