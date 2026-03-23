import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/startup.ts"],
  format: ["esm"],
  outDir: "dist",
  banner: {
    js: [
      "#!/usr/bin/env node",
      "import { createRequire as __bundleRequire } from 'node:module';",
      "const require = __bundleRequire(import.meta.url);",
    ].join("\n"),
  },
  dts: false,
  noExternal: [/@herbrand\/.*/],
  external: ["fastmcp", "chokidar", "fsevents", "effect", "sury", "@valibot/to-json-schema", /^node:/],
  platform: "node",
});
