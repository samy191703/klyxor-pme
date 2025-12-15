import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CALC_ORIGIN = "https://index.klyxor.com";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer()
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        `connect-src 'self' ws: wss: ${CALC_ORIGIN}`,
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob:",
        "frame-ancestors 'self'",
      ].join("; "),
    },
    port: 5000, // serve on 5000 to match your page URL
    proxy: {
      // Browser calls /calc/... on localhost:5000 (same-origin),
      // Vite forwards it to https://index.klyxor.com
      "/calc": {
        target: "https://index.klyxor.com",
        changeOrigin: true,
        secure: true, // set to false only if you have local TLS issues
        rewrite: (path) => path.replace(/^\/calc/, ""), // drop the /calc prefix
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
