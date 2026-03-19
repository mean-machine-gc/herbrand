import { parseSpecs as parseSpecsImpl } from "./parse-specs.js";
import { specLint as specLintImpl } from "./spec-lint.js";
import { buildDecisionGraph as buildDecisionGraphImpl } from "./build-graph.js";
import { behaviorLint as behaviorLintImpl } from "./behavior-lint.js";
/// Implementations
export const parseSpecs = parseSpecsImpl;
export const specLint = specLintImpl;
export const buildDecisionGraph = buildDecisionGraphImpl;
export const behaviorLint = behaviorLintImpl;
