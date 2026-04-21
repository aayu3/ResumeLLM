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
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Description</label>
      <textarea
        className="w-full h-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-y
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-400 placeholder:text-gray-400 dark:placeholder:text-gray-600"
        placeholder="Paste the job description here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
      />
    </div>
  );
}
