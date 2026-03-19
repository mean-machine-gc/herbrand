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
    name: "get_decision_graph",
    description: "Returns the current decision graph from the reactive store. The graph is built automatically when specs change and spec-lint passes.",
    parameters: projectDirParam,
    execute: async (args) => {
        ensureWatching(args.projectDir);
        const graph = store.decisionGraph;
        if (!graph)
            return "Cannot build graph: spec-lint has errors. Fix specs first.";
        return JSON.stringify(graph, null, 2);
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
    name: "get_graph",
    description: "Returns the full decision graph from the reactive store — nodes, edges, and specs.",
    parameters: projectDirParam,
    execute: async (args) => {
        ensureWatching(args.projectDir);
        const graph = store.decisionGraph;
        if (!graph)
            return "No decision graph available. Spec-lint may have errors.";
        return JSON.stringify(graph, null, 2);
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
server.start({
    transportType: "stdio",
});
