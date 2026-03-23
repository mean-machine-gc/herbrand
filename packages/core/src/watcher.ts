import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { watch } from "chokidar";
import type { SpecFile } from "./types.js";

const EXCLUDED_DIRS = new Set([
  "node_modules", "scratchpad", "src", "dist", "build", "specs",
]);

/** Read all spec files from a project directory (sync). */
export function readSpecs(projectDir: string): SpecFile[] {
  const files: SpecFile[] = [];

  // 1. Read project.hb.yaml from root
  const projectFile = join(projectDir, "project.hb.yaml");
  if (existsSync(projectFile)) {
    files.push({ fileName: "project.hb.yaml", content: readFileSync(projectFile, "utf-8") });
  }

  // 2. Read root specs/ (backward compat — flat projects)
  const specsDir = join(projectDir, "specs");
  if (existsSync(specsDir)) {
    for (const f of readdirSync(specsDir)) {
      if (f.endsWith(".hb.yaml")) {
        files.push({ fileName: f, content: readFileSync(join(specsDir, f), "utf-8") });
      }
    }
  }

  // 3. Discover context subdirectories: any child dir containing a specs/ subfolder
  for (const entry of readdirSync(projectDir)) {
    if (entry.startsWith(".") || EXCLUDED_DIRS.has(entry)) continue;
    const entryPath = join(projectDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;
    const contextSpecsDir = join(entryPath, "specs");
    if (!existsSync(contextSpecsDir) || !statSync(contextSpecsDir).isDirectory()) continue;
    for (const f of readdirSync(contextSpecsDir)) {
      if (f.endsWith(".hb.yaml")) {
        files.push({
          fileName: f,
          content: readFileSync(join(contextSpecsDir, f), "utf-8"),
          sourceContext: entry,
        });
      }
    }
  }

  return files;
}

/**
 * Watch a project directory for .hb.yaml spec changes using chokidar.
 * Calls onChange with the full spec list on initial load and on every change.
 * Returns a cleanup function.
 */
export function watchSpecs(
  projectDir: string,
  onChange: (specs: SpecFile[]) => void,
): () => void {
  const watcher = watch(
    [
      join(projectDir, "project.hb.yaml"),
      join(projectDir, "specs", "*.hb.yaml"),
      join(projectDir, "*", "specs", "*.hb.yaml"),
    ],
    { ignoreInitial: true },
  );

  // Initial load (synchronous, before watcher is ready)
  onChange(readSpecs(projectDir));

  // On any file event, re-read all specs
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const refresh = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => onChange(readSpecs(projectDir)), 100);
  };

  watcher.on("change", refresh);
  watcher.on("add", refresh);
  watcher.on("unlink", refresh);

  return () => {
    if (debounce) clearTimeout(debounce);
    watcher.close();
  };
}
