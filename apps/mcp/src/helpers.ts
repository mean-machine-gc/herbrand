/**
 * Helper: read project files and feed the store imperatively.
 *
 * Each tool call reads fresh files — no watcher, no persistent state.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { HerbrandStore, StoreFile } from '@herbrand/core/store';

export function collectProjectFiles(dir: string, base: string = ''): StoreFile[] {
  const files: StoreFile[] = [];
  try {
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
  } catch {
    // directory doesn't exist yet
  }
  return files;
}

export function refreshStore(store: HerbrandStore, projectDir: string) {
  const files = collectProjectFiles(projectDir);
  store.setFiles(files);
}
