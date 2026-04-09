export type ParseWarning = "pdf-may-lose-formatting" | "pdf-no-text-detected";

export interface ParseResult {
  markdown: string;
  warnings: ParseWarning[];
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
  const markdown = td.turndown(html);

  return { markdown, warnings: [] };
}

// ── PDF ──────────────────────────────────────────────────────────────────────

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

function medianHeight(items: RawItem[]): number {
  const heights = items.map((i) => i.height).filter((h) => h > 2).sort((a, b) => a - b);
  if (heights.length === 0) return 12;
  return heights[Math.floor(heights.length / 2)];
}

function leftMargin(items: RawItem[]): number {
  const xs = items.map((i) => i.x).sort((a, b) => a - b);
  // 5th percentile to ignore header/footer outliers.
  return xs[Math.floor(xs.length * 0.05)] ?? 0;
}

function linesToMarkdown(lines: RawItem[][], bodyHeight: number, margin: number): string {
  const out: string[] = [];

  for (const line of lines) {
    const text = line.map((i) => i.str).join("").trim();
    if (!text) continue;

    const maxH = Math.max(...line.map((i) => i.height));
    const minX = Math.min(...line.map((i) => i.x));

    const isHeading =
      maxH > bodyHeight * 1.3 ||
      (text === text.toUpperCase() && text.replace(/\s/g, "").length > 2);
    const isIndented = minX > margin + 15;

    if (isHeading) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      out.push(`## ${text}`);
      out.push("");
    } else if (isIndented) {
      out.push(`- ${text}`);
    } else {
      out.push(text);
    }
  }

  return out.join("\n").trim();
}

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

  const body = medianHeight(allItems);
  const margin = leftMargin(allItems);
  const lines = groupIntoLines(allItems);
  const markdown = linesToMarkdown(lines, body, margin);

  return { markdown, warnings: ["pdf-may-lose-formatting"] };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "docx") return parseDocx(file);
  if (ext === "pdf") return parsePdf(file);
  throw new Error(`Unsupported file type: .${ext}`);
}
