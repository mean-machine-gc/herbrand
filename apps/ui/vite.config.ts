import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// When installed from npm, @herbrand/* packages aren't in node_modules.
// The vendor/vendor-entry.js (created by prepublishOnly) provides them.
// In monorepo dev, workspace symlinks handle resolution — no alias needed.
const vendorFile = path.resolve(__dirname, "vendor", "vendor-entry.js");
const alias = fs.existsSync(vendorFile) ? {
  "@herbrand/signals": vendorFile,
  "@herbrand/core": vendorFile,
} : {};

// Use pre-built plugin (npm) or source (monorepo dev)
// Both paths use variables so esbuild can't statically analyze and bundle them.
const distPlugin = path.resolve(__dirname, "dist", "vite-plugin.js");
const srcPlugin = path.resolve(__dirname, "src", "vite-plugin.js");
const { herbrandSpecsPlugin } = fs.existsSync(distPlugin)
  ? await import(distPlugin)
  : await import(srcPlugin);

export default defineConfig({
  plugins: [
    react(),
    herbrandSpecsPlugin(),
  ],
  resolve: { alias },
});
