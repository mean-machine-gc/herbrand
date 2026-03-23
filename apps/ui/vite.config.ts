import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { herbrandSpecsPlugin } from "./src/vite-plugin.js";
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

export default defineConfig({
  plugins: [
    react(),
    herbrandSpecsPlugin(),
  ],
  resolve: { alias },
});
