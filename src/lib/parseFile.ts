export type ParseWarning = "pdf-may-lose-formatting" | "pdf-no-text-detected";

export interface ParseResult {
  markdown: string;
  /** Rendered HTML for loading directly into TipTap. Only present for DOCX. */
  html?: string;
  warnings: ParseWarning[];
}

const BULLET_RE = /^[●•·▪▸◦‣⁃]\s*/;

interface RawItem {
  str: string;
  x: number;
  y: number;
  height: number;
  pageIndex: number;
}

function groupIntoLines(items: RawItem[]): RawItem[][] {
  if (items.length === 0) return [];

  // Sort top-to-bottom within each page (PDF y is bottom-up, so higher y = higher on page).
  const sorted = [...items].sort((a, b) =>
    a.pageIndex !== b.pageIndex
      ? a.pageIndex - b.pageIndex
      : b.y - a.y
  );

  const lines: RawItem[][] = [];
  let current: RawItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const ref = current[0];
    // Items within 3 units vertically on the same page belong to the same line.
    if (item.pageIndex === ref.pageIndex && Math.abs(item.y - ref.y) < 3) {
      current.push(item);
    } else {
      lines.push(current.sort((a, b) => a.x - b.x));
      current = [item];
    }
  }
  lines.push(current.sort((a, b) => a.x - b.x));

  return lines;
}

function linesToMarkdown(lines: RawItem[][]): string {
  const out: string[] = [];

  for (const line of lines) {
    const text = line.map((i) => i.str).join("").trim();
    if (!text) continue;

    if (BULLET_RE.test(text)) {
      if (out.length > 0) out.push("");
      out.push(text);
    } else {
      out.push(text);
    }
  }

  return out.join("\n").trim();
}

// ── DOCX ─────────────────────────────────────────────────────────────────────

export async function parseDocx(file: File): Promise<ParseResult> {
  const [mammoth, TurndownService] = await Promise.all([
    import("mammoth"),
    import("turndown"),
  ]);

  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  const td = new TurndownService.default({ headingStyle: "atx", bulletListMarker: "-" });

  // Always emit [text](url) — prevents autolink <url> when text === href.
  td.addRule("links", {
    filter: "a",
    replacement: (content, node) => {
      const href = (node as HTMLAnchorElement).getAttribute("href") ?? "";
      if (!href) return content;
      return `[${content || href}](${href})`;
    },
  });

  const markdown = td.turndown(html);

  // Return both: html for TipTap display, markdown for the LLM.
  return { markdown, html, warnings: [] };
}

// ── PDF ──────────────────────────────────────────────────────────────────────

export async function parsePdf(file: File): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist");

  // Vite resolves `new URL(..., import.meta.url)` at build time.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const allItems: RawItem[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    for (const item of content.items) {
      // pdfjs items are TextItem | TextMarkedContent — only TextItem has `str`.
      if (!("str" in item) || !item.str.trim()) continue;
      allItems.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        height: item.height ?? Math.abs(item.transform[3]),
        pageIndex: p - 1,
      });
    }
  }

  if (allItems.length === 0) {
    return { markdown: "", warnings: ["pdf-no-text-detected"] };
  }

  const lines = groupIntoLines(allItems);
  const markdown = linesToMarkdown(lines);

  return { markdown, warnings: ["pdf-may-lose-formatting"] };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "docx") return parseDocx(file);
  if (ext === "pdf") return parsePdf(file);
  throw new Error(`Unsupported file type: .${ext}`);
}
