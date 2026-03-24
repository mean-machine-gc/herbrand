/**
 * Shared lint types used across all lint scopes.
 */

import type { Policy, Operation, System } from './index.js';
import type { DecisionGraph } from './graph.js';

export type LintLevel = 'info' | 'warning' | 'error';

export type LintViolation = {
  readonly ruleId: string;
  readonly level: LintLevel;
  readonly target: string;
  readonly message: string;
};

/** Spec-level: checks a single decision in isolation */
export type SpecLintRule = {
  readonly id: string;
  readonly description: string;
  readonly level: LintLevel;
  readonly applies: 'policy' | 'operation' | 'decision';
  check(decision: Policy | Operation): LintViolation[];
};

/** System-level: checks cross-decision consistency */
export type SystemLintRule = {
  readonly id: string;
  readonly description: string;
  readonly level: LintLevel;
  check(system: System): LintViolation[];
};

/** Graph-level: checks topology, flow, and structural properties */
export type GraphLintRule = {
  readonly id: string;
  readonly description: string;
  readonly level: LintLevel;
  check(graph: DecisionGraph, system: System): LintViolation[];
};
