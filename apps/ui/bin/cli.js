#!/usr/bin/env node

import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse --folder argument
const args = process.argv.slice(2);
let folder = process.cwd();

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--folder" && args[i + 1]) {
    folder = path.resolve(args[i + 1]);
    i++;
  }
}

process.env.HERBRAND_FOLDER = folder;

const server = await createServer({
  root: path.resolve(__dirname, ".."),
  server: {
    open: true,
  },
});

await server.listen();

console.log(`\n  Herbrand UI`);
console.log(`  Watching: ${folder}/src/specs/*.spec.ts`);
server.printUrls();
console.log();
