import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { OptimizeResult } from "@resume-llm/core";
import { buildSegments } from "./buildSegments.ts";
import { segmentsToMarkdown } from "./types.ts";
import type { Segment, SuggestionSegment } from "./types.ts";
import { ResumeDocument } from "./ResumeDocument.tsx";
import { SuggestionCard } from "./SuggestionCard.tsx";
import { downloadAsPdf, downloadAsDocx } from "../../lib/download.ts";

interface ReviewOverlayProps {
  result: OptimizeResult;
  resumeMarkdown: string;
  originalFile: File | null;
  onClose: () => void;
}

export function ReviewOverlay({ result, resumeMarkdown, originalFile, onClose }: ReviewOverlayProps) {
  const [segments, setSegments] = useState<Segment[]>(() =>
    buildSegments(resumeMarkdown, result.suggestions)
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  // Refs for each suggestion card so we can scroll to them.
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Set by ResumeDocument once the editor is ready.
  const editorRef = useRef<{ getMarkdown: () => string; getHTML: () => string } | null>(null);

  // Re-build segments if result changes (new optimization run).
  useEffect(() => {
    setSegments(buildSegments(resumeMarkdown, result.suggestions));
    setActiveId(null);
  }, [result, resumeMarkdown]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const updateSegment = useCallback(
    (id: string, patch: Partial<SuggestionSegment>) => {
      setSegments((prev) =>
        prev.map((seg) =>
          seg.type === "suggestion" && seg.id === id ? { ...seg, ...patch } : seg
        )
      );
    },
    []
  );

  const handleAccept = useCallback((seg: SuggestionSegment) => {
    updateSegment(seg.id, { status: "accepted" });
  }, [updateSegment]);

  const handleReject = useCallback((seg: SuggestionSegment) => {
    updateSegment(seg.id, { status: "rejected" });
  }, [updateSegment]);

  const handleUndo = useCallback((seg: SuggestionSegment) => {
    updateSegment(seg.id, { status: "pending" });
  }, [updateSegment]);

  const handleEdit = useCallback((id: string, text: string) => {
    updateSegment(id, { edited: text });
  }, [updateSegment]);

  const handleSegmentClick = useCallback((id: string) => {
    setActiveId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const suggestionSegments = useMemo(
    () => segments.filter((s): s is SuggestionSegment => s.type === "suggestion"),
    [segments]
  );

  const pending = suggestionSegments.filter((s) => s.status === "pending").length;
  const accepted = suggestionSegments.filter((s) => s.status === "accepted").length;
  const rejected = suggestionSegments.filter((s) => s.status === "rejected").length;

  const getFinalMarkdown = () => editorRef.current?.getMarkdown() ?? segmentsToMarkdown(segments);
  const getFinalHtml = () => editorRef.current?.getHTML() ?? "";

  async function handleCopy() {
    await navigator.clipboard.writeText(getFinalMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload(format: "pdf" | "docx") {
    setDownloading(format);
    const markdown = getFinalMarkdown();
    try {
      if (format === "pdf") {
        downloadAsPdf(getFinalHtml());
      } else {
        const replacements = suggestionSegments
          .filter((s) => s.status === "accepted" && !s.orphaned && s.original)
          .map((s) => ({ original: s.original, replacement: s.edited }));
        await downloadAsDocx(markdown, originalFile ?? undefined, replacements);
      }
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex flex-col w-full max-w-7xl mx-auto my-6 bg-white rounded-xl shadow-2xl overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">Review Suggestions</h2>
            <span className="text-sm text-gray-400">
              {accepted} accepted · {rejected} rejected · {pending} pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300
                         text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy Markdown"}
            </button>

            {/* Download group */}
            <div className="flex items-center divide-x divide-gray-200 border border-gray-300 rounded-md overflow-hidden text-sm font-medium text-gray-700">
              <span className="px-2.5 py-1.5 bg-gray-50 text-xs text-gray-500 select-none">
                Download
              </span>
              <button
                className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
                onClick={() => handleDownload("pdf")}
                disabled={downloading !== null}
              >
                {downloading === "pdf" ? "…" : "PDF"}
              </button>
              <button
                className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
                onClick={() => handleDownload("docx")}
                disabled={downloading !== null}
              >
                {downloading === "docx" ? "…" : "DOCX"}
              </button>
            </div>
            <button
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — resume document */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-gray-200">
            <ResumeDocument
              segments={segments}
              hoveredId={hoveredId}
              editorRef={editorRef}
              onSegmentClick={handleSegmentClick}
              onSegmentHover={setHoveredId}
            />
          </div>

          {/* Right — suggestion cards */}
          <div className="w-96 shrink-0 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
            {suggestionSegments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">No suggestions.</p>
            ) : (
              suggestionSegments.map((seg) => (
                <div
                  key={seg.id}
                  ref={(el) => { cardRefs.current[seg.id] = el; }}
                >
                  <SuggestionCard
                    segment={seg}
                    active={activeId === seg.id}
                    onAccept={() => handleAccept(seg)}
                    onReject={() => handleReject(seg)}
                    onUndo={() => handleUndo(seg)}
                    onEdit={(text) => handleEdit(seg.id, text)}
                    onHover={setHoveredId}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
