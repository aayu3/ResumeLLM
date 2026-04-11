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
 * Opens the resume in a new print-ready window and triggers the browser
 * print dialog (Save as PDF).
 *
 * Accepts editor.getHTML() from TipTap — already proper HTML with no
 * markdown symbols. Suggestion highlight spans are stripped by CSS.
 */
export function downloadAsPdf(editorHtml: string) {
  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resume</title>
  <style>
    body {
      font-family: Georgia, "Times New Roman", serif;
      max-width: 750px;
      margin: 0 auto;
      padding: 32px 24px;
      font-size: 11pt;
      line-height: 1.55;
      color: #111;
    }
    h1 { font-size: 20pt; margin: 0 0 4px; }
    h2 { font-size: 13pt; border-bottom: 1px solid #bbb; padding-bottom: 3px; margin: 18px 0 6px; }
    h3 { font-size: 11pt; margin: 10px 0 2px; }
    p  { margin: 3px 0; }
    ul { margin: 4px 0; padding-left: 18px; }
    li { margin: 2px 0; }
    a  { color: inherit; }
    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm 1.8cm; }
    }
    /* Strip suggestion highlight colours for print. */
    span[data-suggestion-id] {
      background: none !important;
      color: inherit !important;
      text-decoration: none !important;
      outline: none !important;
    }
  </style>
</head>
<body>${editorHtml}</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up blocked — please allow pop-ups for this site and try again.");
    return;
  }
  win.document.write(printHtml);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
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
  replacements: Array<{ original: string; replacement: string }> = []
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
    triggerDownload(blob, "resume_optimized.docx");
    return;
  }

  // ── Path B: generate fresh DOCX from markdown (no original file) ─────────
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import("docx");

  type DocxChild = InstanceType<typeof Paragraph>;
  const children: DocxChild[] = [];

  for (const rawLine of markdown.split("\n")) {
    if (rawLine.startsWith("# ")) {
      children.push(new Paragraph({ text: rawLine.slice(2).trim(), heading: HeadingLevel.HEADING_1 }));
    } else if (rawLine.startsWith("## ")) {
      children.push(new Paragraph({ text: rawLine.slice(3).trim(), heading: HeadingLevel.HEADING_2 }));
    } else if (rawLine.startsWith("### ")) {
      children.push(new Paragraph({ text: rawLine.slice(4).trim(), heading: HeadingLevel.HEADING_3 }));
    } else if (/^[-*] /.test(rawLine)) {
      children.push(new Paragraph({ text: rawLine.slice(2).trim(), bullet: { level: 0 } }));
    } else if (rawLine.trim() === "") {
      children.push(new Paragraph({ children: [new TextRun("")] }));
    } else {
      children.push(new Paragraph({ text: rawLine }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, "resume.docx");
}
