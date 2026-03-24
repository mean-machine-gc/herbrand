import type { Plugin } from "vite";
import path from "node:path";
import { readSpecs, watchSpecs } from "@herbrand/core/watcher";
import type { SpecFile } from "@herbrand/core";

const VIRTUAL_MODULE_ID = "virtual:herbrand-specs";
const RESOLVED_ID = "\0" + VIRTUAL_MODULE_ID;

export function herbrandSpecsPlugin(): Plugin {
  let projectFolder = process.env.HERBRAND_FOLDER || process.cwd();
  let specs: SpecFile[] = [];

  return {
    name: "herbrand-specs",

    configResolved() {
      if (process.env.HERBRAND_FOLDER) {
        projectFolder = path.resolve(process.env.HERBRAND_FOLDER);
      }
      // Initial read — works for both dev and build
      specs = readSpecs(projectFolder);
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id === RESOLVED_ID) {
        return `export const specs = ${JSON.stringify(specs)};`;
      }
    },

    configureServer(server) {
      watchSpecs(projectFolder, (newSpecs) => {
        specs = newSpecs;
        server.ws.send({ type: "custom", event: "herbrand:specs-update", data: newSpecs });
      });
    },
  };
}
