import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { herbrandSpecsPlugin } from './src/vite-plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

// When published, core is vendored at ./vendor with its own package.json + exports
// When in monorepo dev, npm workspaces resolve @herbrand/core directly
const vendorPath = resolve(__dirname, 'vendor');
const useVendor = existsSync(vendorPath);

// The vendor alias needs to map sub-path exports to actual file paths.
// Core's exports field maps e.g. "./graph" to "./src/graph/graph.ts"
// We read the vendor package.json to build aliases dynamically.
function buildVendorAliases() {
  if (!useVendor) return [];

  try {
    const pkg = JSON.parse(readFileSync(resolve(vendorPath, 'package.json'), 'utf-8'));
    const aliases: { find: string | RegExp; replacement: string }[] = [];

    for (const [key, value] of Object.entries(pkg.exports ?? {})) {
      const importPath = key === '.' ? '@herbrand/core' : `@herbrand/core/${key.slice(2)}`;
      aliases.push({
        find: importPath,
        replacement: resolve(vendorPath, value as string),
      });
    }

    return aliases;
  } catch {
    return [];
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), herbrandSpecsPlugin()],
  ...(useVendor ? {
    resolve: {
      alias: buildVendorAliases(),
    },
  } : {}),
});
