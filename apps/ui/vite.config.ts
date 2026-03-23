import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { herbrandSpecsPlugin } from "./src/vite-plugin.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// When installed from npm, @herbrand/signals and @herbrand/core
// aren't in node_modules — they're pre-bundled in vendor/index.js
const vendorFile = path.resolve(__dirname, "vendor", "index.js");
const useVendor = fs.existsSync(vendorFile);

export default defineConfig({
  plugins: [
    react(),
    herbrandSpecsPlugin(),
  ],
  resolve: useVendor ? {
    alias: {
      "@herbrand/signals": vendorFile,
      "@herbrand/core": vendorFile,
    },
  } : {},
});
