import { useEffect, useState } from "react";
import { DEFAULT_MODELS, DEFAULT_BASE_URLS } from "../lib/schemas.ts";
import type { ProviderMeta, ProviderType } from "../lib/schemas.ts";
import { useModels } from "../hooks/useModels.ts";

function ApiKeyInput({ value, onChange, disabled }: {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const inputClass =
    "flex-1 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-l-md " +
    "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800";
  return (
    <div className="flex">
      <input
        type={show ? "text" : "password"}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="sk-..."
        disabled={disabled}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        className="px-2.5 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md
                   bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600
                   disabled:opacity-50 text-gray-500 dark:text-gray-400"
        aria-label={show ? "Hide API key" : "Show API key"}
      >
        {show ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a10.05 10.05 0 011.875.175M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 3-4 7-9 7m9-7c0-1.5-.8-3.2-2.1-4.6M3 3l18 18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

const PROVIDER_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: "ollama", label: "Ollama (local)" },
  { value: "lmstudio", label: "LM Studio (local)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "custom", label: "Custom endpoint" },
];

const LOCAL_PROVIDERS: ProviderType[] = ["ollama", "lmstudio"];
const NEEDS_KEY: ProviderType[] = ["openai", "anthropic", "custom"];
const NEEDS_BASE_URL: ProviderType[] = ["ollama", "lmstudio", "custom"];

interface ProviderFormProps {
  provider: ProviderMeta;
  apiKey: string;
  onProviderChange: (provider: ProviderMeta) => void;
  onApiKeyChange: (key: string) => void;
  rememberApiKey?: boolean;
  onRememberApiKeyChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function ProviderForm({
  provider,
  apiKey,
  onProviderChange,
  onApiKeyChange,
  rememberApiKey = false,
  onRememberApiKeyChange,
  disabled,
}: ProviderFormProps) {
  const { models, loading: modelsLoading } = useModels(provider.type, provider.baseURL, apiKey);

  // When the model list loads and the current model isn't in it, select the first available.
  useEffect(() => {
    if (models.length > 0 && !models.includes(provider.model)) {
      onProviderChange({ ...provider, model: models[0] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  function handleTypeChange(type: ProviderType) {
    onProviderChange({
      type,
      model: DEFAULT_MODELS[type] ?? "",
      baseURL: DEFAULT_BASE_URLS[type],
    });
  }

  const inputClass =
    "w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md " +
    "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800";

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Provider</p>

      {/* Provider type */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model provider</label>
        <select
          className={inputClass + " bg-white"}
          value={provider.type}
          onChange={(e) => handleTypeChange(e.target.value as ProviderType)}
          disabled={disabled}
        >
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Base URL (local/custom providers) */}
      {NEEDS_BASE_URL.includes(provider.type) && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Base URL</label>
          <input
            type="url"
            className={inputClass}
            value={provider.baseURL ?? ""}
            onChange={(e) =>
              onProviderChange({ ...provider, baseURL: e.target.value || undefined })
            }
            placeholder={DEFAULT_BASE_URLS[provider.type] ?? "http://localhost:PORT/v1"}
            disabled={disabled}
          />
        </div>
      )}

      {/* API key (cloud/custom providers) */}
      {NEEDS_KEY.includes(provider.type) && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">API key</label>
          <ApiKeyInput
            value={apiKey}
            onChange={onApiKeyChange}
            disabled={disabled}
          />
          <div className="flex items-center gap-2 mt-0.5">
            <input
              id="remember-key"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={rememberApiKey}
              onChange={(e) => onRememberApiKeyChange?.(e.target.checked)}
              disabled={disabled}
            />
            <label htmlFor="remember-key" className="text-xs text-gray-400 dark:text-gray-500 select-none">
              Remember API key in localStorage
            </label>
          </div>
        </div>
      )}

      {LOCAL_PROVIDERS.includes(provider.type) && (
        <p className="text-xs text-gray-400 dark:text-gray-500">No API key required for local providers.</p>
      )}

      {/* Model — dropdown when list is available, text input otherwise */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
        {modelsLoading ? (
          <input className={inputClass} disabled placeholder="Loading models…" />
        ) : models.length > 0 ? (
          <select
            className={inputClass + " bg-white"}
            value={provider.model}
            onChange={(e) => onProviderChange({ ...provider, model: e.target.value })}
            disabled={disabled}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className={inputClass}
            value={provider.model}
            onChange={(e) => onProviderChange({ ...provider, model: e.target.value })}
            placeholder={DEFAULT_MODELS[provider.type] ?? "model-name"}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}
