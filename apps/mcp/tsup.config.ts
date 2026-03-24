import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
  // Bundle everything — core workspace package gets inlined
  noExternal: [/@herbrand\/core/],
  // Keep fastmcp as external (it's a runtime dependency)
  external: ['fastmcp'],
});
