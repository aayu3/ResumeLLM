import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "tiptap-markdown";
import type { Segment } from "./types.ts";
import { SuggestionMark } from "./SuggestionMark.ts";
import { EditorToolbar } from "../EditorToolbar.tsx";

/**
 * Converts the segment array into a markdown+HTML string for TipTap.
 * Text segments pass through as raw markdown; suggestion segments become
 * <span data-suggestion-id="…"> elements that SuggestionMark parses.
 */
function segmentsToContent(segments: Segment[]): string {
  return segments
    .map((seg) => {
      if (seg.type === "text") return seg.content;
      if (seg.orphaned) return "";
      const text = seg.status === "rejected" ? seg.original : seg.edited;
      const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<span data-suggestion-id="${seg.id}" data-status="${seg.status}">${safe}</span>`;
    })
    .join("");
}

interface ResumeDocumentProps {
  segments: Segment[];
  hoveredId: string | null;
  /** Set by ResumeDocument once the editor is ready. */
  editorRef: React.MutableRefObject<{ getMarkdown: () => string; getHTML: () => string } | null>;
  onSegmentClick: (id: string) => void;
  onSegmentHover: (id: string | null) => void;
}

export function ResumeDocument({
  segments,
  hoveredId,
  editorRef,
  onSegmentClick,
  onSegmentHover,
}: ResumeDocumentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Markdown.configure({ html: true, transformPastedText: false, transformCopiedText: false }),
      SuggestionMark,
    ],
    content: segmentsToContent(segments),
    editable: true,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-6 py-4",
      },
    },
  });

  // Expose editor accessors to parent for copy/download.
  useEffect(() => {
    if (!editor) return;
    editorRef.current = {
      // tiptap-markdown adds a `markdown` namespace to storage but doesn't
      // ship a matching TS declaration — cast through unknown to access it.
      getMarkdown: () =>
        (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown(),
      getHTML: () => editor.getHTML(),
    };
    return () => { editorRef.current = null; };
  }, [editor, editorRef]);

  // Rebuild content whenever segments change (accept / reject / undo / edit).
  const prevContent = useRef<string | null>(null);
  useEffect(() => {
    if (!editor) return;
    const content = segmentsToContent(segments);
    if (content === prevContent.current) return;
    prevContent.current = content;
    // Preserve cursor position by only updating if content truly changed.
    editor.commands.setContent(content);
  }, [editor, segments]);

  // Hover ring: manipulate the DOM attribute directly — no full content rebuild.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root
      .querySelectorAll("[data-suggestion-id][data-hovered]")
      .forEach((el) => el.removeAttribute("data-hovered"));
    if (hoveredId) {
      root
        .querySelector(`[data-suggestion-id="${hoveredId}"]`)
        ?.setAttribute("data-hovered", "true");
    }
  }, [hoveredId]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const span = (e.target as HTMLElement).closest(
      "[data-suggestion-id]"
    ) as HTMLElement | null;
    const id = span?.getAttribute("data-suggestion-id");
    if (id) onSegmentClick(id);
  }

  function handleMouseOver(e: React.MouseEvent<HTMLDivElement>) {
    const span = (e.target as HTMLElement).closest(
      "[data-suggestion-id]"
    ) as HTMLElement | null;
    onSegmentHover(span?.getAttribute("data-suggestion-id") ?? null);
  }

  return (
    <div className="flex flex-col h-full">
      {editor && <EditorToolbar editor={editor} />}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseLeave={() => onSegmentHover(null)}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
