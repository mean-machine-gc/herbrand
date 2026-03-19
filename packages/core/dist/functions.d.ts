import type { ParsedSpecs, DecisionGraph, LintResult, ParsedSpec, SpecInput, SpecUpdate } from "./types.js";
export type ParseSpecs = (projectDir: string) => ParsedSpecs;
export type SpecLint = (parsed: ParsedSpecs) => LintResult[];
export type BuildDecisionGraph = (parsed: ParsedSpecs) => DecisionGraph;
export type BehaviorLint = (graph: DecisionGraph) => LintResult[];
export type CreateSpec = (projectDir: string, input: SpecInput) => ParsedSpec;
export type UpdateSpec = (projectDir: string, update: SpecUpdate) => ParsedSpec;
export type ReadSpec = (projectDir: string, name: string) => ParsedSpec | null;
export type ListSpecs = (projectDir: string) => Array<{
    name: string;
    type: string;
    description: string | null;
}>;
export type ReadGraph = (projectDir: string) => DecisionGraph | null;
export type RunPipeline = (projectDir: string) => {
    specLint: LintResult[];
    graph: DecisionGraph | null;
    behaviorLint: LintResult[];
};
export declare const parseSpecs: ParseSpecs;
export declare const specLint: SpecLint;
export declare const buildDecisionGraph: BuildDecisionGraph;
export declare const behaviorLint: BehaviorLint;
export declare const createSpec: CreateSpec;
export declare const updateSpec: UpdateSpec;
export declare const readSpec: ReadSpec;
export declare const listSpecs: ListSpecs;
export declare const readGraph: ReadGraph;
export declare const runPipeline: RunPipeline;
