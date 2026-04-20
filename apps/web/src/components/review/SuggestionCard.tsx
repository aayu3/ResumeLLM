import type { SuggestionSegment } from "./types.ts";
import { diffWords } from "./diffWords.ts";

const SECTION_COLORS: Record<SuggestionSegment["section"], string> = {
  summary: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  experience: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  skills: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  education: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  projects: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  certifications: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  other: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
};

const STATUS_BORDER: Record<string, string> = {
  pending: "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
  accepted: "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
  rejected: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50",
};

interface SuggestionCardProps {
  segment: SuggestionSegment;
  /** Whether this card is currently highlighted (e.g. the user clicked on its span). */
  active: boolean;
  onAccept: () => void;
  onReject: () => void;
  onUndo: () => void;
  onEdit: (text: string) => void;
  onHover: (id: string | null) => void;
}

export function SuggestionCard({
  segment,
  active,
  onAccept,
  onReject,
  onUndo,
  onEdit,
  onHover,
}: SuggestionCardProps) {
  const { status, section, reason, original, edited, orphaned } = segment;

  return (
    <div
      className={`flex flex-col gap-2 p-3 border rounded-md transition-all
        ${STATUS_BORDER[status]}
        ${active ? "ring-2 ring-blue-400" : ""}`}
      onMouseEnter={() => onHover(segment.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SECTION_COLORS[section]}`}>
          {section}
        </span>

        {orphaned && (
          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            not found in doc
          </span>
        )}

        {status === "pending" ? (
          <div className="flex gap-1.5 ml-auto">
            <button
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-600 text-white
                         hover:bg-green-700 transition-colors"
              onClick={onAccept}
            >
              Accept
            </button>
            <button
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600
                         text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={onReject}
            >
              Reject
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <span className={`text-xs font-medium ${status === "accepted" ? "text-green-700 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
              {status === "accepted" ? "Accepted" : "Rejected"}
            </span>
            <button className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline" onClick={onUndo}>
              Undo
            </button>
          </div>
        )}
      </div>

      {/* Inline word-level diff: removed words in red, added words in green */}
      {original && (
        <p className="text-sm leading-relaxed">
          {diffWords(original, edited).map((tok, i) => {
            if (tok.type === "removed")
              return (
                <span key={i} className="line-through text-red-500 bg-red-50">
                  {tok.text}
                </span>
              );
            if (tok.type === "added")
              return (
                <span key={i} className="text-green-700 bg-green-50">
                  {tok.text}
                </span>
              );
            return <span key={i} className="text-gray-500 dark:text-gray-400">{tok.text}</span>;
          })}
        </p>
      )}

      {/* Editable suggestion */}
      <textarea
        className={`w-full text-sm border rounded-md px-2.5 py-1.5 resize-y leading-relaxed
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${status === "rejected" ? "text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" : "text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"}
          ${status === "accepted" ? "border-green-300" : ""}`}
        rows={Math.min(6, edited.split("\n").length + 1)}
        value={edited}
        onChange={(e) => onEdit(e.target.value)}
        disabled={status === "rejected"}
      />

      {/* Reason */}
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">{reason}</p>
    </div>
  );
}
