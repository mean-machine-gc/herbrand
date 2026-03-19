import { FastMCP } from "fastmcp";
import { z } from "zod";
import {
  parseSpecs,
  specLint,
  buildDecisionGraph,
  behaviorLint,
  createSpec,
  updateSpec,
  readSpec,
  listSpecs,
  readGraph,
  runPipeline,
} from "@herbrand/core";
import type { SpecInput, SpecUpdate } from "@herbrand/core";

const server = new FastMCP({
  name: "Herbrand",
  version: "0.1.0",
});

// Shared zod schemas

const infoEntrySchema = z.object({
  description: z.string(),
  requiredInfo: z.array(z.string()),
  scenarios: z.array(z.string()).optional(),
});

const successEntrySchema = z.object({
  condition: z.string(),
  description: z.string(),
  requiredInfo: z.array(z.string()),
  scenarios: z.array(z.string()).optional(),
});

const assertionEntrySchema = z.object({
  tag: z.string(),
  description: z.string(),
  affectedInfo: z.array(z.string()),
});

const projectDirParam = z.object({
  projectDir: z.string().describe("Absolute path to the herbrand project directory"),
});

/// Pipeline tools

server.addTool({
  name: "parse_specs",
  description: "Parse all spec files in the project into structured JSON",
  parameters: projectDirParam,
  execute: async (args) => {
    const result = parseSpecs(args.projectDir);
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: "spec_lint",
  description: "Lint individual specs for completeness — missing descriptions, scenarios, info, context/module/aggregate. Returns errors and warnings.",
  parameters: projectDirParam,
  execute: async (args) => {
    const parsed = parseSpecs(args.projectDir);
    const results = specLint(parsed);
    return JSON.stringify(results, null, 2);
  },
});

server.addTool({
  name: "build_decision_graph",
  description: "Build the decision graph from parsed specs. The graph is the canonical derived model — all behavioral analysis operates on it.",
  parameters: projectDirParam,
  execute: async (args) => {
    const parsed = parseSpecs(args.projectDir);
    const graph = buildDecisionGraph(parsed);
    return JSON.stringify(graph, null, 2);
  },
});

server.addTool({
  name: "behavior_lint",
  description: "Lint the decision graph for behavioral coherence — orphans, dead ends, info flow gaps, unhandled rejections, boundary issues.",
  parameters: projectDirParam,
  execute: async (args) => {
    const parsed = parseSpecs(args.projectDir);
    const graph = buildDecisionGraph(parsed);
    const results = behaviorLint(graph);
    return JSON.stringify(results, null, 2);
  },
});

/// Agent-facing tools

server.addTool({
  name: "create_spec",
  description: "Create a new decision spec file. Used during discover-decision to formalize a new decision from conversation.",
  parameters: z.object({
    projectDir: z.string().describe("Absolute path to the herbrand project directory"),
    name: z.string().describe("Spec name in kebab-case, e.g. 'create-order'"),
    type: z.enum(["intent", "outcome"]).describe("Decision type"),
    trigger: z.string().describe("What triggers this decision — an outcome, rejection, or intent"),
    triggerType: z.enum(["success", "reject", "intent"]).describe("Type of trigger"),
    role: z.string().optional().describe("Agent role for intent decisions, e.g. 'customer'"),
    context: z.string().optional().describe("Bounded context"),
    module: z.string().optional().describe("Module"),
    aggregate: z.string().optional().describe("Aggregate"),
    businessGoal: z.string().optional().describe("Business goal for intent decisions"),
    description: z.string().optional().describe("Decision description"),
    preconditions: z.record(z.string(), infoEntrySchema).optional().describe("Preconditions for intent decisions"),
    producesIntent: z.object({
      intent: z.string(),
      description: z.string(),
      requiredInfo: z.array(z.string()),
    }).optional().describe("The intent produced by an intent decision"),
    shouldFailWith: z.record(z.string(), infoEntrySchema).optional().describe("Failure constraints for outcome decisions"),
    shouldSucceedWith: z.record(z.string(), successEntrySchema).optional().describe("Success outcomes for outcome decisions"),
    shouldAssert: z.record(z.string(), z.array(assertionEntrySchema)).optional().describe("Assertions for outcome decisions"),
  }),
  execute: async (args) => {
    const { projectDir, ...specData } = args;
    const result = createSpec(projectDir, specData as SpecInput);
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: "update_spec",
  description: "Update an existing decision spec. Used during refine-decision to add rejects, scenarios, info, or correct descriptions.",
  parameters: z.object({
    projectDir: z.string().describe("Absolute path to the herbrand project directory"),
    name: z.string().describe("Spec name to update, e.g. 'create-order'"),
    changes: z.object({
      description: z.string().optional(),
      businessGoal: z.string().optional(),
      context: z.string().optional(),
      module: z.string().optional(),
      aggregate: z.string().optional(),
      role: z.string().optional(),
      preconditions: z.record(z.string(), infoEntrySchema).optional(),
      producesIntent: z.object({
        intent: z.string(),
        description: z.string(),
        requiredInfo: z.array(z.string()),
      }).optional(),
      shouldFailWith: z.record(z.string(), infoEntrySchema).optional(),
      shouldSucceedWith: z.record(z.string(), successEntrySchema).optional(),
      shouldAssert: z.record(z.string(), z.array(assertionEntrySchema)).optional(),
    }).describe("Partial changes to apply to the spec"),
  }),
  execute: async (args) => {
    const result = updateSpec(args.projectDir, {
      name: args.name,
      changes: args.changes as SpecUpdate["changes"],
    });
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: "read_spec",
  description: "Read and return a single parsed decision spec by name.",
  parameters: z.object({
    projectDir: z.string().describe("Absolute path to the herbrand project directory"),
    name: z.string().describe("Spec name, e.g. 'create-order'"),
  }),
  execute: async (args) => {
    const result = readSpec(args.projectDir, args.name);
    if (!result) return "Spec not found";
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: "list_specs",
  description: "List all available decision specs with name, type, and description.",
  parameters: projectDirParam,
  execute: async (args) => {
    const result = listSpecs(args.projectDir);
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: "read_graph",
  description: "Return the full decision graph JSON — nodes, edges, and specs.",
  parameters: projectDirParam,
  execute: async (args) => {
    const result = readGraph(args.projectDir);
    if (!result) return "No decision graph available. Run build_decision_graph first.";
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: "run_pipeline",
  description: "Run the full herbrand pipeline: parse specs → spec-lint → build graph → behavior-lint. Returns lint results from both loops.",
  parameters: projectDirParam,
  execute: async (args) => {
    const result = runPipeline(args.projectDir);
    return JSON.stringify(result, null, 2);
  },
});

server.start({
  transportType: "stdio",
});
