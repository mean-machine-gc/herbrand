import { defineConfig } from "tsup";

export default defineConfig([
  {
    // Browser bundle — @herbrand/core + @herbrand/signals for the UI
    entry: { "vendor-entry": "vendor-entry.ts" },
    format: ["esm"],
    outDir: "vendor",
    dts: false,
    noExternal: [/@herbrand\/.*/],
    external: ["@preact/signals-core"],
    platform: "browser",
  },
  {
    // Node bundle — vite plugin with @herbrand/core/watcher inlined
    entry: { "vite-plugin": "src/vite-plugin.ts" },
    format: ["esm"],
    outDir: "dist",
    dts: false,
    noExternal: [/@herbrand\/.*/],
    external: ["vite", "chokidar", /^node:/],
    platform: "node",
  },
]);
