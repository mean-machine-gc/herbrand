/**
 * Graph-level lint checks — pure functions using graphology.
 *
 * Each function takes a DecisionGraph + System and returns violations.
 * Internally converts to graphology for algorithm support.
 */

import type { System } from '../index.js';
import type { DecisionGraph, SignalNode, ViewNode, PolicyNode, OperationNode } from '../graph/graph.js';
import type { LintViolation } from './lint-types.js';
import { toGraphology, nodesOfType, edgesOfType } from '../graph/graphology-adapter.js';
import { bfsFromNode } from 'graphology-traversal';
import { hasCycle } from 'graphology-dag';

// ── Reachability ───────────────────────────────────────────

export function checkNoOrphanDecisions(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const decisions = [
    ...nodesOfType(g, 'policy'),
    ...nodesOfType(g, 'operation'),
  ];

  for (const d of decisions) {
    // A decision is orphaned if no triggers edge points to it
    const hasIncoming = edgesOfType(g, 'triggers').some(e => e.target === d.id);
    if (!hasIncoming) {
      violations.push({ ruleId: 'graph/no-orphan-decisions', level: 'warning', target: d.id,
        message: 'not reachable from any signal — no triggers edge points to this decision' });
    }
  }

  return violations;
}

export function checkNoDeadEndChains(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const externals = nodesOfType(g, 'signal').filter(s => s.attrs.origin === 'external');

  for (const ext of externals) {
    // BFS from this external signal — does it reach at least one terminal?
    const reached = new Set<string>();
    bfsFromNode(g, ext.id, (node) => { reached.add(node); });

    // A terminal signal is one with no outgoing triggers edges
    const triggersFrom = new Set(edgesOfType(g, 'triggers').map(e => e.source));
    const reachesTerminal = [...reached].some(nodeId => {
      const attrs = g.getNodeAttributes(nodeId);
      return attrs.type === 'signal' && !triggersFrom.has(nodeId);
    });

    if (!reachesTerminal) {
      violations.push({ ruleId: 'graph/no-dead-end-chains', level: 'info', target: ext.id,
        message: `chain from external signal "${ext.attrs.kind}" does not reach any terminal outcome` });
    }
  }

  return violations;
}

// ── Cycle analysis ─────────────────────────────────────────

export function checkNoDegenerateCycles(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);

  // Only consider the chain subgraph (triggers + emits edges, no informs/updates)
  const chainEdges = g.filterEdges((_edge, attrs) =>
    attrs.type === 'triggers' || attrs.type === 'emits'
  );

  // Build a subgraph with only chain edges
  const sub = g.copy();
  sub.forEachEdge((edge, attrs) => {
    if (attrs.type !== 'triggers' && attrs.type !== 'emits') {
      sub.dropEdge(edge);
    }
  });

  if (hasCycle(sub)) {
    return [{ ruleId: 'graph/no-degenerate-cycles', level: 'error', target: '_system',
      message: 'the decision graph contains a cycle — check for infinite cascades' }];
  }

  return [];
}

export function checkCycleHasExit(graph: DecisionGraph, _system: System): LintViolation[] {
  // If there are no cycles, nothing to check
  const g = toGraphology(graph);
  const sub = g.copy();
  sub.forEachEdge((edge, attrs) => {
    if (attrs.type !== 'triggers' && attrs.type !== 'emits') {
      sub.dropEdge(edge);
    }
  });

  if (!hasCycle(sub)) return [];

  // There is a cycle — check if any policy in the graph has preconditions (exit condition)
  // or any operation has conditional outcomes (alternate path)
  const policies = nodesOfType(g, 'policy');
  const operations = nodesOfType(g, 'operation');

  const hasExitCondition =
    policies.some(p => p.attrs.spec.preconditions.length > 0) ||
    operations.some(o => o.attrs.spec.conditionalOutcomes.length > 0);

  if (!hasExitCondition) {
    return [{ ruleId: 'graph/cycle-has-exit', level: 'warning', target: '_system',
      message: 'cycle detected but no policy has preconditions and no operation has conditional outcomes — no exit path' }];
  }

  return [];
}

// ── Signal completeness ────────────────────────────────────

export function checkExternalSignalsDocumented(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const externals = nodesOfType(g, 'signal').filter(s => s.attrs.origin === 'external');
  for (const ext of externals) {
    violations.push({ ruleId: 'graph/external-signals-documented', level: 'info', target: ext.id,
      message: `external ${ext.attrs.signalKind} "${ext.attrs.kind}" — confirm this is intentionally external or add a producing decision` });
  }

  return violations;
}

export function checkTerminalSignalsDocumented(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const triggersFrom = new Set(edgesOfType(g, 'triggers').map(e => e.source));
  const signals = nodesOfType(g, 'signal');
  const terminals = signals.filter(s => !triggersFrom.has(s.id));

  for (const term of terminals) {
    violations.push({ ruleId: 'graph/terminal-signals-documented', level: 'info', target: term.id,
      message: `terminal ${term.attrs.signalKind} "${term.attrs.kind}" — confirm this is intentionally terminal or add a listening decision` });
  }

  return violations;
}

// ── View / side-effect correctness ─────────────────────────

export function checkViewHasUpdater(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const updatesTargets = new Set(edgesOfType(g, 'updates').map(e => e.target));
  const views = nodesOfType(g, 'view');

  for (const v of views) {
    if (!updatesTargets.has(v.id)) {
      violations.push({ ruleId: 'graph/view-has-updater', level: 'info', target: v.id,
        message: `view for "${v.attrs.decisionId}" has no updates edge — its info points [${v.attrs.infoPoints.join(', ')}] are static/seed data only` });
    }
  }

  return violations;
}

export function checkCircularSideEffects(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  // For each operation: check if any outcome it produces updates a view that informs it
  const operations = nodesOfType(g, 'operation');
  const updatesEdges = edgesOfType(g, 'updates');
  const informsEdges = edgesOfType(g, 'informs');
  const emitsEdges = edgesOfType(g, 'emits');

  for (const op of operations) {
    // Outcome signals this operation emits
    const emittedSignals = emitsEdges
      .filter(e => e.source === op.id)
      .map(e => e.target);

    // Views that inform this operation
    const informingViews = informsEdges
      .filter(e => e.target === op.id)
      .map(e => e.source);

    // Check if any emitted signal updates any informing view
    for (const signalId of emittedSignals) {
      for (const viewId of informingViews) {
        const hasCircular = updatesEdges.some(e => e.source === signalId && e.target === viewId);
        if (hasCircular) {
          const signalAttrs = g.getNodeAttributes(signalId);
          violations.push({ ruleId: 'graph/circular-side-effects', level: 'warning', target: op.id,
            message: `outcome "${signalAttrs.kind}" updates view "${viewId}" which informs this operation — feedback loop` });
        }
      }
    }
  }

  return violations;
}

// ── Wiring completeness ────────────────────────────────────

export function checkIntentHasConsumer(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const intents = nodesOfType(g, 'signal').filter(s => s.attrs.signalKind === 'intent');
  const triggersTargets = new Map(edgesOfType(g, 'triggers').map(e => [e.source, e.target]));

  for (const intent of intents) {
    if (!triggersTargets.has(intent.id)) {
      violations.push({ ruleId: 'graph/intent-has-consumer', level: 'warning', target: intent.id,
        message: `intent "${intent.attrs.kind}" is not consumed by any operation` });
    }
  }

  return violations;
}

export function checkOutcomeHasListener(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const outcomes = nodesOfType(g, 'signal').filter(s => s.attrs.signalKind === 'outcome' && s.attrs.origin === 'internal');
  const triggersFrom = new Set(edgesOfType(g, 'triggers').map(e => e.source));

  for (const outcome of outcomes) {
    if (!triggersFrom.has(outcome.id)) {
      violations.push({ ruleId: 'graph/outcome-has-listener', level: 'info', target: outcome.id,
        message: `outcome "${outcome.attrs.kind}" has no policy listening — confirm this is terminal` });
    }
  }

  return violations;
}

export function checkNoDuplicateActivation(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  // Group triggers edges by source (signal) and count distinct targets
  const triggersBySignal = new Map<string, string[]>();
  for (const e of edgesOfType(g, 'triggers')) {
    const signalAttrs = g.getNodeAttributes(e.source);
    if (signalAttrs.signalKind === 'intent') {
      const targets = triggersBySignal.get(e.source) ?? [];
      targets.push(e.target);
      triggersBySignal.set(e.source, targets);
    }
  }

  for (const [signalId, targets] of triggersBySignal) {
    if (targets.length > 1) {
      const signalAttrs = g.getNodeAttributes(signalId);
      violations.push({ ruleId: 'graph/no-duplicate-activation', level: 'warning', target: signalId,
        message: `intent "${signalAttrs.kind}" activates ${targets.length} operations: [${targets.join(', ')}] — ambiguous routing` });
    }
  }

  return violations;
}

export function checkNoDuplicateOutcomeKinds(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  // Group emits edges by target signal, count distinct source operations
  const producersByOutcome = new Map<string, string[]>();
  for (const e of edgesOfType(g, 'emits')) {
    const targetAttrs = g.getNodeAttributes(e.target);
    if (targetAttrs.signalKind === 'outcome') {
      const producers = producersByOutcome.get(e.target) ?? [];
      producers.push(e.source);
      producersByOutcome.set(e.target, producers);
    }
  }

  for (const [signalId, producers] of producersByOutcome) {
    if (producers.length > 1) {
      const signalAttrs = g.getNodeAttributes(signalId);
      violations.push({ ruleId: 'graph/no-duplicate-outcome-kinds', level: 'warning', target: signalId,
        message: `outcome "${signalAttrs.kind}" produced by ${producers.length} operations: [${producers.join(', ')}] — ambiguous sourcing` });
    }
  }

  return violations;
}

// ── Info point completeness ────────────────────────────────

export function checkInfoPointHasProducer(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  // Collect all produced info points from operation specs
  const produced = new Set<string>();
  for (const op of nodesOfType(g, 'operation')) {
    for (const e of op.attrs.spec.unconditionalOutcome.effects) produced.add(e.point);
    for (const co of op.attrs.spec.conditionalOutcomes) {
      for (const e of co.outcome.effects) produced.add(e.point);
    }
  }

  // Collect all read info points from views
  const readByView = new Map<string, string>(); // point → view id
  for (const v of nodesOfType(g, 'view')) {
    for (const ip of v.attrs.infoPoints) {
      if (!readByView.has(ip)) readByView.set(ip, v.id);
    }
  }

  for (const [point, viewId] of readByView) {
    if (!produced.has(point)) {
      violations.push({ ruleId: 'graph/info-point-has-producer', level: 'warning', target: point,
        message: `read by view "${viewId}" but no operation produces it — is this an external input?` });
    }
  }

  return violations;
}

export function checkInfoPointHasReader(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  // Collect all read info points
  const read = new Set<string>();
  for (const v of nodesOfType(g, 'view')) {
    for (const ip of v.attrs.infoPoints) read.add(ip);
  }

  // Check all produced info points
  for (const op of nodesOfType(g, 'operation')) {
    for (const e of op.attrs.spec.unconditionalOutcome.effects) {
      if (!read.has(e.point)) {
        violations.push({ ruleId: 'graph/info-point-has-reader', level: 'info', target: e.point,
          message: `produced by "${op.id}" but never read by any view` });
      }
    }
    for (const co of op.attrs.spec.conditionalOutcomes) {
      for (const e of co.outcome.effects) {
        if (!read.has(e.point)) {
          violations.push({ ruleId: 'graph/info-point-has-reader', level: 'info', target: e.point,
            message: `produced by "${op.id}" (conditional) but never read` });
        }
      }
    }
  }

  return violations;
}

export function checkInfoPointNamingConsistency(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  // Collect all info point names
  const allPoints = new Set<string>();
  for (const v of nodesOfType(g, 'view')) {
    for (const ip of v.attrs.infoPoints) allPoints.add(ip);
  }
  for (const op of nodesOfType(g, 'operation')) {
    for (const e of op.attrs.spec.unconditionalOutcome.effects) allPoints.add(e.point);
    for (const co of op.attrs.spec.conditionalOutcomes) {
      for (const e of co.outcome.effects) allPoints.add(e.point);
    }
  }

  // Check: all should use dot-notation
  const dotPattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
  for (const point of allPoints) {
    if (!dotPattern.test(point)) {
      violations.push({ ruleId: 'graph/info-point-naming-consistency', level: 'info', target: point,
        message: `does not follow dot-notation pattern (expected: "entity.property.subproperty")` });
    }
  }

  return violations;
}

// ── Assignment completeness ────────────────────────────────

export function checkActorAssigned(graph: DecisionGraph, _system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  for (const d of [...nodesOfType(g, 'policy'), ...nodesOfType(g, 'operation')]) {
    if (!d.attrs.spec.actor) {
      violations.push({ ruleId: 'graph/actor-assigned', level: 'warning', target: d.id,
        message: 'no actor assigned to this decision' });
    }
  }

  return violations;
}

// ── Orphans ────────────────────────────────────────────────

export function checkNoOrphanActors(graph: DecisionGraph, system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const usedActorIds = new Set<string>();
  for (const d of [...nodesOfType(g, 'policy'), ...nodesOfType(g, 'operation')]) {
    if (d.attrs.spec.actor) usedActorIds.add(d.attrs.spec.actor);
  }

  for (const actor of system.actors) {
    if (!usedActorIds.has(actor.id)) {
      violations.push({ ruleId: 'graph/no-orphan-actors', level: 'info', target: actor.id,
        message: 'actor declared but not assigned to any decision' });
    }
  }

  return violations;
}

export function checkNoOrphanContexts(graph: DecisionGraph, system: System): LintViolation[] {
  const g = toGraphology(graph);
  const violations: LintViolation[] = [];

  const usedContextIds = new Set<string>();
  for (const d of [...nodesOfType(g, 'policy'), ...nodesOfType(g, 'operation')]) {
    usedContextIds.add(d.attrs.spec.context);
  }

  for (const ctx of system.contexts) {
    if (!usedContextIds.has(ctx.id)) {
      violations.push({ ruleId: 'graph/no-orphan-contexts', level: 'info', target: ctx.id,
        message: 'execution context declared but no decision runs in it' });
    }
  }

  return violations;
}
