import { useState } from "react";
import { useDarkMode } from "./hooks/useDarkMode.ts";
import type { GapAnalysisResult, OptimizeResult, ProviderMeta } from "@resume-llm/core";
import { DEFAULT_MODELS, DEFAULT_BASE_URLS } from "@resume-llm/core";
import { analyzeGap, optimizeResume } from "./lib/api.ts";
import { useLocalStorage } from "./hooks/useLocalStorage.ts";
import { useEncryptedLocalStorage } from "./hooks/useEncryptedLocalStorage.ts";
import { ResumeInput } from "./components/ResumeInput.tsx";
import { JobInput } from "./components/JobInput.tsx";
import { ProviderForm } from "./components/ProviderForm.tsx";
import { GapAnalysisCard } from "./components/GapAnalysisCard.tsx";
import { OptimizePanel } from "./components/OptimizePanel.tsx";
import { SecurityPage } from "./pages/SecurityPage.tsx";
import { SetupPage } from "./pages/SetupPage.tsx";

type Page = "home" | "security" | "setup";

type LoadingState = "gap" | "optimize" | null;

const DEFAULT_PROVIDER: ProviderMeta = {
  type: "ollama",
  model: DEFAULT_MODELS.ollama ?? "llama3.2",
  baseURL: DEFAULT_BASE_URLS.ollama,
};

export function App() {
  const { dark, toggle: toggleDark } = useDarkMode();
  const [page, setPage] = useState<Page>("home");
  const [resumeMarkdown, setResumeMarkdown] = useLocalStorage("resumeMarkdown", "");
  const [jobDescription, setJobDescription] = useLocalStorage("jobDescription", "");
  const [provider, setProvider] = useLocalStorage<ProviderMeta>("provider", DEFAULT_PROVIDER);
  // Keys saved to localStorage encrypted with AES-GCM.
  // Presence of an entry means "remember this key" — no separate boolean needed.
  const { keys: persistedKeys, loaded: keysLoaded, set: setEncryptedKey, remove: removeEncryptedKey, has: hasPersistedKey } = useEncryptedLocalStorage("apiKeys");
  // Session-only keys for providers where the user hasn't opted in to persistence.
  const [transientKeys, setTransientKeys] = useState<Record<string, string>>({});

  const rememberKey = hasPersistedKey(provider.type);
  const apiKey = (keysLoaded ? persistedKeys[provider.type] : undefined) ?? transientKeys[provider.type] ?? "";

  async function handleApiKeyChange(key: string) {
    if (rememberKey) {
      await setEncryptedKey(provider.type, key);
    } else {
      setTransientKeys({ ...transientKeys, [provider.type]: key });
    }
  }

  async function handleRememberKeyChange(checked: boolean) {
    if (checked) {
      await setEncryptedKey(provider.type, apiKey);
      const { [provider.type]: _, ...rest } = transientKeys;
      setTransientKeys(rest);
    } else {
      removeEncryptedKey(provider.type);
      setTransientKeys({ ...transientKeys, [provider.type]: apiKey });
    }
  }

  const [originalFile, setOriginalFile] = useState<File | null>(null);
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
      const result = await analyzeGap({ resumeMarkdown, jobDescription, provider }, apiKey || undefined);
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
      const result = await optimizeResume({ resumeMarkdown, jobDescription, provider }, apiKey || undefined);
      setOptimizeResult(result);
      setGapResult(result.gapAnalysis);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  const navLink = (label: string, target: Page) => (
    <button
      onClick={() => setPage(target)}
      className={`text-sm px-3 py-1.5 rounded-md transition-colors
        ${page === target
          ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setPage("home")} className="flex items-center gap-2">
              <img src={dark ? "/book-brain-light.png" : "/book-brain-dark.png"} alt="" className="w-7 h-7" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">ResumeLLM</h1>
            </button>
            <nav className="flex items-center gap-1">
              {navLink("Setup", "setup")}
              {navLink("Security", "security")}
            </nav>
          </div>
          <button
            onClick={toggleDark}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 110 14A7 7 0 0112 5z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
        {page === "home" && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">AI-powered resume gap analysis and optimization</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
              Icons by{" "}
              <a href="https://www.flaticon.com/uicons" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400 dark:hover:text-gray-500">
                Flaticon
              </a>
            </p>
          </>
        )}
      </header>

      {page === "security" && <SecurityPage />}
      {page === "setup" && <SetupPage />}

      {page === "home" && (
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        {/* ── Left panel: inputs ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <ResumeInput
            value={resumeMarkdown}
            onChange={setResumeMarkdown}
            onFile={setOriginalFile}
            disabled={isBusy}
          />
          <JobInput
            value={jobDescription}
            onChange={setJobDescription}
            disabled={isBusy}
          />
          <ProviderForm
            provider={provider}
            apiKey={apiKey}
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
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* ── Right panel: results ───────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {isBusy && (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
              {loading === "gap" ? "Running gap analysis…" : "Optimizing resume…"} this may
              take a minute with local models.
            </div>
          )}

          {!isBusy && optimizeResult && (
            <OptimizePanel result={optimizeResult} resumeMarkdown={resumeMarkdown} originalFile={originalFile} />
          )}

          {!isBusy && !optimizeResult && gapResult && (
            <GapAnalysisCard result={gapResult} />
          )}

          {!isBusy && !gapResult && !optimizeResult && (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              Paste your resume and job description, then click Analyze or Optimize.
            </div>
          )}
        </div>
      </main>
      )}
    </div>
  );
}
