import type { SpecFile, ParsedSpecs, DecisionGraph, LintResult } from "./types.js";
export type ParseSpecs = (files: SpecFile[]) => ParsedSpecs;
export type SpecLint = (parsed: ParsedSpecs) => LintResult[];
export type BuildDecisionGraph = (parsed: ParsedSpecs) => DecisionGraph;
export type BehaviorLint = (graph: DecisionGraph) => LintResult[];
export declare const parseSpecs: ParseSpecs;
export declare const specLint: SpecLint;
export declare const buildDecisionGraph: BuildDecisionGraph;
export declare const behaviorLint: BehaviorLint;
