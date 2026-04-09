import { useState } from "react";
import type { OptimizeResult } from "@resume-llm/core";
import { GapAnalysisCard } from "./GapAnalysisCard.tsx";
import { ReviewOverlay } from "./review/ReviewOverlay.tsx";

interface OptimizePanelProps {
  result: OptimizeResult;
  resumeMarkdown: string;
  originalFile: File | null;
}

export function OptimizePanel({ result, resumeMarkdown, originalFile }: OptimizePanelProps) {
  const [showReview, setShowReview] = useState(false);

  return (
    <>
      {showReview && (
        <ReviewOverlay result={result} resumeMarkdown={resumeMarkdown} originalFile={originalFile} onClose={() => setShowReview(false)} />
      )}

      <div className="flex flex-col gap-4">
        <GapAnalysisCard result={result.gapAnalysis} />

        {result.suggestions.length > 0 && (
          <button
            className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-md
                       hover:bg-indigo-700 transition-colors"
            onClick={() => setShowReview(true)}
          >
            Review {result.suggestions.length} Suggestion{result.suggestions.length !== 1 ? "s" : ""}
          </button>
        )}

      </div>
    </>
  );
}
