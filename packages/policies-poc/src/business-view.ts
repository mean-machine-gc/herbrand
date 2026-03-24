/**
 * Business View — derives user stories and automation rules from the graph.
 *
 * A user story / automation is derived from each Policy→Operation pair
 * connected via an intent signal.
 *
 * User Story (human actor):
 *   "As a [role], I want to [intent] so that [business goal]"
 *
 * Automation (machine/llm actor):
 *   "When [trigger outcome], [actor] at [context] [intent] so that [business goal]"
 */

import type { System, Policy, Operation } from './index.js';
import type {
  DecisionGraph, PolicyNode, OperationNode, ViewNode,
} from './graph.js';

// ============================================================
// Types
// ============================================================

export type Precondition = {
  readonly id: string;
  readonly description: string;
  readonly reads: string[];
};

export type Constraint = {
  readonly id: string;
  readonly description: string;
  readonly reads: string[];
};

export type OutcomeResult = {
  readonly kind: string;
  readonly description: string;
  readonly conditional: boolean;
  readonly conditionDescription?: string;
  readonly effects: { point: string; description: string }[];
};

export type AcceptanceCriteria = {
  readonly trigger: string;
  readonly given: Precondition[];
  readonly when: string;
  readonly then: OutcomeResult[];
  readonly shouldFailIf: Constraint[];
};

export type DecisionTableRow = {
  readonly type: 'success' | 'failure' | 'skipped';
  readonly description: string;
  readonly preconditions: Record<string, boolean>;
  readonly constraints: Record<string, boolean>;
  readonly conditions: Record<string, boolean | null>;  // null = N/A
  readonly outcome: string | null;
  readonly effects: string[];
};

export type DecisionTable = {
  readonly preconditionColumns: string[];
  readonly constraintColumns: string[];
  readonly conditionColumns: { id: string; description: string }[];
  readonly rows: DecisionTableRow[];
};

export type BusinessViewItem = {
  readonly type: 'user-story' | 'automation';
  readonly formula: string;
  readonly policyId: string;
  readonly operationId: string | null;
  readonly role: string | null;
  readonly actorId: string;
  readonly actorType: 'human' | 'llm' | 'machine';
  readonly context: string;
  readonly businessGoal: string | null;
  readonly processes: string[];
  readonly acceptanceCriteria: AcceptanceCriteria;
  readonly decisionTable: DecisionTable;
  readonly view: { infoPoints: string[] } | null;
};

// ============================================================
// Derivation
// ============================================================

export function deriveBusinessView(graph: DecisionGraph, system: System): BusinessViewItem[] {
  const items: BusinessViewItem[] = [];

  // Find all policy nodes
  const policyNodes = graph.nodes.filter((n): n is PolicyNode => n.type === 'policy');

  for (const policyNode of policyNodes) {
    const policy = policyNode.spec;

    // Find the actor for this policy
    if (!policy.actor) continue;
    const actor = system.actors.find(a => a.id === policy.actor);
    if (!actor) continue;

    const actorType = actor.type;
    const actorLabel = actor.type === 'human' ? actor.role : actor.description;
    const context = system.contexts.find(c => c.id === policy.context);
    const contextLabel = context?.description ?? policy.context;

    // Find the connected operation (via intent signal)
    const operation = findLinkedOperation(graph, policy);

    // Find the view that informs this policy
    const viewNode = graph.nodes.find(
      (n): n is ViewNode => n.type === 'view' && n.decisionId === policy.id
    );

    // Build formula
    const type: 'user-story' | 'automation' = actorType === 'human' ? 'user-story' : 'automation';
    const formula = type === 'user-story'
      ? buildUserStoryFormula(actor.type === 'human' ? actor.role : actorLabel, policy)
      : buildAutomationFormula(actorLabel, contextLabel, policy);

    // Build acceptance criteria
    const acceptanceCriteria = buildAcceptanceCriteria(policy, operation);

    // Build decision table
    const decisionTable = buildDecisionTable(policy, operation);

    items.push({
      type,
      formula,
      policyId: policy.id,
      operationId: operation?.id ?? null,
      role: actor.type === 'human' ? actor.role : null,
      actorId: actor.id,
      actorType,
      context: policy.context,
      businessGoal: policy.businessGoal ?? null,
      processes: policy.processes ?? [],
      acceptanceCriteria,
      decisionTable,
      view: viewNode ? { infoPoints: viewNode.infoPoints } : null,
    });
  }

  return items;
}

// ── Formula builders ────────────────────────────────────────

function buildUserStoryFormula(role: string, policy: Policy): string {
  const goal = policy.businessGoal
    ? ` so that ${policy.businessGoal}`
    : '';
  return `As a ${role}, I want to ${policy.emits.replace(/\./g, ' ')}${goal}`;
}

function buildAutomationFormula(actorLabel: string, contextLabel: string, policy: Policy): string {
  const trigger = policy.activatedBy[0] ?? 'unknown';
  const goal = policy.businessGoal
    ? ` so that ${policy.businessGoal}`
    : '';
  return `When ${trigger.replace(/\./g, ' ')}, ${actorLabel} at ${contextLabel} ${policy.emits.replace(/\./g, ' ')}${goal}`;
}

// ── Acceptance criteria ─────────────────────────────────────

function buildAcceptanceCriteria(policy: Policy, operation: Operation | null): AcceptanceCriteria {
  const trigger = policy.activatedBy[0] ?? 'unknown';

  const given: Precondition[] = policy.preconditions.map(p => ({
    id: p.id,
    description: p.description,
    reads: p.reads,
  }));

  const when = policy.emits;

  const then: OutcomeResult[] = [];
  const shouldFailIf: Constraint[] = [];

  if (operation) {
    // Unconditional outcome
    then.push({
      kind: operation.unconditionalOutcome.kind,
      description: operation.unconditionalOutcome.description,
      conditional: false,
      effects: operation.unconditionalOutcome.effects,
    });

    // Conditional outcomes
    for (const co of operation.conditionalOutcomes) {
      then.push({
        kind: co.outcome.kind,
        description: co.outcome.description,
        conditional: true,
        conditionDescription: co.condition.description,
        effects: co.outcome.effects,
      });
    }

    // Constraints → should fail if
    for (const c of operation.constraints) {
      shouldFailIf.push({
        id: c.id,
        description: c.description,
        reads: c.reads,
      });
    }
  }

  return { trigger, given, when, then, shouldFailIf };
}

// ── Decision table ──────────────────────────────────────────

function buildDecisionTable(policy: Policy, operation: Operation | null): DecisionTable {
  const preconditionColumns = policy.preconditions.map(p => p.id);
  const constraintColumns = operation?.constraints.map(c => c.id) ?? [];
  const conditionColumns = (operation?.conditionalOutcomes ?? []).map(co => ({
    id: co.outcome.kind,
    description: co.condition.description,
  }));
  const rows: DecisionTableRow[] = [];

  if (operation) {
    // Unconditional success row
    {
      const preconditions: Record<string, boolean> = {};
      for (const p of preconditionColumns) preconditions[p] = true;
      const constraints: Record<string, boolean> = {};
      for (const c of constraintColumns) constraints[c] = true;
      const conditions: Record<string, boolean | null> = {};
      for (const co of conditionColumns) conditions[co.id] = false; // unconditional = conditions don't matter

      rows.push({
        type: 'success',
        description: operation.unconditionalOutcome.kind,
        preconditions, constraints, conditions,
        outcome: operation.unconditionalOutcome.kind,
        effects: operation.unconditionalOutcome.effects.map(e => `${e.point}: ${e.description}`),
      });
    }

    // Conditional success rows — one per conditional outcome
    for (const co of operation.conditionalOutcomes) {
      const preconditions: Record<string, boolean> = {};
      for (const p of preconditionColumns) preconditions[p] = true;
      const constraints: Record<string, boolean> = {};
      for (const c of constraintColumns) constraints[c] = true;
      const conditions: Record<string, boolean | null> = {};
      for (const col of conditionColumns) conditions[col.id] = col.id === co.outcome.kind;

      rows.push({
        type: 'success',
        description: `${co.condition.description} → ${co.outcome.kind}`,
        preconditions, constraints, conditions,
        outcome: co.outcome.kind,
        effects: co.outcome.effects.map(e => `${e.point}: ${e.description}`),
      });
    }

    // Failure rows — one per constraint
    for (let i = 0; i < constraintColumns.length; i++) {
      const preconditions: Record<string, boolean> = {};
      for (const p of preconditionColumns) preconditions[p] = true;
      const constraints: Record<string, boolean> = {};
      for (let j = 0; j < constraintColumns.length; j++) {
        constraints[constraintColumns[j]] = j !== i;
      }
      const conditions: Record<string, boolean | null> = {};
      for (const co of conditionColumns) conditions[co.id] = null; // N/A on failure

      rows.push({
        type: 'failure',
        description: operation.constraints[i].description,
        preconditions, constraints, conditions,
        outcome: `operation.failed:${constraintColumns[i]}`,
        effects: [],
      });
    }
  }

  // Skipped rows — one per precondition
  for (let i = 0; i < preconditionColumns.length; i++) {
    const preconditions: Record<string, boolean> = {};
    for (let j = 0; j < preconditionColumns.length; j++) {
      preconditions[preconditionColumns[j]] = j !== i;
    }
    const constraints: Record<string, boolean> = {};
    for (const c of constraintColumns) constraints[c] = true;
    const conditions: Record<string, boolean | null> = {};
    for (const co of conditionColumns) conditions[co.id] = null; // N/A on skip

    rows.push({
      type: 'skipped',
      description: policy.preconditions[i].description,
      preconditions, constraints, conditions,
      outcome: null,
      effects: [],
    });
  }

  return { preconditionColumns, constraintColumns, conditionColumns, rows };
}

// ── Helpers ─────────────────────────────────────────────────

function findLinkedOperation(graph: DecisionGraph, policy: Policy): Operation | null {
  // Policy emits intent → intent signal → triggers operation
  const intentSignalId = `signal:intent:${policy.emits}`;

  // Find the operation triggered by this intent
  const triggersEdge = graph.edges.find(
    e => e.type === 'triggers' && e.from === intentSignalId
  );
  if (!triggersEdge) return null;

  const opNode = graph.nodes.find(
    (n): n is OperationNode => n.type === 'operation' && n.id === triggersEdge.to
  );

  return opNode?.spec ?? null;
}
