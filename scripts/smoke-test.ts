/**
 * Smoke test — runs gap_analysis and optimize_resume against a local provider.
 *
 * Usage:
 *   pnpm smoke-test                          # Ollama llama3.2 (default)
 *   PROVIDER=lmstudio pnpm smoke-test
 *   PROVIDER=openai OPENAI_API_KEY=sk-... pnpm smoke-test
 *
 * Env vars:
 *   PROVIDER      openai | anthropic | ollama | lmstudio | custom  (default: ollama)
 *   MODEL         override model name
 *   BASE_URL      override base URL (required for custom)
 *   OPENAI_API_KEY / ANTHROPIC_API_KEY
 */

import OpenAI from "openai";
import { runGapAnalysis, optimizeResume } from "../packages/core/src/index.js";
import type { ProviderMeta } from "../packages/core/src/index.js";

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_RESUME = `\
# Jane Smith
jane@example.com | github.com/janesmith

## Summary
Software developer with experience in web applications and databases.

## Experience
### Web Developer — Acme Corp (2021–2024)
- Made websites using JavaScript
- Worked on databases
- Fixed bugs and helped teammates

### Junior Dev — Startup Inc (2019–2021)
- Wrote code for features
- Did code reviews

## Skills
JavaScript, Python, SQL, Git

## Education
B.S. Computer Science — State University (2019)
`;

const SAMPLE_JD = `\
Senior Frontend Engineer — Vercel

We are looking for a Senior Frontend Engineer to join our team.

Requirements:
- 4+ years of experience with React and TypeScript
- Strong understanding of Next.js and the App Router
- Experience with performance optimization (Core Web Vitals, bundle splitting)
- Familiarity with CI/CD pipelines and GitHub Actions
- Excellent communication skills and experience in an async-first environment
- Experience with Tailwind CSS or CSS-in-JS solutions

Nice to have:
- Open source contributions
- Experience with edge runtimes or Cloudflare Workers
- Knowledge of accessibility standards (WCAG 2.1)
`;

// ── Provider setup (API layer responsibility — never in core) ─────────────────

type ProviderType = ProviderMeta["type"];

const providerType = (process.env.PROVIDER ?? "ollama") as ProviderType;
const model = process.env.MODEL ?? defaultModel(providerType);
const baseURL = process.env.BASE_URL ?? defaultBaseURL(providerType);
const apiKey = resolveApiKey(providerType);

function defaultModel(type: ProviderType): string {
  const map: Record<ProviderType, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-sonnet-4-6",
    ollama: "llama3.2",
    lmstudio: "local-model",
    custom: "",
  };
  return map[type];
}

function defaultBaseURL(type: ProviderType): string | undefined {
  if (type === "ollama") return "http://localhost:11434/v1";
  if (type === "lmstudio") return "http://localhost:1234/v1";
  return undefined;
}

function resolveApiKey(type: ProviderType): string {
  if (type === "openai") return process.env.OPENAI_API_KEY ?? die("OPENAI_API_KEY is required");
  if (type === "anthropic") return process.env.ANTHROPIC_API_KEY ?? die("ANTHROPIC_API_KEY is required");
  // Local providers and custom require a non-empty string but don't validate it.
  return "no-key";
}

function die(msg: string): never {
  console.error(`\n[smoke-test] ${msg}\n`);
  process.exit(1);
}

if (providerType === "custom" && !process.env.BASE_URL) {
  die("BASE_URL is required for PROVIDER=custom");
}

const client = new OpenAI({ apiKey, baseURL });

const provider: ProviderMeta = { type: providerType, model, baseURL };

// ── Run tests ─────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

async function main() {
  console.log(`\n[smoke-test] Provider: ${providerType} | Model: ${model}`);
  if (baseURL) console.log(`[smoke-test] Base URL: ${baseURL}`);

  // ── Gap analysis ────────────────────────────────────────────────────────────
  section("1 / 2  Gap Analysis");
  console.log("Calling runGapAnalysis...");
  const t0 = Date.now();

  const gapResult = await runGapAnalysis(
    { resumeMarkdown: SAMPLE_RESUME, jobDescription: SAMPLE_JD, provider },
    client
  );

  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  console.log("Missing keywords: ", gapResult.missingKeywords);
  console.log("Missing skills:   ", gapResult.missingSkills);
  console.log("Tone issues:      ", gapResult.toneIssues);
  console.log("Strengths found:  ", gapResult.strengthsFound);
  console.log("Match score:      ", gapResult.overallMatchScore);

  // ── Optimize ────────────────────────────────────────────────────────────────
  section("2 / 2  Optimize Resume");
  console.log("Calling optimizeResume...");
  const t1 = Date.now();

  const optimizeResult = await optimizeResume(
    { resumeMarkdown: SAMPLE_RESUME, jobDescription: SAMPLE_JD, provider },
    client
  );

  console.log(`Done in ${((Date.now() - t1) / 1000).toFixed(1)}s\n`);
  console.log(`Suggestions (${optimizeResult.suggestions.length}):`);
  for (const s of optimizeResult.suggestions) {
    console.log(`  [${s.section}] "${s.originalText}" → "${s.suggestedText}"`);
    console.log(`         reason: ${s.reason}`);
  }
  console.log("\nOptimized resume (first 500 chars):");
  console.log(optimizeResult.optimizedMarkdown.slice(0, 500));
  console.log("\nMatch score after optimization:", optimizeResult.gapAnalysis.overallMatchScore);

  section("All done");
}

main().catch((err) => {
  console.error("\n[smoke-test] FAILED:", err);
  process.exit(1);
});
