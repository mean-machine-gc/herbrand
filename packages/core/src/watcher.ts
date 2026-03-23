import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { watch } from "chokidar";
import type { SpecFile } from "./types.js";

/** Read all spec files from a project directory (sync). */
export function readSpecs(projectDir: string): SpecFile[] {
  const files: SpecFile[] = [];

  const projectFile = join(projectDir, "project.hb.yaml");
  if (existsSync(projectFile)) {
    files.push({ fileName: "project.hb.yaml", content: readFileSync(projectFile, "utf-8") });
  }

  const specsDir = join(projectDir, "specs");
  if (existsSync(specsDir)) {
    for (const f of readdirSync(specsDir)) {
      if (f.endsWith(".hb.yaml")) {
        files.push({ fileName: f, content: readFileSync(join(specsDir, f), "utf-8") });
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
    [join(projectDir, "project.hb.yaml"), join(projectDir, "specs", "*.hb.yaml")],
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
