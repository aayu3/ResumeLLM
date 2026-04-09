import { useState, useRef, useCallback } from "react";
import { parseFile, type ParseWarning } from "../lib/parseFile.ts";

interface ResumeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the original File when one is parsed, or null when the user edits manually. */
  onFile?: (file: File | null) => void;
  disabled?: boolean;
}

const WARNING_MESSAGES: Record<ParseWarning, string> = {
  "pdf-may-lose-formatting":
    "PDF formatting is approximate. Review the extracted text before submitting. For best results, use .docx or paste Markdown directly.",
  "pdf-no-text-detected":
    "No text could be extracted from this PDF — it may be a scanned image. Try exporting from Word or Google Docs instead.",
};

export function ResumeInput({ value, onChange, onFile, disabled }: ResumeInputProps) {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setWarnings([]);
    try {
      const result = await parseFile(file);
      onChange(result.markdown);
      onFile?.(file);
      setWarnings(result.warnings);
      setTab("paste"); // Switch to paste tab so the user can review extracted text.
    } catch (err) {
      setWarnings([]);
      alert((err as Error).message);
    } finally {
      setParsing(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // Allow re-selecting the same file.
  }, [handleFile]);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header + tab toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Resume</label>
        <div className="flex text-xs rounded-md overflow-hidden border border-gray-300">
          {(["paste", "upload"] as const).map((t) => (
            <button
              key={t}
              className={`px-3 py-1 capitalize transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setTab(t)}
              disabled={disabled || parsing}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {warnings.map((w) => (
        <div key={w} className="px-3 py-2 text-xs bg-amber-50 border border-amber-200 rounded-md text-amber-800">
          {WARNING_MESSAGES[w]}
        </div>
      ))}

      {tab === "paste" ? (
        <textarea
          className="w-full h-64 px-3 py-2 text-sm font-mono border border-gray-300 rounded-md resize-y
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400"
          placeholder={"# Jane Smith\n\n## Experience\n### Engineer — Acme Corp (2021–2024)\n- ..."}
          value={value}
          onChange={(e) => { onChange(e.target.value); onFile?.(null); }}
          disabled={disabled}
          spellCheck={false}
        />
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-3 h-64 border-2 border-dashed rounded-md
                      transition-colors cursor-pointer
                      ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
                      ${disabled || parsing ? "opacity-50 pointer-events-none" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf"
            className="hidden"
            onChange={handleInputChange}
          />
          {parsing ? (
            <p className="text-sm text-gray-500">Parsing file…</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 font-medium">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-gray-400">.docx or .pdf</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
