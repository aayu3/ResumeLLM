import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * TipTap inline mark for LLM suggestion spans.
 * Parses <span data-suggestion-id="…" data-status="…"> from HTML content
 * and preserves those attributes so CSS can style them.
 */
export const SuggestionMark = Mark.create({
  name: "suggestion",

  addAttributes() {
    return {
      id: { default: null },
      status: { default: "pending" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-suggestion-id]",
        getAttrs: (el) => ({
          id: (el as HTMLElement).getAttribute("data-suggestion-id"),
          status: (el as HTMLElement).getAttribute("data-status") ?? "pending",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({
        "data-suggestion-id": HTMLAttributes.id,
        "data-status": HTMLAttributes.status,
      }),
      0,
    ];
  },
});
