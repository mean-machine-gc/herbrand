import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const VIRTUAL_MODULE_ID = "virtual:herbrand-specs";
const RESOLVED_ID = "\0" + VIRTUAL_MODULE_ID;

export function herbrandSpecsPlugin(): Plugin {
  let specsFolder = process.env.HERBRAND_FOLDER || process.cwd();

  function loadSpecs(): Array<{ fileName: string; content: string }> {
    const pattern = path.join(specsFolder, "src", "specs", "*.spec.ts");
    const files = fg.sync(pattern);
    return files.map((filePath) => ({
      fileName: path.basename(filePath),
      content: fs.readFileSync(filePath, "utf-8"),
    }));
  }

  return {
    name: "herbrand-specs",

    configResolved(config) {
      // Allow override from env or CLI
      if (process.env.HERBRAND_FOLDER) {
        specsFolder = path.resolve(process.env.HERBRAND_FOLDER);
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id === RESOLVED_ID) {
        const specs = loadSpecs();
        return `export const specs = ${JSON.stringify(specs)};`;
      }
    },

    configureServer(server) {
      // Watch the specs folder for changes
      const watchPath = path.join(specsFolder, "src", "specs");
      server.watcher.add(watchPath);

      server.watcher.on("change", (filePath) => {
        if (filePath.endsWith(".spec.ts")) {
          // Invalidate the virtual module to trigger HMR
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: "full-reload" });
          }
        }
      });

      server.watcher.on("add", (filePath) => {
        if (filePath.endsWith(".spec.ts")) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: "full-reload" });
          }
        }
      });
    },
  };
}
