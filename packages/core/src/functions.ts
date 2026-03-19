import type {
  ParsedSpecs,
  DecisionGraph,
  LintResult,
  ParsedSpec,
  SpecInput,
  SpecUpdate,
} from "./types.js";

/// Pipeline functions

export type ParseSpecs = (projectDir: string) => ParsedSpecs

export type SpecLint = (parsed: ParsedSpecs) => LintResult[]

export type BuildDecisionGraph = (parsed: ParsedSpecs) => DecisionGraph

export type BehaviorLint = (graph: DecisionGraph) => LintResult[]

/// Agent-facing functions

export type CreateSpec = (projectDir: string, input: SpecInput) => ParsedSpec

export type UpdateSpec = (projectDir: string, update: SpecUpdate) => ParsedSpec

export type ReadSpec = (projectDir: string, name: string) => ParsedSpec | null

export type ListSpecs = (projectDir: string) => Array<{ name: string; type: string; description: string | null }>

export type ReadGraph = (projectDir: string) => DecisionGraph | null

export type RunPipeline = (projectDir: string) => {
  specLint: LintResult[]
  graph: DecisionGraph | null
  behaviorLint: LintResult[]
}

/// Placeholder implementations (to be filled from poc scripts)

export const parseSpecs: ParseSpecs = (_projectDir) => {
  throw new Error("Not implemented")
}

export const specLint: SpecLint = (_parsed) => {
  throw new Error("Not implemented")
}

export const buildDecisionGraph: BuildDecisionGraph = (_parsed) => {
  throw new Error("Not implemented")
}

export const behaviorLint: BehaviorLint = (_graph) => {
  throw new Error("Not implemented")
}

export const createSpec: CreateSpec = (_projectDir, _input) => {
  throw new Error("Not implemented")
}

export const updateSpec: UpdateSpec = (_projectDir, _update) => {
  throw new Error("Not implemented")
}

export const readSpec: ReadSpec = (_projectDir, _name) => {
  throw new Error("Not implemented")
}

export const listSpecs: ListSpecs = (_projectDir) => {
  throw new Error("Not implemented")
}

export const readGraph: ReadGraph = (_projectDir) => {
  throw new Error("Not implemented")
}

export const runPipeline: RunPipeline = (_projectDir) => {
  throw new Error("Not implemented")
}
