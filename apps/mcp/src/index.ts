import { FastMCP } from "fastmcp";
import { z } from "zod";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import YAML from "yaml";
import { HerbrandStore } from "@herbrand/signals";
import { projectSchema, generateProjectJsonSchema, generateDecisionJsonSchema } from "@herbrand/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project dir from CLI arg or env
const projectDir = process.argv[2] || process.env.HERBRAND_PROJECT || process.cwd();

const server = new FastMCP({
  name: "Herbrand",
  version: "0.1.0",
});

const store = new HerbrandStore();

// --- Startup: install skills, start watcher, launch UI ---

function installSkills() {
  const skillsSource = path.resolve(__dirname, "../skills");
  const skillsTarget = path.join(projectDir, ".claude", "skills");

  if (!fs.existsSync(skillsSource)) return;

  fs.mkdirSync(skillsTarget, { recursive: true });

  for (const entry of fs.readdirSync(skillsSource, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copyDirRecursive(path.join(skillsSource, entry.name), path.join(skillsTarget, entry.name));
    }
  }
}

function copyDirRecursive(src: string, dst: string) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function launchUI() {
  const uiCli = path.resolve(__dirname, "../../ui/bin/cli.js");
  if (!fs.existsSync(uiCli)) return;

  const child = spawn("node", [uiCli, "--folder", projectDir], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
}

// --- JSON Schema generation + IDE setup ---

function regenerateJsonSchemas() {
  const herbrandDir = path.join(projectDir, ".herbrand");
  fs.mkdirSync(herbrandDir, { recursive: true });

  // Always write the project schema (static)
  const projSchema = generateProjectJsonSchema();
  fs.writeFileSync(
    path.join(herbrandDir, "project.schema.json"),
    JSON.stringify(projSchema, null, 2)
  );

  // Write decision schema (dynamic, depends on project.hb.yaml)
  const projectFile = path.join(projectDir, "project.hb.yaml");
  if (fs.existsSync(projectFile)) {
    try {
      const raw = YAML.parse(fs.readFileSync(projectFile, "utf-8"));
      const project = projectSchema.parse(raw);
      const decSchema = generateDecisionJsonSchema(project);
      fs.writeFileSync(
        path.join(herbrandDir, "decision.schema.json"),
        JSON.stringify(decSchema, null, 2)
      );
    } catch {
      // Invalid project.hb.yaml — skip schema generation
    }
  }
}

function setupIdeValidation() {
  const vscodeDir = path.join(projectDir, ".vscode");
  const settingsFile = path.join(vscodeDir, "settings.json");

  fs.mkdirSync(vscodeDir, { recursive: true });

  // Read existing settings or start fresh
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
    } catch {
      settings = {};
    }
  }

  // Add YAML schema associations
  if (!settings["yaml.schemas"]) settings["yaml.schemas"] = {};
  settings["yaml.schemas"][".herbrand/project.schema.json"] = "project.hb.yaml";
  settings["yaml.schemas"][".herbrand/decision.schema.json"] = "specs/*.hb.yaml";

  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

function watchProjectSchema() {
  const projectFile = path.join(projectDir, "project.hb.yaml");
  if (!fs.existsSync(projectDir)) return;

  let debounce: ReturnType<typeof setTimeout> | null = null;

  fs.watch(projectDir, { recursive: false }, (_event, fileName) => {
    if (fileName === "project.hb.yaml") {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => regenerateJsonSchemas(), 200);
    }
  });
}

// Run on startup
installSkills();
store.watch(projectDir);
regenerateJsonSchemas();
setupIdeValidation();
watchProjectSchema();
launchUI();

// --- Tools (3 read-only, no projectDir param needed) ---

server.addTool({
  name: "get_pipeline_results",
  description: "Returns the full reactive pipeline state — spec count, spec-lint results (with spec names to fix), and behavior-lint results (with references). Use this to understand the project state and drive the validation loops.",
  parameters: z.object({}),
  execute: async () => {
    return JSON.stringify({
      specCount: store.specCount,
      specLint: store.specLintResults,
      hasSpecErrors: store.hasSpecErrors,
      behaviorLint: store.behaviorLintResults,
    }, null, 2);
  },
});

server.addTool({
  name: "get_user_stories",
  description: "Returns a summary of all user stories derived from your specs — name, role, intent, business goal, and linked outcome status. Use this to understand the business domain landscape.",
  parameters: z.object({}),
  execute: async () => {
    const stories = store.userStories;
    const list = Object.entries(stories).map(([name, s]) => ({
      name,
      role: s.role,
      intentLabel: s.intentLabel,
      businessGoal: s.businessGoal,
      hasLinkedOutcome: s.hasLinkedOutcome,
    }));
    return JSON.stringify(list, null, 2);
  },
});

server.addTool({
  name: "get_user_story",
  description: "Returns a single user story by name with full business details — acceptance criteria (Given/When/Then), decision table, scenarios, and views. Use this to understand a specific decision in business terms.",
  parameters: z.object({
    name: z.string().describe("User story name (the intent decision spec name), e.g. 'create-order'"),
  }),
  execute: async (args) => {
    const story = store.userStories[args.name];
    if (!story) return "User story not found";
    return JSON.stringify(story, null, 2);
  },
});

server.start({
  transportType: "stdio",
});
