import { useEffect } from "react";
import { DEFAULT_MODELS, DEFAULT_BASE_URLS } from "@resume-llm/core";
import type { ProviderMeta, ProviderType } from "@resume-llm/core";
import { useModels } from "../hooks/useModels.ts";

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
    "w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100";

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Provider</p>

      {/* Provider type */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Model provider</label>
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
          <label className="text-sm font-medium text-gray-700">Base URL</label>
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
          <label className="text-sm font-medium text-gray-700">API key</label>
          <input
            type="text"
            className={inputClass}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-..."
            disabled={disabled}
            autoComplete="off"
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
            <label htmlFor="remember-key" className="text-xs text-gray-400 select-none">
              Remember API key in localStorage
            </label>
          </div>
        </div>
      )}

      {LOCAL_PROVIDERS.includes(provider.type) && (
        <p className="text-xs text-gray-400">No API key required for local providers.</p>
      )}

      {/* Model — dropdown when list is available, text input otherwise */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Model</label>
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
