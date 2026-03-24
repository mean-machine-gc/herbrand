/**
 * Adapter: DecisionGraph → graphology Graph
 *
 * Converts our typed DecisionGraph into a graphology instance
 * that can be fed to the full graphology algorithm library.
 */

import Graph from 'graphology';
import type { DecisionGraph, GraphNode, GraphEdge } from './graph.js';

export function toGraphology(dg: DecisionGraph): Graph {
  const g = new Graph({ type: 'directed', multi: true });

  for (const node of dg.nodes) {
    g.addNode(node.id, { ...node });
  }

  for (const edge of dg.edges) {
    g.addEdge(edge.from, edge.to, { ...edge });
  }

  return g;
}

/** Get all nodes of a specific type */
export function nodesOfType<T extends GraphNode['type']>(
  g: Graph,
  type: T,
): { id: string; attrs: Extract<GraphNode, { type: T }> }[] {
  const results: { id: string; attrs: Extract<GraphNode, { type: T }> }[] = [];
  g.forEachNode((id, attrs) => {
    if (attrs.type === type) {
      results.push({ id, attrs: attrs as Extract<GraphNode, { type: T }> });
    }
  });
  return results;
}

/** Get all edges of a specific type */
export function edgesOfType<T extends GraphEdge['type']>(
  g: Graph,
  type: T,
): { id: string; attrs: Extract<GraphEdge, { type: T }>; source: string; target: string }[] {
  const results: { id: string; attrs: Extract<GraphEdge, { type: T }>; source: string; target: string }[] = [];
  g.forEachEdge((id, attrs, source, target) => {
    if (attrs.type === type) {
      results.push({ id, attrs: attrs as Extract<GraphEdge, { type: T }>, source, target });
    }
  });
  return results;
}
