import { FastMCP } from "fastmcp";
import { z } from "zod";
import { HerbrandStore } from "@herbrand/signals";
const server = new FastMCP({
    name: "Herbrand",
    version: "0.1.0",
});
const store = new HerbrandStore();
// Track which project we're watching — start watching on first tool call
let watchingDir = null;
function ensureWatching(projectDir) {
    if (watchingDir !== projectDir) {
        store.watch(projectDir);
        watchingDir = projectDir;
    }
}
const projectDirParam = z.object({
    projectDir: z.string().describe("Absolute path to the herbrand project directory"),
});
/// Pipeline read tools (get-prefixed, read from store)
server.addTool({
    name: "get_parsed_specs",
    description: "Returns the current parsed specs from the reactive store. Specs are parsed automatically when files change.",
    parameters: projectDirParam,
    execute: async (args) => {
        ensureWatching(args.projectDir);
        return JSON.stringify(store.parsedSpecs, null, 2);
    },
});
server.addTool({
    name: "get_spec_lint",
    description: "Returns the current spec-lint results from the reactive store. Lint runs automatically when specs change. Reports missing descriptions, scenarios, info, context/module/aggregate.",
    parameters: projectDirParam,
    execute: async (args) => {
        ensureWatching(args.projectDir);
        return JSON.stringify(store.specLintResults, null, 2);
    },
});
server.addTool({
    name: "get_behavior_lint",
    description: "Returns the current behavior-lint results from the reactive store. Lint runs automatically when the decision graph changes. Reports orphans, dead ends, info flow gaps, unhandled rejections, boundary issues.",
    parameters: projectDirParam,
    execute: async (args) => {
        ensureWatching(args.projectDir);
        return JSON.stringify(store.behaviorLintResults, null, 2);
    },
});
/// Agent-facing read tools (get-prefixed, read from store)
server.addTool({
    name: "get_spec",
    description: "Returns a single parsed decision spec by name from the reactive store.",
    parameters: z.object({
        projectDir: z.string().describe("Absolute path to the herbrand project directory"),
        name: z.string().describe("Spec name, e.g. 'create-order'"),
    }),
    execute: async (args) => {
        ensureWatching(args.projectDir);
        const spec = store.parsedSpecs.specs[args.name];
        if (!spec)
            return "Spec not found";
        return JSON.stringify(spec, null, 2);
    },
});
server.addTool({
    name: "get_specs_list",
    description: "Returns a list of all decision specs with name, type, and description from the reactive store.",
    parameters: projectDirParam,
    execute: async (args) => {
        ensureWatching(args.projectDir);
        const list = Object.entries(store.parsedSpecs.specs).map(([name, spec]) => ({
            name,
            type: spec.type,
            description: spec.description,
        }));
        return JSON.stringify(list, null, 2);
    },
});
server.addTool({
    name: "get_pipeline_results",
    description: "Returns a summary of the full reactive pipeline state — spec count, spec-lint results, graph status, and behavior-lint results.",
    parameters: projectDirParam,
    execute: async (args) => {
        ensureWatching(args.projectDir);
        return JSON.stringify({
            specCount: store.specCount,
            specLint: store.specLintResults,
            hasSpecErrors: store.hasSpecErrors,
            graph: store.decisionGraph ? { nodes: store.nodeCount } : null,
            behaviorLint: store.behaviorLintResults,
        }, null, 2);
    },
});
server.addTool({
    name: "get_user_stories",
    description: "Returns all user stories derived from the decision graph. Each story includes acceptance criteria, decision table, scenarios, and views.",
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
server.addTool({
    name: "get_user_story",
    description: "Returns a single user story by name with full details — acceptance criteria, decision table, scenarios, and views.",
    parameters: z.object({
        projectDir: z.string().describe("Absolute path to the herbrand project directory"),
        name: z.string().describe("User story name (the intent decision spec name), e.g. 'create-order'"),
    }),
    execute: async (args) => {
        ensureWatching(args.projectDir);
        const story = store.userStories[args.name];
        if (!story)
            return "User story not found";
        return JSON.stringify(story, null, 2);
    },
});
server.start({
    transportType: "stdio",
});
