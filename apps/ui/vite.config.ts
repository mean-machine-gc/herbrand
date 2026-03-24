import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { herbrandSpecsPlugin } from './src/vite-plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

// When published, core is vendored at ./vendor with its own package.json + exports
// When in monorepo dev, npm workspaces resolve it
const vendorPath = resolve(__dirname, 'vendor');
const useVendor = existsSync(vendorPath);

export default defineConfig({
  plugins: [react(), tailwindcss(), herbrandSpecsPlugin()],
  ...(useVendor ? {
    resolve: {
      alias: [
        // Map @herbrand/core sub-path imports to vendor/src/
        { find: /^@herbrand\/core\/(.+)$/, replacement: resolve(vendorPath, 'src/$1.ts') },
        { find: '@herbrand/core', replacement: resolve(vendorPath, 'src/index.ts') },
      ],
    },
  } : {}),
});
