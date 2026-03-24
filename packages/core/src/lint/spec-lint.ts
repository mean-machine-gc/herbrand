/**
 * Spec-level lint checks — pure functions, single decision in isolation.
 *
 * Each function takes a single Policy or Operation and returns violations.
 * No system context needed.
 */

import type { Policy, Operation } from '../index.js';
import type { LintViolation } from './lint-types.js';

// ── Helpers ─────────────────────────────────────────────────

function isPolicy(d: Policy | Operation): d is Policy {
  return 'emits' in d;
}

function isOperation(d: Policy | Operation): d is Operation {
  return 'unconditionalOutcome' in d;
}

// ── Identity & structure ────────────────────────────────────

export function checkDecisionHasDescription(decision: Policy | Operation): LintViolation[] {
  if (!decision.description || decision.description.trim() === '') {
    return [{ ruleId: 'spec/decision-has-description', level: 'warning', target: decision.id,
      message: 'missing description' }];
  }
  return [];
}

export function checkDecisionHasContext(decision: Policy | Operation): LintViolation[] {
  if (!decision.context || decision.context.trim() === '') {
    return [{ ruleId: 'spec/decision-has-context', level: 'error', target: decision.id,
      message: 'missing execution context reference' }];
  }
  return [];
}

// ── Policy-specific ─────────────────────────────────────────

export function checkPolicyHasActivation(decision: Policy | Operation): LintViolation[] {
  if (!isPolicy(decision)) return [];
  if (decision.activatedBy.length === 0) {
    return [{ ruleId: 'spec/policy-has-activation', level: 'error', target: decision.id,
      message: 'not activated by any outcome — will never fire' }];
  }
  return [];
}

export function checkPolicyHasEmits(decision: Policy | Operation): LintViolation[] {
  if (!isPolicy(decision)) return [];
  if (!decision.emits || decision.emits.trim() === '') {
    return [{ ruleId: 'spec/policy-has-emits', level: 'error', target: decision.id,
      message: 'does not declare what intent it emits' }];
  }
  return [];
}

export function checkPolicyHasPreconditions(decision: Policy | Operation): LintViolation[] {
  if (!isPolicy(decision)) return [];
  if (decision.preconditions.length === 0) {
    return [{ ruleId: 'spec/policy-has-preconditions', level: 'info', target: decision.id,
      message: 'has no preconditions — will always fire when activated' }];
  }
  return [];
}

export function checkPreconditionHasReads(decision: Policy | Operation): LintViolation[] {
  if (!isPolicy(decision)) return [];
  const violations: LintViolation[] = [];
  for (const pre of decision.preconditions) {
    if (pre.reads.length === 0) {
      violations.push({ ruleId: 'spec/precondition-has-reads', level: 'warning', target: decision.id,
        message: `precondition "${pre.id}" does not declare any info points it reads` });
    }
  }
  return violations;
}

export function checkPreconditionHasDescription(decision: Policy | Operation): LintViolation[] {
  if (!isPolicy(decision)) return [];
  const violations: LintViolation[] = [];
  for (const pre of decision.preconditions) {
    if (!pre.description || pre.description.trim() === '') {
      violations.push({ ruleId: 'spec/precondition-has-description', level: 'warning', target: decision.id,
        message: `precondition "${pre.id}" is missing a description` });
    }
  }
  return violations;
}

// ── Operation-specific ──────────────────────────────────────

export function checkOperationHasActivation(decision: Policy | Operation): LintViolation[] {
  if (!isOperation(decision)) return [];
  if (decision.activatedBy.length === 0) {
    return [{ ruleId: 'spec/operation-has-activation', level: 'error', target: decision.id,
      message: 'not activated by any intent — will never execute' }];
  }
  return [];
}

export function checkOperationHasUnconditionalOutcome(decision: Policy | Operation): LintViolation[] {
  if (!isOperation(decision)) return [];
  if (!decision.unconditionalOutcome || !decision.unconditionalOutcome.kind || decision.unconditionalOutcome.kind.trim() === '') {
    return [{ ruleId: 'spec/operation-has-unconditional-outcome', level: 'error', target: decision.id,
      message: 'missing unconditional outcome' }];
  }
  return [];
}

export function checkOperationHasConstraints(decision: Policy | Operation): LintViolation[] {
  if (!isOperation(decision)) return [];
  if (decision.constraints.length === 0) {
    return [{ ruleId: 'spec/operation-has-constraints', level: 'info', target: decision.id,
      message: 'has no constraints — will always succeed when activated' }];
  }
  return [];
}

export function checkConstraintHasReads(decision: Policy | Operation): LintViolation[] {
  if (!isOperation(decision)) return [];
  const violations: LintViolation[] = [];
  for (const c of decision.constraints) {
    if (c.reads.length === 0) {
      violations.push({ ruleId: 'spec/constraint-has-reads', level: 'warning', target: decision.id,
        message: `constraint "${c.id}" does not declare any info points it reads` });
    }
  }
  return violations;
}

export function checkConditionalOutcomeHasConditionReads(decision: Policy | Operation): LintViolation[] {
  if (!isOperation(decision)) return [];
  const violations: LintViolation[] = [];
  for (const co of decision.conditionalOutcomes) {
    if (co.condition.reads.length === 0) {
      violations.push({ ruleId: 'spec/conditional-outcome-has-condition-reads', level: 'warning', target: decision.id,
        message: `conditional outcome "${co.outcome.kind}" condition does not declare any info points it reads` });
    }
  }
  return violations;
}

export function checkOutcomeHasDescription(decision: Policy | Operation): LintViolation[] {
  if (!isOperation(decision)) return [];
  const violations: LintViolation[] = [];
  if (!decision.unconditionalOutcome.description || decision.unconditionalOutcome.description.trim() === '') {
    violations.push({ ruleId: 'spec/outcome-has-description', level: 'warning', target: decision.id,
      message: `unconditional outcome "${decision.unconditionalOutcome.kind}" is missing a description` });
  }
  for (const co of decision.conditionalOutcomes) {
    if (!co.outcome.description || co.outcome.description.trim() === '') {
      violations.push({ ruleId: 'spec/outcome-has-description', level: 'warning', target: decision.id,
        message: `conditional outcome "${co.outcome.kind}" is missing a description` });
    }
  }
  return violations;
}
