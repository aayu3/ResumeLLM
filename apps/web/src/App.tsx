import { useState } from "react";
import type { GapAnalysisResult, OptimizeResult, ProviderMeta } from "@resume-llm/core";
import { DEFAULT_MODELS, DEFAULT_BASE_URLS } from "@resume-llm/core";
import { analyzeGap, optimizeResume } from "./lib/api.ts";
import { useLocalStorage } from "./hooks/useLocalStorage.ts";
import { ResumeInput } from "./components/ResumeInput.tsx";
import { JobInput } from "./components/JobInput.tsx";
import { ProviderForm } from "./components/ProviderForm.tsx";
import { GapAnalysisCard } from "./components/GapAnalysisCard.tsx";
import { OptimizePanel } from "./components/OptimizePanel.tsx";

type LoadingState = "gap" | "optimize" | null;

const DEFAULT_PROVIDER: ProviderMeta = {
  type: "ollama",
  model: DEFAULT_MODELS.ollama ?? "llama3.2",
  baseURL: DEFAULT_BASE_URLS.ollama,
};

export function App() {
  const [resumeMarkdown, setResumeMarkdown] = useLocalStorage("resumeMarkdown", "");
  const [jobDescription, setJobDescription] = useLocalStorage("jobDescription", "");
  const [provider, setProvider] = useLocalStorage<ProviderMeta>("provider", DEFAULT_PROVIDER);
  const [rememberKey, setRememberKey] = useLocalStorage("rememberApiKey", false);
  const [apiKey, setApiKey] = useLocalStorage("apiKey", "");

  function handleApiKeyChange(key: string) {
    if (rememberKey) {
      setApiKey(key);
    } else {
      // Keep in state only — clear any previously stored value.
      setApiKey("");
      _setApiKeyTransient(key);
    }
  }

  // Transient (session-only) fallback when rememberKey is off.
  const [transientKey, _setApiKeyTransient] = useState(rememberKey ? "" : apiKey);
  const effectiveApiKey = rememberKey ? apiKey : transientKey;

  function handleRememberKeyChange(checked: boolean) {
    setRememberKey(checked);
    if (!checked) {
      // Wipe the stored key immediately when the user opts out.
      setApiKey("");
    }
  }

  const [gapResult, setGapResult] = useState<GapAnalysisResult | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState<string | null>(null);

  const isReady = resumeMarkdown.trim().length > 0 && jobDescription.trim().length > 0;
  const isBusy = loading !== null;

  async function handleAnalyze() {
    setError(null);
    setLoading("gap");
    try {
      const result = await analyzeGap({ resumeMarkdown, jobDescription, provider }, effectiveApiKey || undefined);
      setGapResult(result);
      setOptimizeResult(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function handleOptimize() {
    setError(null);
    setLoading("optimize");
    try {
      const result = await optimizeResume({ resumeMarkdown, jobDescription, provider }, effectiveApiKey || undefined);
      setOptimizeResult(result);
      setGapResult(result.gapAnalysis);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">ResumeLLM</h1>
        <p className="text-sm text-gray-500">AI-powered resume gap analysis and optimization</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        {/* ── Left panel: inputs ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <ResumeInput
            value={resumeMarkdown}
            onChange={setResumeMarkdown}
            disabled={isBusy}
          />
          <JobInput
            value={jobDescription}
            onChange={setJobDescription}
            disabled={isBusy}
          />
          <ProviderForm
            provider={provider}
            apiKey={effectiveApiKey}
            onProviderChange={setProvider}
            onApiKeyChange={handleApiKeyChange}
            rememberApiKey={rememberKey}
            onRememberApiKeyChange={handleRememberKeyChange}
            disabled={isBusy}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 rounded-md
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              onClick={handleAnalyze}
              disabled={!isReady || isBusy}
            >
              {loading === "gap" ? "Analyzing…" : "Analyze Gap"}
            </button>
            <button
              className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md
                         hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              onClick={handleOptimize}
              disabled={!isReady || isBusy}
            >
              {loading === "optimize" ? "Optimizing…" : "Optimize"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* ── Right panel: results ───────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {isBusy && (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              {loading === "gap" ? "Running gap analysis…" : "Optimizing resume…"} this may
              take a minute with local models.
            </div>
          )}

          {!isBusy && optimizeResult && (
            <OptimizePanel result={optimizeResult} />
          )}

          {!isBusy && !optimizeResult && gapResult && (
            <GapAnalysisCard result={gapResult} />
          )}

          {!isBusy && !gapResult && !optimizeResult && (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              Paste your resume and job description, then click Analyze or Optimize.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
