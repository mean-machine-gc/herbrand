#!/usr/bin/env node

import { createServer } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Parse --folder argument
const folderIdx = process.argv.indexOf('--folder');
const folder = folderIdx !== -1 && process.argv[folderIdx + 1]
  ? resolve(process.argv[folderIdx + 1])
  : process.cwd();

process.env.HERBRAND_FOLDER = folder;

const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
});

await server.listen();
server.printUrls();

console.log(`\n  Herbrand UI watching: ${folder}\n`);
