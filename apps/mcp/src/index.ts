import { FastMCP } from "fastmcp";
import { z } from "zod";
import { HerbrandStore } from "@herbrand/signals";
import { readSpecs } from "@herbrand/core/watcher";
import { startup } from "./startup.js";

// Project dir from CLI arg or env
const projectDir = process.argv[2] || process.env.HERBRAND_PROJECT || process.cwd();

const server = new FastMCP({
  name: "Herbrand",
  version: "0.1.0",
});

const store = new HerbrandStore();

startup(projectDir);

// --- Tools ---

server.addTool({
  name: "get_pipeline_results",
  description: "Returns the full reactive pipeline state — spec count, spec-lint results (with spec names to fix), and behavior-lint results (with references). Use this to understand the project state and drive the validation loops.",
  parameters: z.object({
    context: z.string().optional().describe("Filter by context (folder name, e.g. 'ordering'). Omit for full system lint including cross-module integration checks."),
  }),
  execute: async (args) => {
    store.setSpecFiles(readSpecs(projectDir));
    store.setContextFilter(args.context ?? null);
    return JSON.stringify({
      specCount: args.context ? store.scopedSpecCount : store.specCount,
      specLint: args.context ? store.scopedSpecLintResults : store.specLintResults,
      hasSpecErrors: args.context ? store.scopedHasSpecErrors : store.hasSpecErrors,
      behaviorLint: args.context ? store.scopedBehaviorLintResults : store.behaviorLintResults,
    }, null, 2);
  },
});

server.addTool({
  name: "get_user_stories",
  description: "Returns a summary of all user stories derived from your specs — name, role, intent, business goal, and linked outcome status. Use this to understand the business domain landscape.",
  parameters: z.object({
    context: z.string().optional().describe("Filter by context (folder name, e.g. 'ordering'). Omit for all stories."),
  }),
  execute: async (args) => {
    store.setSpecFiles(readSpecs(projectDir));
    store.setContextFilter(args.context ?? null);
    const stories = args.context ? store.scopedUserStories : store.userStories;
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
    store.setSpecFiles(readSpecs(projectDir));
    const story = store.userStories[args.name];
    if (!story) return "User story not found";
    return JSON.stringify(story, null, 2);
  },
});

server.start({
  transportType: "stdio",
});
