import type { Suggestion } from "@resume-llm/core";
import type { Segment, SuggestionSegment, TextSegment } from "./types.ts";

// Markdown inline formatting characters to ignore when matching.
const FORMATTING_CHARS = new Set(["*", "_", "`", "~"]);

/**
 * Strips inline markdown formatting characters from a string.
 */
function stripFormatting(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (!FORMATTING_CHARS.has(text[i])) out += text[i];
  }
  return out;
}

/**
 * Builds a parallel index map so we can translate positions in the
 * stripped string back to positions in the original markdown string.
 *
 * map[stripped_index] = original_index
 */
function buildStrippedMap(text: string): { stripped: string; map: number[] } {
  let stripped = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (!FORMATTING_CHARS.has(text[i])) {
      map.push(i);
      stripped += text[i];
    }
  }
  return { stripped, map };
}

/**
 * Tries to locate `needle` inside `haystack`.
 *
 * First attempts an exact match. If that fails, strips formatting chars from
 * both sides and retries. On a stripped match, returns the span in the
 * *original* haystack (including any surrounding `**`, `_`, etc.) so that
 * the segment captures the full formatted run.
 *
 * Returns [start, end] (exclusive) in `haystack`, or null if not found.
 */
function findSpan(haystack: string, needle: string): [number, number] | null {
  // 1. Exact match.
  const exact = haystack.indexOf(needle);
  if (exact !== -1) return [exact, exact + needle.length];

  // 2. Stripped match — find plain-text needle in plain-text haystack,
  //    then map back to original positions.
  const strippedNeedle = stripFormatting(needle);
  if (!strippedNeedle) return null;

  const { stripped, map } = buildStrippedMap(haystack);
  const si = stripped.indexOf(strippedNeedle);
  if (si === -1) return null;

  const origStart = map[si];
  const origEndStripped = si + strippedNeedle.length - 1;
  const origEnd = map[origEndStripped] + 1;

  // Expand to swallow any adjacent formatting chars that belong to the same run.
  // Walk backwards from origStart to include opening `**` / `_` etc.
  let start = origStart;
  while (start > 0 && FORMATTING_CHARS.has(haystack[start - 1])) start--;

  // Walk forward from origEnd to include closing `**` / `_` etc.
  let end = origEnd;
  while (end < haystack.length && FORMATTING_CHARS.has(haystack[end])) end++;

  return [start, end];
}

/**
 * Splits `resumeMarkdown` into an ordered array of TextSegments and
 * SuggestionSegments by locating each suggestion's `originalText` in the
 * original resume. Inline markdown formatting (bold, italic, code) is ignored
 * during matching so `originalText: "Foo Bar"` matches `**Foo Bar**`.
 *
 * Suggestions whose text cannot be found are appended as orphaned segments
 * (visible in the sidebar but not embedded in the doc).
 */
export function buildSegments(
  resumeMarkdown: string,
  suggestions: Suggestion[]
): Segment[] {
  let segments: Segment[] = [{ type: "text", content: resumeMarkdown }];

  for (const s of suggestions) {
    if (!s.originalText) continue;

    const next: Segment[] = [];
    let located = false;

    for (const seg of segments) {
      if (seg.type !== "text" || located) {
        next.push(seg);
        continue;
      }

      const span = findSpan(seg.content, s.originalText);
      if (!span) {
        next.push(seg);
        continue;
      }

      const [start, end] = span;
      located = true;

      if (start > 0) {
        next.push({ type: "text", content: seg.content.slice(0, start) } as TextSegment);
      }
      next.push({
        type: "suggestion",
        id: s.id,
        section: s.section,
        reason: s.reason,
        // Capture the actual markdown span (may include ** etc.)
        original: seg.content.slice(start, end),
        suggested: s.suggestedText,
        edited: s.suggestedText,
        status: "pending",
        orphaned: false,
      } as SuggestionSegment);
      const tail = seg.content.slice(end);
      if (tail) next.push({ type: "text", content: tail } as TextSegment);
    }

    segments = next;

    if (!located) {
      segments.push({
        type: "suggestion",
        id: s.id,
        section: s.section,
        reason: s.reason,
        original: s.originalText,
        suggested: s.suggestedText,
        edited: s.suggestedText,
        status: "pending",
        orphaned: true,
      } as SuggestionSegment);
    }
  }

  return segments;
}
