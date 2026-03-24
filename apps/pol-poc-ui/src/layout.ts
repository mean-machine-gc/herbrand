/**
 * Dagre-based layout with swimlanes.
 *
 * Pure function — takes graph data + actors + contexts as input.
 * Uses CSS variable references for theme-aware colors.
 */

import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { DecisionGraph, GraphNode as CoreGraphNode, GraphEdge as CoreGraphEdge, SignalNode, PolicyNode, OperationNode, ViewNode } from 'policies-poc/graph';
import type { Actor, ExecutionContext } from 'policies-poc';

// Re-export node types for CustomNode / SwimlaneNode
export type GraphNode = CoreGraphNode;

// ── Constants ───────────────────────────────────────────────

const DECISION_WIDTH = 220;
const DECISION_HEIGHT = 54;
const SIGNAL_WIDTH = 200;
const SIGNAL_HEIGHT = 46;
const VIEW_LINE_HEIGHT = 16;
const VIEW_PADDING = 26;
const SWIMLANE_PADDING_TOP = 35;
const SWIMLANE_PADDING_X = 30;
const SWIMLANE_GAP = 30;
const VIEW_GAP = 30;
const LANE_LEFT_MARGIN = 20;

function viewNodeHeight(infoPointCount: number): number {
  return VIEW_PADDING + infoPointCount * VIEW_LINE_HEIGHT;
}

// ── Colors (CSS variable references for theme awareness) ────

const C = {
  policy: 'hsl(var(--h-policy))',
  operation: 'hsl(var(--h-operation))',
  intent: 'hsl(var(--h-intent))',
  outcome: 'hsl(var(--h-outcome))',
  info: 'hsl(var(--h-info))',
};

// ── Types ───────────────────────────────────────────────────

type Swimlane = {
  id: string;
  label: string;
  actorType: 'human' | 'llm' | 'machine';
  actorId: string;
  contextId: string;
};

export type LayoutInput = {
  graph: DecisionGraph;
  actors: Actor[];
  contexts: ExecutionContext[];
};

export type LayoutResult = {
  nodes: Node[];
  chainEdges: Edge[];
  updatesEdges: Edge[];
};

// ── Main layout function ────────────────────────────────────

export function computeLayout(input: LayoutInput): LayoutResult {
  const { graph, actors, contexts } = input;
  const graphNodes = graph.nodes;
  const graphEdges = graph.edges;
  const actorMap = new Map(actors.map(a => [a.id, a]));
  const contextMap = new Map(contexts.map(c => [c.id, c]));

  // ── Derive swimlanes ────────────────────────────────────────

  const swimlanes: Swimlane[] = [];
  const seenLanes = new Set<string>();

  for (const node of graphNodes) {
    if (node.type !== 'policy' && node.type !== 'operation') continue;
    const actorId = node.spec.actor;
    if (!actorId) continue;
    const actor = actorMap.get(actorId);
    if (!actor) continue;
    const ctx = contextMap.get(node.spec.context);
    if (!ctx) continue;
    const key = `${actor.id}@${node.spec.context}`;
    if (!seenLanes.has(key)) {
      seenLanes.add(key);
      const label = actor.type === 'human' ? (actor as any).role : actor.id;
      swimlanes.push({
        id: key,
        label: `${label} @ ${ctx.description}`,
        actorType: actor.type,
        actorId: actor.id,
        contextId: node.spec.context,
      });
    }
  }

  const typeOrder = { human: 0, llm: 1, machine: 2 };
  swimlanes.sort((a, b) => typeOrder[a.actorType] - typeOrder[b.actorType]);

  // ── Swimlane assignment helpers ─────────────────────────────

  function laneForDecision(decisionId: string): string | undefined {
    const node = graphNodes.find(n =>
      (n.type === 'policy' || n.type === 'operation') && n.id === decisionId
    ) as PolicyNode | OperationNode | undefined;
    if (!node?.spec.actor) return undefined;
    return `${node.spec.actor}@${node.spec.context}`;
  }

  function laneForSignal(signalId: string): string | undefined {
    const producerEdge = graphEdges.find(e => e.type === 'emits' && e.to === signalId);
    if (producerEdge) return laneForDecision(producerEdge.from);
    const consumerEdge = graphEdges.find(e => e.type === 'triggers' && e.from === signalId);
    if (consumerEdge) return laneForDecision(consumerEdge.to);
    return undefined;
  }

  // ── Assign nodes to swimlanes ─────────────────────────────

  const laneChainNodes = new Map<string, CoreGraphNode[]>();
  const laneViewNodes = new Map<string, CoreGraphNode[]>();
  for (const lane of swimlanes) {
    laneChainNodes.set(lane.id, []);
    laneViewNodes.set(lane.id, []);
  }

  for (const node of graphNodes) {
    if (node.type === 'view') {
      const lane = laneForDecision(node.decisionId);
      if (lane && laneViewNodes.has(lane)) laneViewNodes.get(lane)!.push(node);
    } else if (node.type === 'policy' || node.type === 'operation') {
      const lane = laneForDecision(node.id);
      if (lane && laneChainNodes.has(lane)) laneChainNodes.get(lane)!.push(node);
    } else if (node.type === 'signal') {
      const lane = laneForSignal(node.id);
      if (lane && laneChainNodes.has(lane)) laneChainNodes.get(lane)!.push(node);
    }
  }

  // ── Dagre for x-positioning ───────────────────────────────

  const g = new Dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 60, nodesep: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graphNodes) {
    if (node.type === 'view') continue;
    const w = node.type === 'signal' ? SIGNAL_WIDTH : DECISION_WIDTH;
    const h = node.type === 'signal' ? SIGNAL_HEIGHT : DECISION_HEIGHT;
    g.setNode(node.id, { width: w, height: h });
  }
  for (const edge of graphEdges) {
    if (edge.type !== 'informs' && edge.type !== 'updates') g.setEdge(edge.from, edge.to);
  }

  Dagre.layout(g);

  // ── Operation → outcome signal map (needed for stacking + swimlane sizing) ──

  const operationOutcomes = new Map<string, string[]>();
  for (const edge of graphEdges) {
    if (edge.type === 'emits') {
      const sourceNode = graphNodes.find(n => n.id === edge.from);
      if (sourceNode?.type === 'operation') {
        const list = operationOutcomes.get(edge.from) ?? [];
        list.push(edge.to);
        operationOutcomes.set(edge.from, list);
      }
    }
  }

  // Map conditional outcome signals to their condition info
  const conditionInfo = new Map<string, { description: string; reads: string[] }>();
  for (const edge of graphEdges) {
    if (edge.type === 'emits' && edge.conditional && 'conditionDescription' in edge) {
      conditionInfo.set(edge.to, {
        description: (edge as any).conditionDescription ?? '',
        reads: (edge as any).conditionReads ?? [],
      });
    }
  }

  const stackedSignals = new Set<string>();
  for (const [, outcomes] of operationOutcomes) {
    if (outcomes.length > 1) {
      for (const id of outcomes) stackedSignals.add(id);
    }
  }

  // ── Swimlane Y positions ──────────────────────────────────

  const swimlaneYMap = new Map<string, number>();
  const swimlaneHeightMap = new Map<string, number>();
  let currentY = 0;

  // Pre-compute max outcome stack height per lane
  const STACK_GAP = 6;
  function outcomeStackHeight(operationId: string): number {
    const outcomes = operationOutcomes.get(operationId);
    if (!outcomes || outcomes.length <= 1) return DECISION_HEIGHT;
    return outcomes.length * SIGNAL_HEIGHT + (outcomes.length - 1) * STACK_GAP;
  }

  for (const lane of swimlanes) {
    const views = laneViewNodes.get(lane.id) ?? [];
    let maxViewHeight = 0;
    for (const v of views) {
      if (v.type === 'view') maxViewHeight = Math.max(maxViewHeight, viewNodeHeight(v.infoPoints.length));
    }
    const viewRowHeight = maxViewHeight > 0 ? maxViewHeight + VIEW_GAP : 0;

    // Chain row height = max of decision height or any outcome stack in this lane
    const chainNodes = laneChainNodes.get(lane.id) ?? [];
    let maxChainHeight = DECISION_HEIGHT;
    for (const n of chainNodes) {
      if (n.type === 'operation') {
        maxChainHeight = Math.max(maxChainHeight, outcomeStackHeight(n.id));
      }
    }

    const totalHeight = SWIMLANE_PADDING_TOP + viewRowHeight + maxChainHeight + SWIMLANE_PADDING_TOP;
    swimlaneYMap.set(lane.id, currentY);
    swimlaneHeightMap.set(lane.id, totalHeight);
    currentY += totalHeight + SWIMLANE_GAP;
  }

  // ── Total width ───────────────────────────────────────────

  let maxX = 0;
  for (const node of graphNodes) {
    if (node.type !== 'view') {
      const dn = g.node(node.id);
      if (dn) maxX = Math.max(maxX, dn.x + DECISION_WIDTH / 2);
    }
  }
  const totalWidth = maxX + SWIMLANE_PADDING_X * 2 + LANE_LEFT_MARGIN;

  // ── Position nodes ────────────────────────────────────────

  const rfNodes: Node[] = [];

  for (const lane of swimlanes) {
    const laneY = swimlaneYMap.get(lane.id)!;
    const laneH = swimlaneHeightMap.get(lane.id)!;
    rfNodes.push({
      id: `lane:${lane.id}`,
      position: { x: 0, y: laneY },
      data: { label: lane.label, actorType: lane.actorType, width: totalWidth, height: laneH },
      type: 'swimlane',
      draggable: false,
      selectable: false,
      zIndex: -1,
    });
  }

  for (const [laneId, nodes] of laneChainNodes) {
    const laneY = swimlaneYMap.get(laneId)!;
    const laneH = swimlaneHeightMap.get(laneId)!;
    const chainY = laneY + laneH - SWIMLANE_PADDING_TOP - DECISION_HEIGHT;
    for (const node of nodes) {
      // Skip stacked signals — they'll be positioned after the operation
      if (node.type === 'signal' && stackedSignals.has(node.id)) continue;

      const dn = g.node(node.id);
      if (!dn) continue;
      const w = node.type === 'signal' ? SIGNAL_WIDTH : DECISION_WIDTH;
      const h = node.type === 'signal' ? SIGNAL_HEIGHT : DECISION_HEIGHT;
      const yOffset = (DECISION_HEIGHT - h) / 2;
      rfNodes.push({
        id: node.id,
        position: { x: dn.x - w / 2 + LANE_LEFT_MARGIN, y: chainY + yOffset },
        data: { label: nodeLabel(node), graphNode: node, condition: conditionInfo.get(node.id) },
        type: 'custom',
        style: nodeStyle(node),
      });

      // If this is an operation with multiple outcomes, stack them vertically
      if (node.type === 'operation') {
        const outcomes = operationOutcomes.get(node.id);
        if (outcomes && outcomes.length > 1) {
          // Use dagre's x for the first outcome to get the right horizontal position
          const firstDn = g.node(outcomes[0]);
          const stackX = firstDn ? firstDn.x - SIGNAL_WIDTH / 2 + LANE_LEFT_MARGIN : dn.x + DECISION_WIDTH / 2 + 40;
          // Center the stack vertically around the chain midline
          const totalStackHeight = outcomes.length * SIGNAL_HEIGHT + (outcomes.length - 1) * STACK_GAP;
          const stackStartY = chainY + (DECISION_HEIGHT - totalStackHeight) / 2;

          for (let i = 0; i < outcomes.length; i++) {
            const sigNode = graphNodes.find(n => n.id === outcomes[i]);
            if (!sigNode) continue;
            rfNodes.push({
              id: outcomes[i],
              position: { x: stackX, y: stackStartY + i * (SIGNAL_HEIGHT + STACK_GAP) },
              data: { label: nodeLabel(sigNode), graphNode: sigNode, condition: conditionInfo.get(outcomes[i]) },
              type: 'custom',
              style: nodeStyle(sigNode),
            });
          }
        }
      }
    }
  }

  for (const [laneId, views] of laneViewNodes) {
    const laneY = swimlaneYMap.get(laneId)!;
    const viewY = laneY + SWIMLANE_PADDING_TOP;
    for (const view of views) {
      if (view.type !== 'view') continue;
      const decisionRfNode = rfNodes.find(n => n.id === view.decisionId);
      const x = decisionRfNode ? decisionRfNode.position.x : LANE_LEFT_MARGIN;
      rfNodes.push({
        id: view.id,
        position: { x, y: viewY },
        data: { label: nodeLabel(view), graphNode: view },
        type: 'custom',
        style: nodeStyle(view),
      });
    }
  }

  // ── Edges ─────────────────────────────────────────────────

  const chainEdges: Edge[] = [];
  const updatesEdges: Edge[] = [];

  graphEdges.forEach((e, i) => {
    if (e.type === 'updates') {
      updatesEdges.push({
        id: `e-${i}`,
        source: e.from,
        target: e.to,
        type: 'bezier',
        animated: true,
        style: edgeStyle('updates'),
        label: 'points' in e ? (e as any).points?.join(', ') : undefined,
        labelStyle: { fontSize: 8, fill: C.outcome, opacity: 0.7 },
        labelBgStyle: { fill: 'hsl(var(--background))', opacity: 0.8 },
        labelBgPadding: [4, 2] as [number, number],
        targetHandle: 'top',
      });
    } else {
      chainEdges.push({
        id: `e-${i}`,
        source: e.from,
        target: e.to,
        type: e.type === 'informs' ? 'straight' : 'bezier',
        style: edgeStyle(e.type),
        ...('conditional' in e && e.conditional ? {
          label: 'if',
          labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
          labelBgStyle: { fill: 'hsl(var(--background))' },
          data: {
            conditionDescription: (e as any).conditionDescription,
            conditionReads: (e as any).conditionReads,
          },
        } : {}),
        ...(e.type === 'informs' ? { sourceHandle: 'bottom', targetHandle: 'top' } : {}),
      });
    }
  });

  return { nodes: rfNodes, chainEdges, updatesEdges };
}

// ── Helpers ─────────────────────────────────────────────────

function nodeLabel(node: CoreGraphNode): string {
  switch (node.type) {
    case 'policy': return node.id;
    case 'operation': return node.id;
    case 'signal': return node.kind;
    case 'view': return node.infoPoints.join(', ');
  }
}

function nodeStyle(node: CoreGraphNode): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 6,
    fontSize: 11,
    fontFamily: 'monospace',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const decision = { ...base, width: DECISION_WIDTH, height: DECISION_HEIGHT };
  const signal = { ...base, width: SIGNAL_WIDTH, height: SIGNAL_HEIGHT };

  switch (node.type) {
    case 'policy':
      return { ...decision, background: 'hsl(var(--h-policy) / 0.08)', borderColor: C.policy, color: C.policy };
    case 'operation':
      return { ...decision, background: 'hsl(var(--h-operation) / 0.08)', borderColor: C.operation, color: C.operation };
    case 'signal':
      if (node.signalKind === 'intent') {
        return { ...signal, background: 'hsl(var(--h-intent) / 0.08)', borderColor: C.intent, color: C.intent,
          borderStyle: node.origin === 'external' ? 'dashed' : 'solid' };
      }
      return { ...signal, background: 'hsl(var(--h-outcome) / 0.08)', borderColor: C.outcome, color: C.outcome,
        borderStyle: node.origin === 'external' ? 'dashed' : 'solid' };
    case 'view':
      return { ...base, width: DECISION_WIDTH, background: 'hsl(var(--h-info) / 0.06)', borderColor: C.info, color: C.info,
        fontSize: 9, borderStyle: 'dashed',
        height: viewNodeHeight(node.infoPoints.length),
        alignItems: 'flex-start', justifyContent: 'flex-start' };
  }
}

function edgeStyle(type: string): React.CSSProperties {
  switch (type) {
    case 'triggers': return { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 };
    case 'emits': return { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 };
    case 'informs': return { stroke: C.info, strokeWidth: 1.5, opacity: 0.6 };
    case 'updates': return { stroke: C.outcome, strokeWidth: 1, strokeDasharray: '6 3', opacity: 0.5 };
    default: return { stroke: 'hsl(var(--muted-foreground))' };
  }
}
