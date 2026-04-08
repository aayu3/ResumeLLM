/**
 * ResumeInput — owns the resume capture mechanism.
 *
 * Currently: plain textarea for pasting Markdown.
 * Future swap points:
 *   - Replace textarea with a file input (<input type="file" accept=".md,.txt,.pdf,.docx">)
 *   - Or mount a Tiptap editor here for rich-text editing.
 * The parent only ever sees { value, onChange } — no changes needed upstream.
 */

interface ResumeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ResumeInput({ value, onChange, disabled }: ResumeInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        Resume <span className="text-gray-400 font-normal">(Markdown)</span>
      </label>
      <textarea
        className="w-full h-64 px-3 py-2 text-sm font-mono border border-gray-300 rounded-md resize-y
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400"
        placeholder={"# Jane Smith\n\n## Experience\n### Engineer — Acme Corp (2021–2024)\n- ..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
      />
    </div>
  );
}
