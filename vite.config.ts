import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: "index.html",
        content: "src/content.ts"
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "content") {
            return "content.js"; // 🔑 important
          }
          return "assets/[name]-[hash].js";
        }
      }
    }
  }
});
