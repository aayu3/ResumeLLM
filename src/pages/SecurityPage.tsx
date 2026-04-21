export function SecurityPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-10">

      {/* ── Direct API calls ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your API key never touches our servers</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          When you click <strong className="text-gray-800 dark:text-gray-200">Analyze</strong> or{" "}
          <strong className="text-gray-800 dark:text-gray-200">Optimize</strong>, ResumeLLM runs entirely in your
          browser. The HTTP request to your chosen provider (OpenAI, Anthropic, etc.) is made{" "}
          <em>directly</em> by your browser — ResumeLLM has no backend server that proxies or
          inspects those requests.
        </p>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Verify it yourself</p>
          <ol className="text-sm text-blue-700 dark:text-blue-400 list-decimal list-inside space-y-1">
            <li>Open your browser's DevTools (<kbd className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">F12</kbd> or <kbd className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">Cmd ⌘ + Option + I</kbd>)</li>
            <li>Switch to the <strong>Network</strong> tab</li>
            <li>Run an analysis or optimization</li>
            <li>
              Look for the outgoing request — it will go directly to your provider's domain
              (e.g. <code className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">api.openai.com</code>,{" "}
              <code className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">api.anthropic.com</code>),
              not to any ResumeLLM domain.
            </li>
          </ol>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          The{" "}
          <a
            href="https://github.com/aayu3/ResumeLLM"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            source code is publicly available on GitHub
          </a>{" "}
          if you'd like to audit it directly.
        </p>
      </section>

      {/* ── localStorage encryption ───────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Local storage encryption</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          When you enable <strong className="text-gray-800 dark:text-gray-200">Remember API key</strong>, the key is
          encrypted with AES-GCM 256-bit encryption before being written to{" "}
          <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">localStorage</code>. A random
          device key is generated once and stored alongside the ciphertext — it never leaves your
          browser.
        </p>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
            What's stored in localStorage
          </div>
          <div className="p-4 font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 overflow-x-auto">
            <div><span className="text-purple-600 dark:text-purple-400">__dk</span>: <span className="text-gray-400">"base64-encoded AES-GCM device key"</span></div>
            <div><span className="text-purple-600 dark:text-purple-400">apiKeys</span>: <span className="text-gray-400">{"{"}</span></div>
            <div className="pl-4"><span className="text-blue-600 dark:text-blue-400">"openai"</span>: <span className="text-gray-400">"ivBase64.ciphertextBase64"</span></div>
            <div><span className="text-gray-400">{"}"}</span></div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">What this protects against</h3>
          <ul className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
              <span>
                <strong className="text-gray-800 dark:text-gray-200">Other websites cannot read your keys.</strong>{" "}
                Browsers enforce a strict same-origin policy — a script running on{" "}
                <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">example.com</code> has zero
                access to <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">localStorage</code>{" "}
                set by this app. This is a hard browser guarantee, not just our policy.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
              <span>
                <strong className="text-gray-800 dark:text-gray-200">Casual inspection is prevented.</strong>{" "}
                Even if someone looks at your browser's storage in DevTools, they'll see an
                encrypted blob rather than a plaintext key.
              </span>
            </li>
          </ul>

          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-1">Limitations to be aware of</h3>
          <ul className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">!</span>
              <span>
                <strong className="text-gray-800 dark:text-gray-200">The device key is stored in the same localStorage.</strong>{" "}
                This means the encryption protects against casual inspection but not against a
                determined attacker who has read access to your full localStorage — they could
                decrypt the key using the stored device key.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">!</span>
              <span>
                <strong className="text-gray-800 dark:text-gray-200">Malicious browser extensions with full page access</strong>{" "}
                could read localStorage contents. Be cautious about which extensions you install.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">!</span>
              <span>
                <strong className="text-gray-800 dark:text-gray-200">A compromised device</strong> could expose stored
                keys regardless of encryption. If you're on a shared or untrusted machine, leave
                "Remember API key" unchecked — keys kept only in session memory are never
                written to disk.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Session-only mode ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Session-only mode</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          If you leave <strong className="text-gray-800 dark:text-gray-200">Remember API key</strong> unchecked,
          your key is held only in React component state for the duration of the tab session. It is
          never written to <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">localStorage</code>,{" "}
          <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">sessionStorage</code>, or any
          cookie. Closing the tab discards it permanently.
        </p>
      </section>

    </main>
  );
}
