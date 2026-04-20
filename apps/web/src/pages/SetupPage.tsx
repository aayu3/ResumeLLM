function CodeBlock({ lang, children }: { lang: string; children: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        {lang}
      </div>
      <pre className="p-4 bg-gray-900 text-gray-100 overflow-x-auto leading-relaxed">
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}

function OsTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors
        ${active
          ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800"
          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
    >
      {label}
    </button>
  );
}

import { useState } from "react";

type OS = "windows" | "macos" | "linux";

function OllamaSetup() {
  const [os, setOs] = useState<OS>("windows");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["windows", "macos", "linux"] as OS[]).map((o) => (
          <OsTab key={o} label={o === "macos" ? "macOS" : o.charAt(0).toUpperCase() + o.slice(1)} active={os === o} onClick={() => setOs(o)} />
        ))}
      </div>

      {os === "windows" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The easiest way on Windows is to set the environment variable for your user session, then restart Ollama.
            No admin rights are required for the User scope.
          </p>
          <CodeBlock lang="PowerShell — set permanently (no admin required)">
{`# Replace the URL with where ResumeLLM is running
[System.Environment]::SetEnvironmentVariable(
  "OLLAMA_ORIGINS",
  "https://your-app.pages.dev",
  "User"
)
# Restart Ollama from the system tray, or run:
# taskkill /IM ollama.exe /F && ollama serve`}
          </CodeBlock>
          <CodeBlock lang="PowerShell — set for the current session only">
{`$env:OLLAMA_ORIGINS = "https://your-app.pages.dev"
ollama serve`}
          </CodeBlock>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            To allow all origins during development, use <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">*</code> instead of a specific URL.
          </p>
        </div>
      )}

      {os === "macos" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ollama on macOS runs as a launchd service. You can either set the variable for your shell session or edit the service plist.
          </p>
          <CodeBlock lang="Terminal — set for the current session only">
{`OLLAMA_ORIGINS="https://your-app.pages.dev" ollama serve`}
          </CodeBlock>
          <CodeBlock lang="Terminal — set persistently via launchd">
{`# Tell launchd about the variable (runs until next reboot)
launchctl setenv OLLAMA_ORIGINS "https://your-app.pages.dev"

# Then restart the Ollama service
osascript -e 'quit app "Ollama"'
open -a Ollama`}
          </CodeBlock>
          <CodeBlock lang="~/.zshrc or ~/.bashrc — set for all future terminals">
{`export OLLAMA_ORIGINS="https://your-app.pages.dev"`}
          </CodeBlock>
        </div>
      )}

      {os === "linux" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            On Linux, Ollama typically runs as a systemd service. Add an override file so the variable persists across restarts.
          </p>
          <CodeBlock lang="Terminal — systemd override (persistent)">
{`sudo systemctl edit ollama
# This opens an editor. Add the following, save, and close:

[Service]
Environment="OLLAMA_ORIGINS=https://your-app.pages.dev"

# Then reload and restart:
sudo systemctl daemon-reload
sudo systemctl restart ollama`}
          </CodeBlock>
          <CodeBlock lang="Terminal — run manually (current session only)">
{`OLLAMA_ORIGINS="https://your-app.pages.dev" ollama serve`}
          </CodeBlock>
        </div>
      )}
    </div>
  );
}

function LmStudioSetup() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        LM Studio has a built-in CORS toggle in its local server settings — no environment variables needed.
      </p>
      <ol className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
        <li>Open LM Studio and navigate to the <strong className="text-gray-800 dark:text-gray-200">Local Server</strong> tab (the <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;-&gt;</code> icon in the left sidebar).</li>
        <li>Start the server if it isn't already running.</li>
        <li>
          In the server settings panel, find{" "}
          <strong className="text-gray-800 dark:text-gray-200">CORS</strong> and enable it, then
          add your app's origin to the allowed origins list (or use <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">*</code> to allow all).
        </li>
        <li>Restart the server for the change to take effect.</li>
      </ol>
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-400">
        LM Studio's UI changes between versions. If you don't see a CORS option, check under{" "}
        <strong>Server &gt; Advanced</strong> or consult the LM Studio documentation for your version.
      </div>
    </div>
  );
}

export function SetupPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-12">

      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Setup guide</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Cloud providers like OpenAI and Anthropic work out of the box — just paste your API key.
          Local providers (Ollama, LM Studio) need a one-time CORS configuration so your browser
          is permitted to call them from the ResumeLLM page.
        </p>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-800 dark:text-gray-200">Why is CORS needed?</strong>{" "}
          Browsers block web pages from making requests to a different origin (domain/port) unless
          the target server explicitly allows it. Ollama and LM Studio both run on{" "}
          <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">localhost</code>, which is a
          different origin from the ResumeLLM page, so you need to whitelist that origin once.
        </div>
      </section>

      {/* ── Ollama ────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ollama</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
            localhost:11434
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ollama is controlled via the{" "}
          <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">OLLAMA_ORIGINS</code> environment
          variable. Set it to the URL where ResumeLLM is hosted (or <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">*</code>{" "}
          to allow all origins), then restart Ollama.
        </p>
        <OllamaSetup />
      </section>

      {/* ── LM Studio ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">LM Studio</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
            localhost:1234
          </span>
        </div>
        <LmStudioSetup />
      </section>

      {/* ── Cloud providers ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cloud providers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
          {[
            { name: "OpenAI", note: "Paste your sk-… key. No extra setup." },
            { name: "Anthropic", note: "Paste your sk-ant-… key. No extra setup." },
            { name: "OpenRouter", note: "Paste your sk-or-… key. No extra setup." },
            { name: "Custom OpenAI-compatible", note: "Set the base URL to your endpoint and provide an API key if required." },
          ].map(({ name, note }) => (
            <div key={name} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex flex-col gap-1">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{name}</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
