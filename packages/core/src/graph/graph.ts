/**
 * Decision Graph — derived from a System.
 *
 * Four node types:
 *   - Signal:    an intent or outcome (standalone or flowing between decisions)
 *   - Policy:    an intent-decision
 *   - Operation: an outcome-decision
 *   - View:      a derived projection of info points that informs a decision
 *
 * Five edge types:
 *   - triggers:  signal → decision  (outcome activates policy, intent activates operation)
 *   - emits:     decision → signal  (policy emits intent, operation produces outcome)
 *   - informs:   view → decision    (view provides context for a decision)
 *   - reads:     view → info point  (what the view projects — optional deeper level)
 *   - effects:   signal → info point (outcome modifies info state — optional deeper level)
 */

import type { System, Policy, Operation } from '../index.js';

// ============================================================
// Node types
// ============================================================

type SignalNode = {
  readonly type: 'signal';
  readonly id: string;
  readonly signalKind: 'intent' | 'outcome';
  readonly kind: string;          // e.g. 'lend.book', 'book.lent'
  readonly origin: 'internal' | 'external';  // produced by a decision, or enters from outside
};

type PolicyNode = {
  readonly type: 'policy';
  readonly id: string;
  /** The full policy spec — available for analysis and derivation */
  readonly spec: Policy;
};

type OperationNode = {
  readonly type: 'operation';
  readonly id: string;
  /** The full operation spec — available for analysis and derivation */
  readonly spec: Operation;
};

type ViewNode = {
  readonly type: 'view';
  readonly id: string;
  /** Which decision this view serves */
  readonly decisionId: string;
  /** The info points this view projects */
  readonly infoPoints: string[];
};

type GraphNode = SignalNode | PolicyNode | OperationNode | ViewNode;

// ============================================================
// Edge types
// ============================================================

type TriggersEdge = {
  readonly type: 'triggers';
  readonly from: string;   // signal node id
  readonly to: string;     // decision node id
};

type EmitsEdge = {
  readonly type: 'emits';
  readonly from: string;   // decision node id
  readonly to: string;     // signal node id
  readonly conditional: boolean;
  readonly conditionDescription?: string;
  readonly conditionReads?: string[];
};

type InformsEdge = {
  readonly type: 'informs';
  readonly from: string;   // view node id
  readonly to: string;     // decision node id
};

type UpdatesEdge = {
  readonly type: 'updates';
  readonly from: string;   // outcome signal node id
  readonly to: string;     // view node id
  /** Which info points the outcome modifies in this view */
  readonly points: string[];
};

type GraphEdge = TriggersEdge | EmitsEdge | InformsEdge | UpdatesEdge;

// ============================================================
// Decision Graph
// ============================================================

type DecisionGraph = {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
};

// ============================================================
// Derivation
// ============================================================

/** Derive the complete decision graph from a built system */
function deriveGraph(system: System): DecisionGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Track which signal kinds are produced internally
  const producedOutcomes = new Set<string>();
  const producedIntents = new Set<string>();

  for (const op of system.operations) {
    producedOutcomes.add(op.unconditionalOutcome.kind);
    for (const co of op.conditionalOutcomes) {
      producedOutcomes.add(co.outcome.kind);
    }
  }
  for (const p of system.policies) {
    producedIntents.add(p.emits);
  }

  // Track signal node IDs to avoid duplicates
  const signalNodes = new Map<string, SignalNode>();

  function ensureSignal(kind: string, signalKind: 'intent' | 'outcome'): string {
    const id = `signal:${signalKind}:${kind}`;
    if (!signalNodes.has(id)) {
      const isProduced = signalKind === 'outcome'
        ? producedOutcomes.has(kind)
        : producedIntents.has(kind);
      const node: SignalNode = {
        type: 'signal',
        id,
        signalKind,
        kind,
        origin: isProduced ? 'internal' : 'external',
      };
      signalNodes.set(id, node);
    }
    return id;
  }

  // ── Policy nodes ──────────────────────────────────────────

  for (const p of system.policies) {
    nodes.push({
      type: 'policy',
      id: p.id,
      spec: p,
    });

    // triggers: outcome signals → policy
    for (const outcomeKind of p.activatedBy) {
      const signalId = ensureSignal(outcomeKind, 'outcome');
      edges.push({ type: 'triggers', from: signalId, to: p.id });
    }

    // emits: policy → intent signal
    const intentSignalId = ensureSignal(p.emits, 'intent');
    edges.push({ type: 'emits', from: p.id, to: intentSignalId, conditional: false });
  }

  // ── Operation nodes ───────────────────────────────────────

  for (const op of system.operations) {
    nodes.push({
      type: 'operation',
      id: op.id,
      spec: op,
    });

    // triggers: intent signals → operation
    for (const intentKind of op.activatedBy) {
      const signalId = ensureSignal(intentKind, 'intent');
      edges.push({ type: 'triggers', from: signalId, to: op.id });
    }

    // emits: operation → outcome signals
    const unconditionalId = ensureSignal(op.unconditionalOutcome.kind, 'outcome');
    edges.push({ type: 'emits', from: op.id, to: unconditionalId, conditional: false });

    for (const co of op.conditionalOutcomes) {
      const conditionalId = ensureSignal(co.outcome.kind, 'outcome');
      edges.push({
        type: 'emits', from: op.id, to: conditionalId, conditional: true,
        conditionDescription: co.condition.description,
        conditionReads: co.condition.reads,
      });
    }
  }

  // ── View nodes ────────────────────────────────────────────

  for (const p of system.policies) {
    const viewNode = deriveViewNode(p.id, p);
    if (viewNode.infoPoints.length > 0) {
      nodes.push(viewNode);
      edges.push({ type: 'informs', from: viewNode.id, to: p.id });
    }
  }

  for (const op of system.operations) {
    const viewNode = deriveOperationViewNode(op);
    if (viewNode.infoPoints.length > 0) {
      nodes.push(viewNode);
      edges.push({ type: 'informs', from: viewNode.id, to: op.id });
    }
  }

  // ── Add signal nodes ──────────────────────────────────────

  nodes.push(...signalNodes.values());

  // ── Updates edges: outcome signals → views they affect ────

  // Collect all view nodes for lookup
  const viewNodes = nodes.filter((n): n is ViewNode => n.type === 'view');
  const viewPointSets = new Map(viewNodes.map(v => [v.id, new Set(v.infoPoints)]));

  for (const op of system.operations) {
    // For each outcome this operation produces, check which views it affects
    const outcomes = [
      { kind: op.unconditionalOutcome.kind, effects: op.unconditionalOutcome.effects },
      ...op.conditionalOutcomes.map(co => ({ kind: co.outcome.kind, effects: co.outcome.effects })),
    ];

    for (const outcome of outcomes) {
      const signalId = `signal:outcome:${outcome.kind}`;
      const affectedPoints = outcome.effects.map(e => e.point);

      for (const [viewId, viewPoints] of viewPointSets) {
        const overlap = affectedPoints.filter(p => viewPoints.has(p));
        if (overlap.length > 0) {
          edges.push({ type: 'updates', from: signalId, to: viewId, points: overlap });
        }
      }
    }
  }

  return { nodes, edges };
}

/** Derive a view node for a policy (from preconditions) */
function deriveViewNode(policyId: string, policy: Policy): ViewNode {
  const points = new Set<string>();
  for (const pre of policy.preconditions) {
    for (const r of pre.reads) points.add(r);
  }
  return {
    type: 'view',
    id: `view:${policyId}`,
    decisionId: policyId,
    infoPoints: [...points],
  };
}

/** Derive a view node for an operation (from constraints + conditional outcome conditions) */
function deriveOperationViewNode(operation: Operation): ViewNode {
  const points = new Set<string>();
  for (const c of operation.constraints) {
    for (const r of c.reads) points.add(r);
  }
  for (const co of operation.conditionalOutcomes) {
    for (const r of co.condition.reads) points.add(r);
  }
  return {
    type: 'view',
    id: `view:${operation.id}`,
    decisionId: operation.id,
    infoPoints: [...points],
  };
}

// ============================================================
// Graph queries
// ============================================================

/** Get all external signals — entry/exit points of the system */
function externalSignals(graph: DecisionGraph): SignalNode[] {
  return graph.nodes.filter((n): n is SignalNode => n.type === 'signal' && n.origin === 'external');
}

/** Get all terminal signals — signals that no decision listens to */
function terminalSignals(graph: DecisionGraph): SignalNode[] {
  const triggeredFrom = new Set(graph.edges.filter(e => e.type === 'triggers').map(e => e.from));
  return graph.nodes.filter((n): n is SignalNode => n.type === 'signal' && !triggeredFrom.has(n.id));
}

/** Get the view that informs a given decision */
function viewForDecision(graph: DecisionGraph, decisionId: string): ViewNode | undefined {
  const edge = graph.edges.find(e => e.type === 'informs' && e.to === decisionId);
  if (!edge) return undefined;
  return graph.nodes.find((n): n is ViewNode => n.id === edge.from);
}

/** Group nodes by execution context */
function nodesByContext(graph: DecisionGraph, system: System): Map<string, GraphNode[]> {
  const map = new Map<string, GraphNode[]>();

  for (const ctx of system.contexts) {
    map.set(ctx.id, []);
  }
  map.set('_external', []);  // signals and views without a context

  for (const node of graph.nodes) {
    if (node.type === 'policy' || node.type === 'operation') {
      const bucket = map.get(node.spec.context) ?? map.get('_external')!;
      bucket.push(node);
    } else if (node.type === 'view') {
      // views inherit context from their decision
      const decision = graph.nodes.find(n =>
        (n.type === 'policy' || n.type === 'operation') && n.id === node.decisionId
      ) as PolicyNode | OperationNode | undefined;
      const bucket = decision ? (map.get(decision.spec.context) ?? map.get('_external')!) : map.get('_external')!;
      bucket.push(node);
    } else {
      map.get('_external')!.push(node);
    }
  }

  return map;
}

/** Count edges crossing context boundaries (coupling metric) */
function crossContextEdges(graph: DecisionGraph, system: System): GraphEdge[] {
  const contextOf = new Map<string, string>();

  for (const node of graph.nodes) {
    if (node.type === 'policy' || node.type === 'operation') {
      contextOf.set(node.id, node.spec.context);
    }
  }

  return graph.edges.filter(e => {
    const fromCtx = contextOf.get(e.from);
    const toCtx = contextOf.get(e.to);
    return fromCtx && toCtx && fromCtx !== toCtx;
  });
}

/**
 * Extract a process subgraph — the perspective of one business process.
 *
 * Includes all decisions tagged with the process, their signals (connected
 * via triggers/emits), and their views (connected via informs/updates).
 */
function processSubgraph(graph: DecisionGraph, processId: string): DecisionGraph {
  // Start with decisions tagged with this process
  const decisionIds = new Set(
    graph.nodes
      .filter(n => (n.type === 'policy' || n.type === 'operation') && n.spec.processes?.includes(processId))
      .map(n => n.id)
  );

  // Include signals connected to these decisions (via triggers/emits)
  const signalIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.type === 'triggers' && decisionIds.has(edge.to)) signalIds.add(edge.from);
    if (edge.type === 'emits' && decisionIds.has(edge.from)) signalIds.add(edge.to);
  }

  // Include views that inform these decisions
  const viewIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.type === 'informs' && decisionIds.has(edge.to)) viewIds.add(edge.from);
  }

  const nodeIds = new Set([...decisionIds, ...signalIds, ...viewIds]);
  const nodes = graph.nodes.filter(n => nodeIds.has(n.id));
  const edges = graph.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

  return { nodes, edges };
}

export type {
  SignalNode, PolicyNode, OperationNode, ViewNode, GraphNode,
  TriggersEdge, EmitsEdge, InformsEdge, UpdatesEdge, GraphEdge,
  DecisionGraph,
};

export {
  deriveGraph,
  externalSignals,
  terminalSignals,
  viewForDecision,
  nodesByContext,
  crossContextEdges,
  processSubgraph,
};
