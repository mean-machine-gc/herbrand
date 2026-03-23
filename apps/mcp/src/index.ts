import { FastMCP } from "fastmcp";
import { z } from "zod";
import { HerbrandStore } from "@herbrand/signals";
import { watchSpecs } from "@herbrand/core/watcher";
import { startup } from "./startup.js";

// Project dir from CLI arg or env
const projectDir = process.argv[2] || process.env.HERBRAND_PROJECT || process.cwd();

const server = new FastMCP({
  name: "Herbrand",
  version: "0.1.0",
});

const store = new HerbrandStore();

// Watch specs and feed changes into the store
watchSpecs(projectDir, (specs) => store.setSpecFiles(specs));
startup(projectDir);

// --- Tools ---

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
