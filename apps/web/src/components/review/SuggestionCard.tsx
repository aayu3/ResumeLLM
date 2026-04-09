import type { SuggestionSegment } from "./types.ts";

const SECTION_COLORS: Record<SuggestionSegment["section"], string> = {
  summary: "bg-purple-50 text-purple-700 border-purple-200",
  experience: "bg-blue-50 text-blue-700 border-blue-200",
  skills: "bg-teal-50 text-teal-700 border-teal-200",
  education: "bg-indigo-50 text-indigo-700 border-indigo-200",
  projects: "bg-cyan-50 text-cyan-700 border-cyan-200",
  certifications: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_BORDER: Record<string, string> = {
  pending: "border-gray-200",
  accepted: "border-green-300 bg-green-50",
  rejected: "border-gray-200 bg-gray-50 opacity-50",
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
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
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
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300
                         text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={onReject}
            >
              Reject
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <span className={`text-xs font-medium ${status === "accepted" ? "text-green-700" : "text-gray-400"}`}>
              {status === "accepted" ? "Accepted" : "Rejected"}
            </span>
            <button className="text-xs text-gray-400 hover:text-gray-600 underline" onClick={onUndo}>
              Undo
            </button>
          </div>
        )}
      </div>

      {/* Original text */}
      {original && (
        <p className="text-sm text-gray-400 line-through leading-relaxed">{original}</p>
      )}

      {/* Editable suggestion */}
      <textarea
        className={`w-full text-sm border rounded-md px-2.5 py-1.5 resize-y leading-relaxed
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${status === "rejected" ? "text-gray-400 bg-gray-50 border-gray-200" : "text-gray-900 bg-white border-gray-300"}
          ${status === "accepted" ? "border-green-300" : ""}`}
        rows={Math.min(6, edited.split("\n").length + 1)}
        value={edited}
        onChange={(e) => onEdit(e.target.value)}
        disabled={status === "rejected"}
      />

      {/* Reason */}
      <p className="text-xs text-gray-400 italic">{reason}</p>
    </div>
  );
}
