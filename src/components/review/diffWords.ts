export type DiffToken = { type: "equal" | "removed" | "added"; text: string };

/**
 * Splits text into word tokens, preserving spaces as separate tokens so the
 * reconstructed output has correct spacing.
 */
function tokenize(text: string): string[] {
  return text.match(/[^\s]+|\s+/g) ?? [];
}

/**
 * Produces a word-level diff between two strings.
 * Returns an array of tokens tagged as equal, removed, or added.
 * Adjacent tokens of the same type are merged for cleaner rendering.
 */
export function diffWords(original: string, suggested: string): DiffToken[] {
  const a = tokenize(original);
  const b = tokenize(suggested);
  const m = a.length;
  const n = b.length;

  // Build LCS table.
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to produce diff ops.
  const raw: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.unshift({ type: "equal", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ type: "added", text: b[j - 1] });
      j--;
    } else {
      raw.unshift({ type: "removed", text: a[i - 1] });
      i--;
    }
  }

  // Merge consecutive tokens of the same type.
  const merged: DiffToken[] = [];
  for (const token of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.text += token.text;
    } else {
      merged.push({ ...token });
    }
  }

  // Group interleaved removed/added runs into [all-removed, all-added] blocks
  // so the diff reads as a whole section replacement rather than alternating words.
  const grouped: DiffToken[] = [];
  let gi = 0;
  while (gi < merged.length) {
    const tok = merged[gi];
    if (tok.type === "equal") {
      grouped.push(tok);
      gi++;
    } else {
      // Collect a contiguous run of removed/added tokens.
      // Also absorb equal tokens that contain no word characters (spaces, commas,
      // periods, etc.) when they appear between changes — they'd otherwise produce
      // a flood of consecutive pairs.
      let removed = "";
      let added = "";
      while (gi < merged.length) {
        const cur = merged[gi];
        if (cur.type !== "equal") {
          if (cur.type === "removed") removed += cur.text;
          else added += cur.text;
          gi++;
        } else if (
          !/\w/.test(cur.text) &&
          gi + 1 < merged.length &&
          merged[gi + 1].type !== "equal"
        ) {
          // Non-word equal token (whitespace/punctuation) between changes — absorb.
          removed += cur.text;
          added += cur.text;
          gi++;
        } else {
          break;
        }
      }
      if (removed) grouped.push({ type: "removed", text: removed });
      if (added) grouped.push({ type: "added", text: added });
    }
  }

  return grouped;
}
