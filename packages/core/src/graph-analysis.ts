/**
 * Graph analysis — implementations using graphology.
 *
 * Each function takes a DecisionGraph + System and returns AnalysisInsight[].
 */

import { UndirectedGraph } from 'graphology';
import type { System } from './index.js';
import type { DecisionGraph } from './graph.js';
import { toGraphology, nodesOfType, edgesOfType } from './graphology-adapter.js';
import { bfsFromNode } from 'graphology-traversal';
import { stronglyConnectedComponents } from 'graphology-components';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness.js';
import louvain from 'graphology-communities-louvain';
import { bidirectional } from 'graphology-shortest-path/unweighted.js';

// ============================================================
// Types
// ============================================================

export type AnalysisInsight = {
  readonly description: string;
  readonly targets: string[];
  readonly data?: Record<string, unknown>;
};

export type GraphAnalysis = {
  readonly id: string;
  readonly description: string;
  readonly category: 'boundaries' | 'coupling' | 'impact' | 'clustering' | 'flow';
  analyze(graph: DecisionGraph, system: System): AnalysisInsight[];
};

// ============================================================
// Helpers
// ============================================================

/** Get the execution context of a node, or undefined */
function contextOf(nodeId: string, graph: DecisionGraph): string | undefined {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (node && (node.type === 'policy' || node.type === 'operation')) return node.spec.context;
  if (node && node.type === 'view') {
    const decision = graph.nodes.find(n => n.id === node.decisionId);
    if (decision && (decision.type === 'policy' || decision.type === 'operation')) return decision.spec.context;
  }
  return undefined;
}

/** Build a chain-only subgraph (triggers + emits edges only) */
function chainSubgraph(graph: DecisionGraph) {
  const g = toGraphology(graph);
  const toDrop: string[] = [];
  g.forEachEdge((edge, attrs) => {
    if (attrs.type !== 'triggers' && attrs.type !== 'emits') toDrop.push(edge);
  });
  for (const e of toDrop) g.dropEdge(e);
  return g;
}

// ============================================================
// Boundaries
// ============================================================

export function analyzeCrossContextIntegrationPoints(graph: DecisionGraph, system: System): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];

  for (const edge of graph.edges) {
    if (edge.type === 'informs' || edge.type === 'updates') continue;
    const fromCtx = contextOf(edge.from, graph);
    const toCtx = contextOf(edge.to, graph);
    if (fromCtx && toCtx && fromCtx !== toCtx) {
      insights.push({
        description: `${edge.type} edge crosses boundary: ${fromCtx} → ${toCtx}`,
        targets: [edge.from, edge.to],
        data: { fromContext: fromCtx, toContext: toCtx, edgeType: edge.type },
      });
    }
  }

  return insights;
}

export function analyzeExecutionContextCohesion(graph: DecisionGraph, system: System): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const chainEdges = graph.edges.filter(e => e.type === 'triggers' || e.type === 'emits');

  for (const ctx of system.contexts) {
    const ctxNodeIds = new Set(
      graph.nodes
        .filter(n => (n.type === 'policy' || n.type === 'operation') && n.spec.context === ctx.id)
        .map(n => n.id)
    );

    let internal = 0;
    let cross = 0;

    for (const edge of chainEdges) {
      const fromIn = ctxNodeIds.has(edge.from);
      const toIn = ctxNodeIds.has(edge.to);
      if (fromIn && toIn) internal++;
      else if (fromIn || toIn) cross++;
    }

    const total = internal + cross;
    const ratio = total > 0 ? internal / total : 1;

    insights.push({
      description: `${ctx.id}: ${internal} internal, ${cross} cross-boundary (cohesion: ${(ratio * 100).toFixed(0)}%)`,
      targets: [...ctxNodeIds],
      data: { contextId: ctx.id, internal, cross, cohesionRatio: ratio },
    });
  }

  return insights;
}

export function analyzeExecutionContextIsolation(graph: DecisionGraph, system: System): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const chainEdges = graph.edges.filter(e => e.type === 'triggers' || e.type === 'emits');

  for (const ctx of system.contexts) {
    const ctxNodeIds = new Set(
      graph.nodes
        .filter(n => (n.type === 'policy' || n.type === 'operation') && n.spec.context === ctx.id)
        .map(n => n.id)
    );

    const hasCross = chainEdges.some(edge => {
      const fromIn = ctxNodeIds.has(edge.from);
      const toIn = ctxNodeIds.has(edge.to);
      return (fromIn && !toIn) || (!fromIn && toIn);
    });

    if (!hasCross && ctxNodeIds.size > 0) {
      insights.push({
        description: `${ctx.id} is fully isolated — no cross-boundary edges`,
        targets: [...ctxNodeIds],
        data: { contextId: ctx.id },
      });
    }
  }

  return insights;
}

// ============================================================
// Coupling
// ============================================================

export function analyzeCrossContextDataCoupling(graph: DecisionGraph, system: System): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const updatesEdges = graph.edges.filter(e => e.type === 'updates');

  for (const edge of updatesEdges) {
    // Signal's producing operation context
    const producerEdge = graph.edges.find(e => e.type === 'emits' && e.to === edge.from);
    const producerCtx = producerEdge ? contextOf(producerEdge.from, graph) : undefined;
    // View's decision context
    const viewNode = graph.nodes.find(n => n.id === edge.to);
    const viewCtx = viewNode && viewNode.type === 'view' ? contextOf(viewNode.decisionId, graph) : undefined;

    if (producerCtx && viewCtx && producerCtx !== viewCtx) {
      insights.push({
        description: `outcome in ${producerCtx} updates view in ${viewCtx} — cross-context data coupling`,
        targets: [edge.from, edge.to],
        data: {
          producerContext: producerCtx,
          viewContext: viewCtx,
          points: 'points' in edge ? edge.points : [],
        },
      });
    }
  }

  return insights;
}

// ============================================================
// Impact
// ============================================================

export function analyzeHighImpactSignals(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const g = toGraphology(graph);

  const signals = nodesOfType(g, 'signal');
  const triggersEdges = edgesOfType(g, 'triggers');

  // Fan-out: how many decisions does each signal trigger?
  const fanOut = new Map<string, number>();
  for (const e of triggersEdges) {
    fanOut.set(e.source, (fanOut.get(e.source) ?? 0) + 1);
  }

  for (const signal of signals) {
    const fo = fanOut.get(signal.id) ?? 0;
    if (fo > 1) {
      insights.push({
        description: `${signal.attrs.signalKind} "${signal.attrs.kind}" triggers ${fo} decisions — high fan-out`,
        targets: [signal.id],
        data: { signalKind: signal.attrs.signalKind, kind: signal.attrs.kind, fanOut: fo },
      });
    }
  }

  return insights;
}

export function analyzeContentionHotspots(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const g = toGraphology(graph);

  const views = nodesOfType(g, 'view');
  const updatesEdges = edgesOfType(g, 'updates');

  const fanIn = new Map<string, number>();
  for (const e of updatesEdges) {
    fanIn.set(e.target, (fanIn.get(e.target) ?? 0) + 1);
  }

  for (const view of views) {
    const fi = fanIn.get(view.id) ?? 0;
    if (fi > 1) {
      insights.push({
        description: `view "${view.id}" updated by ${fi} outcomes — contention hotspot`,
        targets: [view.id],
        data: { viewId: view.id, fanIn: fi, infoPoints: view.attrs.infoPoints },
      });
    }
  }

  return insights;
}

export function analyzeBottleneckDetection(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const g = chainSubgraph(graph);
  if (g.order === 0 || g.size === 0) return [];

  const centrality = betweennessCentrality(g);
  const insights: AnalysisInsight[] = [];

  // Find decisions with above-average betweenness
  const decisionEntries = Object.entries(centrality).filter(([id]) => {
    const attrs = g.getNodeAttributes(id);
    return attrs.type === 'policy' || attrs.type === 'operation';
  });

  if (decisionEntries.length === 0) return [];

  const avg = decisionEntries.reduce((sum, [, v]) => sum + v, 0) / decisionEntries.length;

  for (const [id, score] of decisionEntries) {
    if (score > avg && score > 0) {
      insights.push({
        description: `"${id}" has betweenness centrality ${score.toFixed(3)} (avg: ${avg.toFixed(3)}) — bottleneck`,
        targets: [id],
        data: { betweenness: score, average: avg },
      });
    }
  }

  return insights;
}

export function analyzeBlastRadius(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const g = chainSubgraph(graph);
  const insights: AnalysisInsight[] = [];

  const decisions = [
    ...nodesOfType(toGraphology(graph), 'policy'),
    ...nodesOfType(toGraphology(graph), 'operation'),
  ];

  const totalDecisions = decisions.length;

  for (const d of decisions) {
    if (!g.hasNode(d.id)) continue;
    const reached = new Set<string>();
    bfsFromNode(g, d.id, (node) => { reached.add(node); });

    // Count reachable decisions (excluding self)
    const reachableDecisions = [...reached].filter(id => {
      if (id === d.id) return false;
      const attrs = g.getNodeAttributes(id);
      return attrs.type === 'policy' || attrs.type === 'operation';
    });

    if (reachableDecisions.length > 0) {
      const pct = ((reachableDecisions.length / totalDecisions) * 100).toFixed(0);
      insights.push({
        description: `"${d.id}" can reach ${reachableDecisions.length}/${totalDecisions} decisions (${pct}%)`,
        targets: [d.id, ...reachableDecisions],
        data: { decisionId: d.id, reachable: reachableDecisions.length, total: totalDecisions, percentage: Number(pct) },
      });
    }
  }

  return insights;
}

// ============================================================
// Clustering
// ============================================================

export function analyzeInfoPointClustering(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  // Build a bipartite graph: decisions ↔ info points
  const bip = toGraphology({ nodes: [], edges: [] });

  const g = toGraphology(graph);
  const decisions = [...nodesOfType(g, 'policy'), ...nodesOfType(g, 'operation')];
  const views = nodesOfType(g, 'view');

  // Collect all info points
  const allPoints = new Set<string>();
  for (const v of views) {
    for (const ip of v.attrs.infoPoints) allPoints.add(ip);
  }
  for (const op of nodesOfType(g, 'operation')) {
    for (const e of op.attrs.spec.unconditionalOutcome.effects) allPoints.add(e.point);
    for (const co of op.attrs.spec.conditionalOutcomes) {
      for (const e of co.outcome.effects) allPoints.add(e.point);
    }
  }

  if (allPoints.size < 3) return []; // Not enough to cluster

  // Add nodes
  for (const d of decisions) bip.mergeNode(d.id, { type: 'decision' });
  for (const ip of allPoints) bip.mergeNode(`ip:${ip}`, { type: 'info-point' });

  // Add edges: decision reads/writes info point
  for (const v of views) {
    const decId = v.attrs.decisionId;
    for (const ip of v.attrs.infoPoints) {
      bip.mergeEdge(decId, `ip:${ip}`);
    }
  }
  for (const op of nodesOfType(g, 'operation')) {
    for (const e of op.attrs.spec.unconditionalOutcome.effects) {
      bip.mergeEdge(op.id, `ip:${e.point}`);
    }
    for (const co of op.attrs.spec.conditionalOutcomes) {
      for (const e of co.outcome.effects) {
        bip.mergeEdge(op.id, `ip:${e.point}`);
      }
    }
  }

  // Project onto info-point side: two info points are connected if shared by a decision
  const proj = toGraphology({ nodes: [], edges: [] });
  for (const ip of allPoints) proj.mergeNode(`ip:${ip}`);

  for (const d of decisions) {
    if (!bip.hasNode(d.id)) continue;
    const neighbors = bip.neighbors(d.id).filter(n => n.startsWith('ip:'));
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        proj.mergeEdge(neighbors[i], neighbors[j]);
      }
    }
  }

  if (proj.size === 0) return [];

  try {
    const communities = louvain(proj);
    // Group by community
    const groups = new Map<number, string[]>();
    for (const [node, community] of Object.entries(communities)) {
      const group = groups.get(community) ?? [];
      group.push(node.replace('ip:', ''));
      groups.set(community, group);
    }

    const insights: AnalysisInsight[] = [];
    for (const [communityId, points] of groups) {
      if (points.length > 1) {
        insights.push({
          description: `info point cluster: [${points.join(', ')}] — may suggest an aggregate`,
          targets: points.map(p => `ip:${p}`),
          data: { community: communityId, points },
        });
      }
    }
    return insights;
  } catch {
    return [];
  }
}

export function analyzeDecisionClustering(graph: DecisionGraph, system: System): AnalysisInsight[] {
  const g = chainSubgraph(graph);

  // Need undirected for Louvain
  const undirected = new UndirectedGraph();
  g.forEachNode((id, attrs) => undirected.mergeNode(id, attrs));
  g.forEachEdge((_edge, _attrs, source, target) => {
    undirected.mergeEdge(source, target);
  });

  if (undirected.order < 3 || undirected.size === 0) return [];

  try {
    const communities = louvain(undirected);

    // Group decisions by community
    const groups = new Map<number, string[]>();
    for (const [node, community] of Object.entries(communities)) {
      const attrs = g.getNodeAttributes(node);
      if (attrs.type === 'policy' || attrs.type === 'operation') {
        const group = groups.get(community) ?? [];
        group.push(node);
        groups.set(community, group);
      }
    }

    // Compare with authored contexts
    const insights: AnalysisInsight[] = [];
    for (const [communityId, decisionIds] of groups) {
      if (decisionIds.length < 2) continue;

      const contexts = new Set(decisionIds.map(id => {
        const attrs = g.getNodeAttributes(id);
        return attrs.spec?.context;
      }).filter(Boolean));

      if (contexts.size > 1) {
        insights.push({
          description: `decisions [${decisionIds.join(', ')}] cluster together but span contexts [${[...contexts].join(', ')}] — boundary misalignment?`,
          targets: decisionIds,
          data: { community: communityId, contexts: [...contexts] },
        });
      } else {
        insights.push({
          description: `decisions [${decisionIds.join(', ')}] cluster together within context "${[...contexts][0]}" — good alignment`,
          targets: decisionIds,
          data: { community: communityId, contexts: [...contexts] },
        });
      }
    }
    return insights;
  } catch {
    return [];
  }
}

// ============================================================
// Flow
// ============================================================

export function analyzeCriticalPath(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const g = chainSubgraph(graph);
  const insights: AnalysisInsight[] = [];

  const externals = nodesOfType(toGraphology(graph), 'signal').filter(s => s.attrs.origin === 'external');
  const triggersFrom = new Set(edgesOfType(toGraphology(graph), 'triggers').map(e => e.source));
  const terminals = nodesOfType(toGraphology(graph), 'signal').filter(s => !triggersFrom.has(s.id) && s.attrs.origin === 'internal');

  for (const ext of externals) {
    for (const term of terminals) {
      if (!g.hasNode(ext.id) || !g.hasNode(term.id)) continue;
      try {
        const path = bidirectional(g, ext.id, term.id);
        if (path) {
          insights.push({
            description: `path "${ext.attrs.kind}" → "${term.attrs.kind}": ${path.length - 1} hops [${path.join(' → ')}]`,
            targets: path,
            data: { from: ext.attrs.kind, to: term.attrs.kind, hops: path.length - 1, path },
          });
        }
      } catch {
        // No path exists
      }
    }
  }

  return insights;
}

export function analyzeDependencyDepth(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const g = chainSubgraph(graph);
  const insights: AnalysisInsight[] = [];

  // Find max depth via BFS from each root (node with no incoming edges)
  let maxDepth = 0;
  let deepestPath: string[] = [];

  g.forEachNode((node) => {
    if (g.inDegree(node) === 0) {
      let depth = 0;
      let lastNode = node;
      bfsFromNode(g, node, (_n, _attrs, d) => {
        if (d > depth) {
          depth = d;
          lastNode = _n;
        }
      });
      if (depth > maxDepth) {
        maxDepth = depth;
        deepestPath = [node, `... (${depth} hops) ...`, lastNode];
      }
    }
  });

  if (maxDepth > 0) {
    insights.push({
      description: `maximum cascade depth: ${maxDepth} hops`,
      targets: deepestPath,
      data: { maxDepth },
    });
  }

  return insights;
}

export function analyzeTemporalOrdering(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const g = chainSubgraph(graph);

  // Topological sort via Kahn's algorithm
  const inDegree = new Map<string, number>();
  g.forEachNode((node) => inDegree.set(node, g.inDegree(node)));

  const queue: string[] = [];
  for (const [node, deg] of inDegree) {
    if (deg === 0) queue.push(node);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    g.forEachOutNeighbor(node, (neighbor) => {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    });
  }

  // Filter to decisions only
  const decisionOrder = order.filter(id => {
    const attrs = g.getNodeAttributes(id);
    return attrs.type === 'policy' || attrs.type === 'operation';
  });

  if (decisionOrder.length > 0) {
    return [{
      description: `implementation order: ${decisionOrder.join(' → ')}`,
      targets: decisionOrder,
      data: { order: decisionOrder },
    }];
  }

  return [];
}

export function analyzeStronglyConnectedComponents(graph: DecisionGraph, _system: System): AnalysisInsight[] {
  const g = chainSubgraph(graph);
  const sccs = stronglyConnectedComponents(g);
  const insights: AnalysisInsight[] = [];

  // Only report SCCs with more than 1 node (actual loops)
  for (const scc of sccs) {
    if (scc.length > 1) {
      insights.push({
        description: `feedback loop: [${scc.join(', ')}]`,
        targets: scc,
        data: { size: scc.length, members: scc },
      });
    }
  }

  return insights;
}
