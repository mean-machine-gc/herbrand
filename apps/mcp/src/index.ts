import { FastMCP } from "fastmcp";
import { z } from "zod";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { HerbrandStore } from "@herbrand/signals";

const server = new FastMCP({
  name: "Herbrand",
  version: "0.1.0",
});

const store = new HerbrandStore();

// Track which project we're watching — start watching on first tool call
let watchingDir: string | null = null;

let uiLaunched = false;

function launchUI(projectDir: string) {
  if (uiLaunched) return;
  uiLaunched = true;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uiCli = path.resolve(__dirname, "../../ui/bin/cli.js");

  const child = spawn("node", [uiCli, "--folder", projectDir], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
}

function ensureWatching(projectDir: string) {
  if (watchingDir !== projectDir) {
    store.watch(projectDir);
    watchingDir = projectDir;
    launchUI(projectDir);
  }
}

const projectDirParam = z.object({
  projectDir: z.string().describe("Absolute path to the herbrand project directory"),
});

/// Tool: get_pipeline_results
/// The agent's primary feedback tool — returns full project state in one call.
/// Drives the validation loops: spec-lint results tell the agent what to fix,
/// behavior-lint results tell the agent what's missing in the system.

server.addTool({
  name: "get_pipeline_results",
  description: "Returns the full reactive pipeline state — spec count, spec-lint results (with spec names to fix), and behavior-lint results (with references). Use this to understand the project state and drive the validation loops.",
  parameters: projectDirParam,
  execute: async (args) => {
    ensureWatching(args.projectDir);
    return JSON.stringify({
      specCount: store.specCount,
      specLint: store.specLintResults,
      hasSpecErrors: store.hasSpecErrors,
      behaviorLint: store.behaviorLintResults,
    }, null, 2);
  },
});

/// Tool: get_user_stories
/// The agent's business context tool — returns summary of all user stories.
/// Use this to understand the domain landscape and what decisions exist.

server.addTool({
  name: "get_user_stories",
  description: "Returns a summary of all user stories derived from the decision graph — name, role, intent, business goal, and linked outcome status. Use this to understand the business domain landscape.",
  parameters: projectDirParam,
  execute: async (args) => {
    ensureWatching(args.projectDir);
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

/// Tool: get_user_story
/// The agent's deep dive tool — returns full business details for one decision.
/// Includes acceptance criteria, decision table, scenarios, and views.

server.addTool({
  name: "get_user_story",
  description: "Returns a single user story by name with full business details — acceptance criteria (Given/When/Then), decision table, scenarios, and views. Use this to understand a specific decision in business terms.",
  parameters: z.object({
    projectDir: z.string().describe("Absolute path to the herbrand project directory"),
    name: z.string().describe("User story name (the intent decision spec name), e.g. 'create-order'"),
  }),
  execute: async (args) => {
    ensureWatching(args.projectDir);
    const story = store.userStories[args.name];
    if (!story) return "User story not found";
    return JSON.stringify(story, null, 2);
  },
});

server.start({
  transportType: "stdio",
});
