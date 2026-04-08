import type { OptimizeResult, Suggestion } from "@resume-llm/core";
import { GapAnalysisCard } from "./GapAnalysisCard.tsx";

interface OptimizePanelProps {
  result: OptimizeResult;
}

const SECTION_COLORS: Record<Suggestion["section"], string> = {
  summary: "bg-purple-50 text-purple-700",
  experience: "bg-blue-50 text-blue-700",
  skills: "bg-teal-50 text-teal-700",
  education: "bg-indigo-50 text-indigo-700",
  projects: "bg-cyan-50 text-cyan-700",
  certifications: "bg-amber-50 text-amber-700",
  other: "bg-gray-100 text-gray-700",
};

function SuggestionItem({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 border border-gray-200 rounded-md bg-white">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${SECTION_COLORS[suggestion.section]}`}
        >
          {suggestion.section}
        </span>
      </div>
      {suggestion.originalText && (
        <p className="text-sm text-gray-500 line-through">{suggestion.originalText}</p>
      )}
      <p className="text-sm text-gray-900">{suggestion.suggestedText}</p>
      <p className="text-xs text-gray-400 italic">{suggestion.reason}</p>
    </div>
  );
}

export function OptimizePanel({ result }: OptimizePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GapAnalysisCard result={result.gapAnalysis} />

      {result.suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-gray-800">
            Suggestions{" "}
            <span className="text-gray-400 font-normal text-sm">
              ({result.suggestions.length})
            </span>
          </h2>
          {result.suggestions.map((s) => (
            <SuggestionItem key={s.id} suggestion={s} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-gray-800">Optimized Resume</h2>
        <pre
          className="p-4 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono
                     whitespace-pre-wrap leading-relaxed overflow-auto max-h-[600px]"
        >
          {result.optimizedMarkdown}
        </pre>
      </div>
    </div>
  );
}
