/**
 * policies-poc — Herbrand core model exploration
 *
 * Two decision types, three streams, one reactive loop.
 * Views and info units are INFERRED from decision procedures, not declared upfront.
 *
 * Authored types are defined via Zod schemas in schemas.ts.
 * Derived types and functions live here.
 */

// Re-export all authored types from schemas (Zod is the source of truth)
export type {
  InfoEffect,
  Precondition, Constraint,
  Policy, Operation,
  OutcomeSpec, ConditionalOutcomeSpec,
  ExecutionContext, SoftwareContext, InstitutionalContext,
  Actor, HumanActor, LlmActor, MachineActor,
  ProcessDefinition,
  SystemSpec,
} from './schemas.js';

// Re-export schemas for validation
export {
  PolicySchema, OperationSchema, DecisionSchema,
  ExecutionContextSchema, ActorSchema,
  ProcessDefinitionSchema, SystemFileSchema, SystemSpecSchema,
} from './schemas.js';

import type { Policy, Operation, SystemSpec } from './schemas.js';

// ============================================================
// Derived types — not authored, computed by the framework
// ============================================================

type InfoPoint = {
  readonly name: string;
  readonly description: string;
};

type InfoValue = {
  readonly point: string;
  readonly value: unknown;
};

type Intent = {
  readonly id: string;
  readonly kind: string;
  readonly payload: Record<string, unknown>;
  readonly triggeredBy?: string;
};

type Outcome = {
  readonly id: string;
  readonly kind: string;
  readonly payload: Record<string, unknown>;
  readonly resolves: string;
  readonly effects: { point: string; description: string }[];
};

type ConstraintViolation = {
  readonly constraintId: string;
  readonly description: string;
};

type DerivedView = {
  readonly policyId: string;
  readonly infoPoints: string[];
};

type IntegrationPoint = {
  readonly from: { decisionId: string; contextId: string };
  readonly to: { decisionId: string; contextId: string };
  readonly via: string;
};

type System = {
  // Authored:
  readonly contexts: SystemSpec['contexts'];
  readonly policies: Policy[];
  readonly operations: Operation[];
  readonly actors: SystemSpec['actors'];
  readonly processes: SystemSpec['processes'] & {};
  // Derived:
  readonly infoPoints: InfoPoint[];
  readonly views: DerivedView[];
  readonly integrationPoints: IntegrationPoint[];
  // Runtime state:
  readonly intentStream: Intent[];
  readonly outcomeStream: Outcome[];
  readonly infoUniverse: InfoValue[];
};

// ============================================================
// Derived functions
// ============================================================

function deriveView(policy: Policy): DerivedView {
  const points = new Set<string>();
  for (const pre of policy.preconditions) {
    for (const r of pre.reads) points.add(r);
  }
  return { policyId: policy.id, infoPoints: [...points] };
}

function discoverInfoPoints(policies: Policy[], operations: Operation[]): InfoPoint[] {
  const points = new Map<string, string>();

  for (const p of policies) {
    for (const pre of p.preconditions) {
      for (const r of pre.reads) {
        if (!points.has(r)) points.set(r, `Read by precondition "${pre.id}" of policy "${p.id}"`);
      }
    }
  }

  for (const op of operations) {
    for (const c of op.constraints) {
      for (const r of c.reads) {
        if (!points.has(r)) points.set(r, `Read by constraint "${c.id}" of operation "${op.id}"`);
      }
    }
    for (const e of op.unconditionalOutcome.effects) {
      if (!points.has(e.point)) points.set(e.point, `Produced by outcome "${op.unconditionalOutcome.kind}" of operation "${op.id}"`);
    }
    for (const co of op.conditionalOutcomes) {
      for (const r of co.condition.reads) {
        if (!points.has(r)) points.set(r, `Read by condition of conditional outcome in operation "${op.id}"`);
      }
      for (const e of co.outcome.effects) {
        if (!points.has(e.point)) points.set(e.point, `Produced by conditional outcome "${co.outcome.kind}" of operation "${op.id}"`);
      }
    }
  }

  return [...points.entries()].map(([name, description]) => ({ name, description }));
}

function discoverIntegrationPoints(policies: Policy[], operations: Operation[]): IntegrationPoint[] {
  const points: IntegrationPoint[] = [];

  for (const policy of policies) {
    const consumers = operations.filter(op => op.activatedBy.includes(policy.emits));
    for (const op of consumers) {
      if (policy.context !== op.context) {
        points.push({
          from: { decisionId: policy.id, contextId: policy.context },
          to: { decisionId: op.id, contextId: op.context },
          via: policy.emits,
        });
      }
    }
  }

  for (const op of operations) {
    const allOutcomeKinds = [
      op.unconditionalOutcome.kind,
      ...op.conditionalOutcomes.map(co => co.outcome.kind),
    ];
    for (const outcomeKind of allOutcomeKinds) {
      const listeners = policies.filter(p => p.activatedBy.includes(outcomeKind));
      for (const p of listeners) {
        if (op.context !== p.context) {
          points.push({
            from: { decisionId: op.id, contextId: op.context },
            to: { decisionId: p.id, contextId: p.context },
            via: outcomeKind,
          });
        }
      }
    }
  }

  return points;
}

function buildSystem(spec: SystemSpec): System {
  const infoPoints = discoverInfoPoints(spec.policies, spec.operations);
  const views = spec.policies.map(deriveView);
  const integrationPoints = discoverIntegrationPoints(spec.policies, spec.operations);

  return {
    ...spec,
    processes: spec.processes ?? [],
    infoPoints,
    views,
    integrationPoints,
    intentStream: [],
    outcomeStream: [],
    infoUniverse: [],
  };
}

function deriveActorResponsibilities(system: System) {
  return system.actors.map(actor => {
    const policies = system.policies.filter(p => p.actor === actor.id);
    const operations = system.operations.filter(o => o.actor === actor.id);

    const reads = new Set<string>();
    for (const p of policies) {
      for (const pre of p.preconditions) {
        for (const r of pre.reads) reads.add(r);
      }
    }
    for (const op of operations) {
      for (const c of op.constraints) {
        for (const r of c.reads) reads.add(r);
      }
    }

    return {
      actor,
      policies: policies.map(p => p.id),
      operations: operations.map(o => o.id),
      reads: [...reads],
    };
  });
}

export type {
  InfoPoint, InfoValue,
  Intent, Outcome, ConstraintViolation,
  IntegrationPoint,
  DerivedView, System,
};

export { deriveView, discoverInfoPoints, discoverIntegrationPoints, buildSystem, deriveActorResponsibilities };
