import type { Suggestion } from "@resume-llm/core";

export type SuggestionStatus = "pending" | "accepted" | "rejected";

export type TextSegment = {
  type: "text";
  content: string;
};

export type SuggestionSegment = {
  type: "suggestion";
  id: string;
  section: Suggestion["section"];
  reason: string;
  /** Always preserved — undo restores this to the document. */
  original: string;
  /** What the LLM wrote in the optimized document. */
  suggested: string;
  /** User's editable override; starts equal to `suggested`. */
  edited: string;
  status: SuggestionStatus;
  /** True when suggestedText couldn't be located in optimizedMarkdown. */
  orphaned: boolean;
};

export type Segment = TextSegment | SuggestionSegment;

export function segmentsToMarkdown(segments: Segment[]): string {
  return segments
    .map((seg) => {
      if (seg.type === "text") return seg.content;
      if (seg.orphaned) return ""; // not in the document — skip
      return seg.status === "rejected" ? seg.original : seg.edited;
    })
    .join("");
}
