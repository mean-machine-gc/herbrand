/**
 * Graph analysis map — declarative registry of all analyses.
 *
 * These are not defects — they are insights derived from a valid graph.
 * Each analysis produces structured AnalysisInsight[] results.
 *
 * Pipeline: spec-lint → system-lint → build graph → graph-lint → graph-analysis
 */

import type { GraphAnalysis } from './graph-analysis.js';
import {
  analyzeCrossContextIntegrationPoints,
  analyzeExecutionContextCohesion,
  analyzeExecutionContextIsolation,
  analyzeCrossContextDataCoupling,
  analyzeHighImpactSignals,
  analyzeContentionHotspots,
  analyzeBottleneckDetection,
  analyzeBlastRadius,
  analyzeInfoPointClustering,
  analyzeDecisionClustering,
  analyzeCriticalPath,
  analyzeDependencyDepth,
  analyzeTemporalOrdering,
  analyzeStronglyConnectedComponents,
} from './graph-analysis.js';

export const graphAnalysisMap: Record<string, GraphAnalysis> = {

  // ── Boundaries ─────────────────────────────────────────────

  'analysis/cross-context-integration-points': {
    id: 'analysis/cross-context-integration-points',
    description: 'Enumerate all edges crossing execution context boundaries — each is an integration point',
    category: 'boundaries',
    analyze: analyzeCrossContextIntegrationPoints,
  },

  'analysis/execution-context-cohesion': {
    id: 'analysis/execution-context-cohesion',
    description: 'Ratio of internal vs cross-boundary edges per execution context — low cohesion suggests misaligned boundaries',
    category: 'boundaries',
    analyze: analyzeExecutionContextCohesion,
  },

  'analysis/execution-context-isolation': {
    id: 'analysis/execution-context-isolation',
    description: 'Identify fully isolated execution contexts with no cross-boundary edges',
    category: 'boundaries',
    analyze: analyzeExecutionContextIsolation,
  },

  // ── Coupling ───────────────────────────────────────────────

  'analysis/cross-context-data-coupling': {
    id: 'analysis/cross-context-data-coupling',
    description: 'Outcomes that update views across execution context boundaries — shared state between contexts',
    category: 'coupling',
    analyze: analyzeCrossContextDataCoupling,
  },

  // ── Impact ─────────────────────────────────────────────────

  'analysis/high-impact-signals': {
    id: 'analysis/high-impact-signals',
    description: 'Signals that trigger many decisions — high fan-out events with broad system impact',
    category: 'impact',
    analyze: analyzeHighImpactSignals,
  },

  'analysis/contention-hotspots': {
    id: 'analysis/contention-hotspots',
    description: 'Views fed by many updates edges — potential contention points or consistency bottlenecks',
    category: 'impact',
    analyze: analyzeContentionHotspots,
  },

  'analysis/bottleneck-detection': {
    id: 'analysis/bottleneck-detection',
    description: 'Decisions that all paths flow through — single points of failure, high-risk refactoring targets',
    category: 'impact',
    analyze: analyzeBottleneckDetection,
  },

  'analysis/blast-radius': {
    id: 'analysis/blast-radius',
    description: 'Per-decision reachability count — if this breaks, how much of the system is affected?',
    category: 'impact',
    analyze: analyzeBlastRadius,
  },

  // ── Clustering ─────────────────────────────────────────────

  'analysis/info-point-clustering': {
    id: 'analysis/info-point-clustering',
    description: 'Groups of info points always read and written together — may suggest aggregate boundaries',
    category: 'clustering',
    analyze: analyzeInfoPointClustering,
  },

  'analysis/decision-clustering': {
    id: 'analysis/decision-clustering',
    description: 'Highly interconnected decision subgraphs sharing info points — may suggest bounded contexts',
    category: 'clustering',
    analyze: analyzeDecisionClustering,
  },

  // ── Flow ───────────────────────────────────────────────────

  'analysis/critical-path': {
    id: 'analysis/critical-path',
    description: 'Shortest and longest paths between external signals and terminal outcomes',
    category: 'flow',
    analyze: analyzeCriticalPath,
  },

  'analysis/dependency-depth': {
    id: 'analysis/dependency-depth',
    description: 'How deep the reactive cascade goes — complexity metric',
    category: 'flow',
    analyze: analyzeDependencyDepth,
  },

  'analysis/temporal-ordering': {
    id: 'analysis/temporal-ordering',
    description: 'Natural implementation order — topological sort of the chain subgraph',
    category: 'flow',
    analyze: analyzeTemporalOrdering,
  },

  'analysis/strongly-connected-components': {
    id: 'analysis/strongly-connected-components',
    description: 'All feedback loops in the system enumerated',
    category: 'flow',
    analyze: analyzeStronglyConnectedComponents,
  },
};
