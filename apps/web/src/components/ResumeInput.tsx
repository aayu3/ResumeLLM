import { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "tiptap-markdown";
import { parseFile, type ParseWarning } from "../lib/parseFile.ts";
import { EditorToolbar } from "./EditorToolbar.tsx";

interface ResumeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the original File when one is parsed, or null when the user edits manually. */
  onFile?: (file: File | null) => void;
  disabled?: boolean;
}

const WARNING_MESSAGES: Record<ParseWarning, string> = {
  "pdf-may-lose-formatting":
    "PDF formatting is approximate. Review the extracted text before submitting. For best results, use .docx.",
  "pdf-no-text-detected":
    "No text could be extracted from this PDF — it may be a scanned image. Try exporting from Word or Google Docs instead.",
};

export function ResumeInput({ value, onChange, onFile, disabled }: ResumeInputProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track whether we've set content externally so we don't fight the editor.
  const suppressOnChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: false }),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2 min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      if (suppressOnChange.current) return;
      const md = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
      onChange(md);
    },
  });

  // Keep editor editable state in sync with the disabled prop.
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const setEditorContent = useCallback((html: string | undefined, markdown: string) => {
    if (!editor) return;
    suppressOnChange.current = true;
    if (html) {
      editor.commands.setContent(html);
    } else {
      // Fall back to markdown — tiptap-markdown parses it.
      editor.commands.setContent(markdown);
    }
    suppressOnChange.current = false;
  }, [editor]);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setWarnings([]);
    try {
      const result = await parseFile(file);
      setEditorContent(result.html, result.markdown);
      onChange(result.markdown);
      onFile?.(file);
      setWarnings(result.warnings);
      setShowUpload(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setParsing(false);
    }
  }, [editor, onChange, onFile, setEditorContent]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }, [handleFile]);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Resume</label>
        <button
          className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600
                     hover:bg-gray-50 transition-colors disabled:opacity-50"
          onClick={() => setShowUpload((v) => !v)}
          disabled={disabled || parsing}
        >
          {parsing ? "Parsing…" : "Upload file"}
        </button>
      </div>

      {/* Warnings */}
      {warnings.map((w) => (
        <div key={w} className="px-3 py-2 text-xs bg-amber-50 border border-amber-200 rounded-md text-amber-800">
          {WARNING_MESSAGES[w]}
        </div>
      ))}

      {/* Upload drop zone (shown on demand) */}
      {showUpload && (
        <div
          className={`flex flex-col items-center justify-center gap-3 h-32 border-2 border-dashed rounded-md
                      transition-colors cursor-pointer
                      ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
                      ${disabled || parsing ? "opacity-50 pointer-events-none" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".docx,.pdf" className="hidden" onChange={handleInputChange} />
          <p className="text-sm text-gray-600 font-medium">Drop a file here or click to browse</p>
          <p className="text-xs text-gray-400">.docx or .pdf</p>
        </div>
      )}

      {/* TipTap editor */}
      <div className={`border border-gray-300 rounded-md overflow-hidden
                       ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
        {editor && <EditorToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
