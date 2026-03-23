import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/startup.ts"],
  format: ["esm"],
  outDir: "dist",
  banner: { js: "#!/usr/bin/env node" },
  dts: false,
  noExternal: [/@herbrand\/.*/],
  external: ["fastmcp", "chokidar", "fsevents", "effect", "sury", "@valibot/to-json-schema", /^node:/],
  platform: "node",
});
