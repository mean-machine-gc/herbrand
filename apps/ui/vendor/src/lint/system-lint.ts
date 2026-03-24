/**
 * System-level lint checks — pure functions, graph-blocking validation.
 *
 * If any of these fail, the graph should not be built.
 */

import type { Policy, Operation, System } from '../index.js';
import type { LintViolation } from './lint-types.js';

export function checkUniqueDecisionIds(system: System): LintViolation[] {
  const seen = new Map<string, string>();
  const violations: LintViolation[] = [];

  for (const p of system.policies) {
    if (seen.has(p.id)) {
      violations.push({ ruleId: 'system/unique-decision-ids', level: 'error', target: p.id,
        message: `duplicate decision ID — also used by ${seen.get(p.id)}` });
    }
    seen.set(p.id, 'policy');
  }
  for (const op of system.operations) {
    if (seen.has(op.id)) {
      violations.push({ ruleId: 'system/unique-decision-ids', level: 'error', target: op.id,
        message: `duplicate decision ID — also used by ${seen.get(op.id)}` });
    }
    seen.set(op.id, 'operation');
  }

  return violations;
}

export function checkUniqueContextIds(system: System): LintViolation[] {
  const seen = new Set<string>();
  const violations: LintViolation[] = [];

  for (const ctx of system.contexts) {
    if (seen.has(ctx.id)) {
      violations.push({ ruleId: 'system/unique-context-ids', level: 'error', target: ctx.id,
        message: 'duplicate execution context ID' });
    }
    seen.add(ctx.id);
  }

  return violations;
}

export function checkUniqueActorIds(system: System): LintViolation[] {
  const seen = new Set<string>();
  const violations: LintViolation[] = [];

  for (const actor of system.actors) {
    if (seen.has(actor.id)) {
      violations.push({ ruleId: 'system/unique-actor-ids', level: 'error', target: actor.id,
        message: 'duplicate actor ID' });
    }
    seen.add(actor.id);
  }

  return violations;
}

export function checkContextExists(system: System): LintViolation[] {
  const contextIds = new Set(system.contexts.map(c => c.id));
  const violations: LintViolation[] = [];
  const decisions: (Policy | Operation)[] = [...system.policies, ...system.operations];

  for (const d of decisions) {
    if (!contextIds.has(d.context)) {
      violations.push({ ruleId: 'system/context-exists', level: 'error', target: d.id,
        message: `references unknown execution context "${d.context}"` });
    }
  }

  return violations;
}

export function checkContextActorCompatibility(system: System): LintViolation[] {
  const contextMap = new Map(system.contexts.map(c => [c.id, c]));
  const actorMap = new Map(system.actors.map(a => [a.id, a]));
  const violations: LintViolation[] = [];
  const decisions: (Policy | Operation)[] = [...system.policies, ...system.operations];

  for (const d of decisions) {
    if (!d.actor) continue;
    const ctx = contextMap.get(d.context);
    const actor = actorMap.get(d.actor);
    if (!ctx || !actor) continue; // handled by other rules

    if (ctx.type === 'institutional' && actor.type !== 'human') {
      violations.push({ ruleId: 'system/context-actor-compatibility', level: 'error', target: d.id,
        message: `institutional context "${ctx.id}" requires human actor, got ${actor.type} "${actor.id}"` });
    }
    if (ctx.type === 'software' && actor.type === 'human') {
      violations.push({ ruleId: 'system/context-actor-compatibility', level: 'error', target: d.id,
        message: `software context "${ctx.id}" requires llm/machine actor, got human "${actor.id}"` });
    }
  }

  return violations;
}
