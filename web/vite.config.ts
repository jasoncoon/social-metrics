import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The metrics API only allows CORS from jasoncoon.github.io; proxy it locally.
const proxy = {
  "/social-metrics-api": {
    target: "https://social-metrics.evilgeniuslabs.org",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/social-metrics-api/, ""),
  },
};

// Served from https://jasoncoon.github.io/social-metrics/ (see .github/workflows/pages.yml).
export default defineConfig({
  base: "./",
  plugins: [react()],
  // The tracked handles live in ../src/handles.json (shared with the collector Lambda).
  server: { fs: { allow: [".", "../src/handles.json"] }, proxy },
  preview: { proxy },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      input: {
        home: "index.html",
        "bsky/index": "bsky/index.html",
        "bsky/profile": "bsky/profile.html",
        "masto/index": "masto/index.html",
        "masto/profile": "masto/profile.html",
        "masto/followers": "masto/followers.html",
        "masto/posts": "masto/posts.html",
      },
    },
  },
});
