import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const VIRTUAL_MODULE_ID = "virtual:herbrand-specs";
const RESOLVED_ID = "\0" + VIRTUAL_MODULE_ID;

export function herbrandSpecsPlugin(): Plugin {
  let projectFolder = process.env.HERBRAND_FOLDER || process.cwd();

  function loadSpecs(): Array<{ fileName: string; content: string }> {
    const files: Array<{ fileName: string; content: string }> = [];

    // Load project.hb.yaml from project root
    const projectFile = path.join(projectFolder, "project.hb.yaml");
    if (fs.existsSync(projectFile)) {
      files.push({ fileName: "project.hb.yaml", content: fs.readFileSync(projectFile, "utf-8") });
    }

    // Load specs/*.hb.yaml
    const specFiles = fg.sync(path.join(projectFolder, "specs", "*.hb.yaml"));
    for (const filePath of specFiles) {
      files.push({ fileName: path.basename(filePath), content: fs.readFileSync(filePath, "utf-8") });
    }

    return files;
  }

  return {
    name: "herbrand-specs",

    configResolved() {
      if (process.env.HERBRAND_FOLDER) {
        projectFolder = path.resolve(process.env.HERBRAND_FOLDER);
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
      // Watch project root for project.hb.yaml
      server.watcher.add(projectFolder);
      // Watch specs folder
      const specsDir = path.join(projectFolder, "specs");
      server.watcher.add(specsDir);

      const reload = (filePath: string) => {
        if (filePath.endsWith(".hb.yaml")) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: "full-reload" });
          }
        }
      };

      server.watcher.on("change", reload);
      server.watcher.on("add", reload);
    },
  };
}
