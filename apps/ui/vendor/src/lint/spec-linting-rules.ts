/**
 * Spec-level lint rules — single decision in isolation.
 *
 * Every rule here can be evaluated with ONLY the decision itself,
 * no system-wide context needed.
 */

import type { SpecLintRule } from './lint-types.js';
import {
  checkDecisionHasDescription,
  checkDecisionHasContext,
  checkPolicyHasActivation,
  checkPolicyHasEmits,
  checkPolicyHasPreconditions,
  checkPreconditionHasReads,
  checkPreconditionHasDescription,
  checkOperationHasActivation,
  checkOperationHasUnconditionalOutcome,
  checkOperationHasConstraints,
  checkConstraintHasReads,
  checkConditionalOutcomeHasConditionReads,
  checkOutcomeHasDescription,
} from './spec-lint.js';

export const specLintRules: Record<string, SpecLintRule> = {

  // ── Identity & structure ──────────────────────────────────

  'spec/decision-has-description': {
    id: 'spec/decision-has-description',
    description: 'Every decision should have a non-empty description',
    level: 'warning',
    applies: 'decision',
    check: checkDecisionHasDescription,
  },

  'spec/decision-has-context': {
    id: 'spec/decision-has-context',
    description: 'Every decision must reference an execution context',
    level: 'error',
    applies: 'decision',
    check: checkDecisionHasContext,
  },

  // ── Policy-specific ───────────────────────────────────────

  'spec/policy-has-activation': {
    id: 'spec/policy-has-activation',
    description: 'A policy must be activated by at least one outcome kind',
    level: 'error',
    applies: 'policy',
    check: checkPolicyHasActivation,
  },

  'spec/policy-has-emits': {
    id: 'spec/policy-has-emits',
    description: 'A policy must declare what intent it emits',
    level: 'error',
    applies: 'policy',
    check: checkPolicyHasEmits,
  },

  'spec/policy-has-preconditions': {
    id: 'spec/policy-has-preconditions',
    description: 'A policy with no preconditions always fires — is this intentional?',
    level: 'info',
    applies: 'policy',
    check: checkPolicyHasPreconditions,
  },

  'spec/precondition-has-reads': {
    id: 'spec/precondition-has-reads',
    description: 'Every precondition should declare at least one info point it reads',
    level: 'warning',
    applies: 'policy',
    check: checkPreconditionHasReads,
  },

  'spec/precondition-has-description': {
    id: 'spec/precondition-has-description',
    description: 'Every precondition should have a non-empty description',
    level: 'warning',
    applies: 'policy',
    check: checkPreconditionHasDescription,
  },

  // ── Operation-specific ────────────────────────────────────

  'spec/operation-has-activation': {
    id: 'spec/operation-has-activation',
    description: 'An operation must be activated by at least one intent kind',
    level: 'error',
    applies: 'operation',
    check: checkOperationHasActivation,
  },

  'spec/operation-has-unconditional-outcome': {
    id: 'spec/operation-has-unconditional-outcome',
    description: 'Every operation must define an unconditional outcome',
    level: 'error',
    applies: 'operation',
    check: checkOperationHasUnconditionalOutcome,
  },

  'spec/operation-has-constraints': {
    id: 'spec/operation-has-constraints',
    description: 'An operation with no constraints always succeeds — is this intentional?',
    level: 'info',
    applies: 'operation',
    check: checkOperationHasConstraints,
  },

  'spec/constraint-has-reads': {
    id: 'spec/constraint-has-reads',
    description: 'Every constraint should declare at least one info point it reads',
    level: 'warning',
    applies: 'operation',
    check: checkConstraintHasReads,
  },

  'spec/conditional-outcome-has-condition-reads': {
    id: 'spec/conditional-outcome-has-condition-reads',
    description: 'Every conditional outcome condition should declare what info it reads',
    level: 'warning',
    applies: 'operation',
    check: checkConditionalOutcomeHasConditionReads,
  },

  'spec/outcome-has-description': {
    id: 'spec/outcome-has-description',
    description: 'Every outcome spec should have a non-empty description',
    level: 'warning',
    applies: 'operation',
    check: checkOutcomeHasDescription,
  },
};
