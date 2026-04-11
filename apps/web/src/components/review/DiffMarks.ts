import { Mark, mergeAttributes } from "@tiptap/core";

/** Applied to words that exist in `original` but not `edited` (red strikethrough). */
export const DiffRemovedMark = Mark.create({
  name: "diffRemoved",
  parseHTML() {
    return [{ tag: "span.diff-removed" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "diff-removed" }), 0];
  },
});

/** Applied to words that exist in `edited` but not `original` (green). */
export const DiffAddedMark = Mark.create({
  name: "diffAdded",
  parseHTML() {
    return [{ tag: "span.diff-added" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "diff-added" }), 0];
  },
});
