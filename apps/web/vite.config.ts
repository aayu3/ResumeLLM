import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:8787",
      "/health": "http://localhost:8787",
      "/mcp": "http://localhost:8787",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React + TipTap core — changes rarely, long cache lifetime.
          "vendor-react": ["react", "react-dom"],
          "vendor-tiptap": [
            "@tiptap/react",
            "@tiptap/core",
            "@tiptap/starter-kit",
            "tiptap-markdown",
          ],
          // Heavy lazy-loaded libs — only fetched on first use.
          "vendor-pdf": ["pdfjs-dist", "unpdf"],
          "vendor-docx": ["docx"],
          "vendor-mammoth": ["mammoth"],
          "vendor-zip": ["jszip"],
          "vendor-pdfmake": ["pdfmake", "html-to-pdfmake"],
        },
      },
    },
  },
});
