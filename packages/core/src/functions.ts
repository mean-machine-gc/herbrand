import type {
  SpecFile,
  ParsedSpecs,
  DecisionGraph,
  LintResult,
} from "./types.js";
import { parseSpecs as parseSpecsImpl } from "./parse-specs.js";
import { specLint as specLintImpl } from "./spec-lint.js";
import { buildDecisionGraph as buildDecisionGraphImpl } from "./build-graph.js";
import { behaviorLint as behaviorLintImpl } from "./behavior-lint.js";

/// Pipeline functions — pure data in, data out

export type ParseSpecs = (files: SpecFile[]) => ParsedSpecs

export type SpecLint = (parsed: ParsedSpecs) => LintResult[]

export type BuildDecisionGraph = (parsed: ParsedSpecs) => DecisionGraph

export type BehaviorLint = (graph: DecisionGraph) => LintResult[]

/// Implementations

export const parseSpecs: ParseSpecs = parseSpecsImpl

export const specLint: SpecLint = specLintImpl

export const buildDecisionGraph: BuildDecisionGraph = buildDecisionGraphImpl

export const behaviorLint: BehaviorLint = behaviorLintImpl
