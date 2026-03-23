import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["vendor-entry.ts"],
  format: ["esm"],
  outDir: "vendor",
  dts: false,
  noExternal: [/@herbrand\/.*/],
  external: ["@preact/signals-core"],
});
