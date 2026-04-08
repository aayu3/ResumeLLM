/**
 * JobInput — owns the job description capture mechanism.
 *
 * Future swap: URL input that fetches + parses a job posting.
 * The parent only ever sees { value, onChange }.
 */

interface JobInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function JobInput({ value, onChange, disabled }: JobInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">Job Description</label>
      <textarea
        className="w-full h-48 px-3 py-2 text-sm border border-gray-300 rounded-md resize-y
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400"
        placeholder="Paste the job description here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
      />
    </div>
  );
}
