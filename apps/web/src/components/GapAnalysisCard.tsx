import type { GapAnalysisResult } from "@resume-llm/core";

interface GapAnalysisCardProps {
  result: GapAnalysisResult;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-green-100 text-green-800" :
    score >= 50 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800";
  return (
    <span className={`text-2xl font-bold px-3 py-1 rounded-full ${color}`}>
      {score}
    </span>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">None found.</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function GapAnalysisCard({ result }: GapAnalysisCardProps) {
  return (
    <div className="flex flex-col gap-4 p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Gap Analysis</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Match score</span>
          <ScoreBadge score={result.overallMatchScore} />
        </div>
      </div>

      <Section title="Missing keywords">
        <TagList items={result.missingKeywords} color="bg-red-50 text-red-700" />
      </Section>

      <Section title="Missing skills">
        <TagList items={result.missingSkills} color="bg-orange-50 text-orange-700" />
      </Section>

      <Section title="Tone issues">
        <TagList items={result.toneIssues} color="bg-yellow-50 text-yellow-700" />
      </Section>

      <Section title="Strengths">
        <TagList items={result.strengthsFound} color="bg-green-50 text-green-700" />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}
