/**
 * Vite plugin: watches YAML spec files and pushes updates to the UI via WebSocket.
 *
 * - Reads all .hb.yaml files from the project folder
 * - Serves initial data via a virtual module
 * - On file change, re-reads and sends update via Vite's built-in WebSocket
 */

import type { Plugin, ViteDevServer } from 'vite';
import { watch } from 'chokidar';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

export type SpecFilePayload = {
  path: string;
  content: string;
};

const VIRTUAL_MODULE_ID = 'virtual:herbrand-specs';
const RESOLVED_ID = '\0' + VIRTUAL_MODULE_ID;

function collectProjectFiles(dir: string, base: string = ''): SpecFilePayload[] {
  const files: SpecFilePayload[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    const rel = base ? join(base, entry) : entry;
    if (statSync(full).isDirectory()) {
      files.push(...collectProjectFiles(full, rel));
    } else if (entry.endsWith('.hb.yaml') || entry.endsWith('.md')) {
      files.push({ path: rel, content: readFileSync(full, 'utf-8') });
    }
  }
  return files;
}

export function herbrandSpecsPlugin(): Plugin {
  const projectFolder = process.env.HERBRAND_FOLDER || join(process.cwd(), '..', '..', 'packages', 'core', 'example');
  let server: ViteDevServer | null = null;
  let currentFiles: SpecFilePayload[] = [];

  function refresh() {
    try {
      currentFiles = collectProjectFiles(projectFolder);
    } catch {
      currentFiles = [];
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  function debouncedRefresh() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      refresh();
      if (server) {
        server.ws.send({
          type: 'custom',
          event: 'herbrand:specs-update',
          data: currentFiles,
        });
      }
      console.log(`[herbrand] ${currentFiles.length} files updated`);
    }, 100);
  }

  return {
    name: 'herbrand-specs',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id === RESOLVED_ID) {
        refresh();
        return `export const specs = ${JSON.stringify(currentFiles)};`;
      }
    },

    configureServer(srv) {
      server = srv;
      refresh();

      const watcher = watch(projectFolder, {
        ignoreInitial: true,
        depth: 5,
        ignored: ['**/node_modules/**', '**/.git/**'],
      });

      watcher.on('change', debouncedRefresh);
      watcher.on('add', debouncedRefresh);
      watcher.on('unlink', debouncedRefresh);

      console.log(`[herbrand] watching ${projectFolder}`);
    },
  };
}
