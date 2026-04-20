/**
 * Utilities for downloading the final resume as PDF or DOCX.
 * Both functions lazy-load their heavy dependencies so they don't affect
 * the initial bundle.
 */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Strips suggestion/diff spans from TipTap HTML so they don't appear in the PDF.
 */
function cleanHtmlForPdf(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  // Unwrap suggestion highlight spans — keep their text content.
  div.querySelectorAll("span[data-suggestion-id], span.diff-removed, span.diff-added").forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
  return div.innerHTML;
}

/**
 * Generates a PDF via pdfmake + html-to-pdfmake and downloads it directly —
 * no print dialog, no browser headers/footers.
 */
export async function downloadAsPdf(editorHtml: string, filename = "resume") {
  const [{ default: pdfMake }, pdfFontsModule, { default: htmlToPdfmake }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
    import("html-to-pdfmake"),
  ]);

  pdfMake.vfs = pdfFontsModule.pdfMake.vfs;

  const cleaned = cleanHtmlForPdf(editorHtml);
  const content = htmlToPdfmake(cleaned, {
    removeExtraBlanks: true,
    defaultStyles: {
      h1: { fontSize: 20, bold: true, marginBottom: 4 },
      h2: { fontSize: 13, bold: true, marginTop: 14, marginBottom: 4, decoration: "underline" },
      h3: { fontSize: 11, bold: true, marginTop: 8, marginBottom: 2 },
      p:  { fontSize: 10.5, lineHeight: 1.4, marginBottom: 2 },
      li: { fontSize: 10.5, lineHeight: 1.4 },
      a:  { color: "black", decoration: null },
    },
  });

  const docDef = {
    pageMargins: [50, 50, 50, 50] as [number, number, number, number],
    defaultStyle: { font: "Roboto", fontSize: 10.5, lineHeight: 1.4 },
    content: content as import("pdfmake/interfaces").Content,
  };

  pdfMake.createPdf(docDef).download(`${filename}.pdf`);
}

/**
 * Collects all text content from a <w:r> run element (handles split <w:t> nodes).
 */
function runText(run: Element): string {
  return Array.from(run.querySelectorAll("t"))
    .map((t) => t.textContent ?? "")
    .join("");
}

/**
 * Applies text replacements to word/document.xml inside the original DOCX.
 *
 * Strategy: walk every paragraph, collect its full text by concatenating runs,
 * then if that text contains `original`, replace it with `replacement` by
 * rewriting the first run's <w:t> and clearing all subsequent runs in that
 * paragraph. This preserves all run formatting (bold, italic, font, size, color)
 * on the first run of each changed paragraph.
 */
function patchDocumentXml(
  xml: string,
  replacements: Array<{ original: string; replacement: string }>
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  const paragraphs = doc.querySelectorAll("p");

  for (const para of paragraphs) {
    const runs = Array.from(para.querySelectorAll("r"));
    if (runs.length === 0) continue;

    const paraText = runs.map(runText).join("");

    for (const { original, replacement } of replacements) {
      if (!paraText.includes(original)) continue;

      const newText = paraText.replace(original, replacement);

      // Put entire new text into the first run's first <w:t>, clear the rest.
      const firstT = runs[0].querySelector("t");
      if (firstT) {
        firstT.textContent = newText;
        // Preserve leading/trailing whitespace.
        firstT.setAttribute("xml:space", "preserve");
      }

      // Remove all <w:t> nodes from subsequent runs so text isn't doubled.
      for (let i = 1; i < runs.length; i++) {
        runs[i].querySelectorAll("t").forEach((t) => t.remove());
      }

      break; // only one replacement per paragraph
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

/**
 * Downloads as DOCX.
 *
 * When `originalFile` is a .docx, patches the original OOXML to preserve all
 * formatting (fonts, spacing, colours, page layout). `replacements` should be
 * the accepted segments: each `{ original, replacement }` pair is an exact
 * string match against the DOCX paragraph text.
 *
 * Falls back to generating a plain DOCX from markdown when no original file is
 * available or when the original is a PDF.
 */
export async function downloadAsDocx(
  markdown: string,
  originalFile?: File,
  replacements: Array<{ original: string; replacement: string }> = [],
  filename = "resume"
) {
  // ── Path A: patch original DOCX ──────────────────────────────────────────
  if (originalFile && originalFile.name.endsWith(".docx")) {
    const JSZip = (await import("jszip")).default;

    const zip = await JSZip.loadAsync(await originalFile.arrayBuffer());
    const xmlEntry = zip.file("word/document.xml");
    if (!xmlEntry) throw new Error("word/document.xml not found in DOCX");

    const xml = await xmlEntry.async("string");
    const patched = patchDocumentXml(xml, replacements);
    zip.file("word/document.xml", patched);
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, `${filename}.docx`);
    return;
  }

  // ── Path B: generate fresh DOCX from markdown (no original file) ─────────
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import("docx");

  // Strip HTML tags, preserving text content (handles TipTap suggestion spans).
  function stripHtml(text: string): string {
    const div = document.createElement("div");
    div.innerHTML = text;
    return div.textContent ?? "";
  }

  // Parse inline markdown bold/italic into TextRun objects.
  function inlineRuns(text: string): InstanceType<typeof TextRun>[] {
    const runs: InstanceType<typeof TextRun>[] = [];
    // Matches ***bold+italic***, **bold**, *italic*, and plain text segments.
    const re = /(\*{3}(.+?)\*{3}|\*{2}(.+?)\*{2}|\*(.+?)\*|([^*]+))/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match[2] !== undefined) {
        runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
      } else if (match[3] !== undefined) {
        runs.push(new TextRun({ text: match[3], bold: true }));
      } else if (match[4] !== undefined) {
        runs.push(new TextRun({ text: match[4], italics: true }));
      } else if (match[5] !== undefined) {
        runs.push(new TextRun({ text: match[5] }));
      }
    }
    return runs.length ? runs : [new TextRun({ text })];
  }

  type DocxChild = InstanceType<typeof Paragraph>;
  const children: DocxChild[] = [];

  for (const rawLine of markdown.split("\n")) {
    const line = stripHtml(rawLine);
    if (line.startsWith("# ")) {
      children.push(new Paragraph({ children: inlineRuns(line.slice(2).trim()), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({ children: inlineRuns(line.slice(3).trim()), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({ children: inlineRuns(line.slice(4).trim()), heading: HeadingLevel.HEADING_3 }));
    } else if (/^[-*] /.test(line)) {
      children.push(new Paragraph({ children: inlineRuns(line.slice(2).trim()), bullet: { level: 0 } }));
    } else if (line.trim() === "") {
      children.push(new Paragraph({ children: [new TextRun("")] }));
    } else {
      children.push(new Paragraph({ children: inlineRuns(line) }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${filename}.docx`);
}
