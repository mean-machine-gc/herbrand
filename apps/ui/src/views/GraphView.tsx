import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { computeLayout } from '../layout';
import { CustomNode } from '../CustomNode';
import { SwimlaneNode } from '../SwimlaneNode';
import { useStore } from '../lib/useStore';
import { useTheme } from '../lib/theme';
import type { LintViolation } from '@herbrand/core/lint/types';
import { processSubgraph } from '@herbrand/core/graph';
import { ChevronUp, PanelRightOpen, PanelRightClose } from 'lucide-react';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  swimlane: SwimlaneNode,
};

export function GraphView() {
  const store = useStore();
  const { theme } = useTheme();
  const [showSideEffects, setShowSideEffects] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showLintDrawer, setShowLintDrawer] = useState(false);
  const [activeProcess, setActiveProcess] = useState<string | null>(null);

  const system = store.system;
  const fullGraph = store.graph;
  const processes = system?.processes ?? [];
  const graphLintResults = store.graphLintResults;
  const analysisResults = store.graphAnalysisResults;

  // Get the right graph — full or process-scoped
  const graph = useMemo(() => {
    if (!fullGraph) return null;
    if (!activeProcess) return fullGraph;
    return processSubgraph(fullGraph, activeProcess);
  }, [fullGraph, activeProcess]);

  // Compute layout from store data
  const layoutResult = useMemo(() => {
    if (!graph || !system) return null;
    return computeLayout({
      graph,
      actors: system.actors,
      contexts: system.contexts,
    });
  }, [graph, system]);

  const nodes = layoutResult?.nodes ?? [];
  const chainEdges = layoutResult?.chainEdges ?? [];
  const updatesEdges = layoutResult?.updatesEdges ?? [];

  const edges: Edge[] = useMemo(
    () => showSideEffects ? [...chainEdges, ...updatesEdges] : chainEdges,
    [chainEdges, updatesEdges, showSideEffects],
  );

  const toggleSideEffects = useCallback(() => setShowSideEffects(v => !v), []);

  if (!system || !graph) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-sm text-muted-foreground">
          {store.pipelineStatus === 'empty' ? 'No files loaded' : `Graph not available: ${store.pipelineStatus}`}
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Top toolbar */}
      <div className="border-b border-border px-4 py-2 shrink-0 flex items-center gap-3">

        {/* Process pills */}
        {processes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Process:</span>
            <ProcessPill label="All" active={activeProcess === null} onClick={() => setActiveProcess(null)} />
            {processes.map(p => (
              <ProcessPill
                key={p.id}
                label={p.id}
                active={activeProcess === p.id}
                onClick={() => setActiveProcess(activeProcess === p.id ? null : p.id)}
              />
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Side effects toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={showSideEffects}
            onChange={toggleSideEffects}
            className="accent-[hsl(var(--h-outcome))] h-3.5 w-3.5 cursor-pointer"
          />
          side effects
        </label>

        <div className="w-px h-5 bg-border" />

        {/* Analysis toggle */}
        <button
          onClick={() => setShowAnalysis(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            showAnalysis ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          {showAnalysis ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          Analysis
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Graph panel */}
        <div style={{ flex: showAnalysis ? 1 : 2, minHeight: 0, position: 'relative', transition: 'flex 0.2s ease' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            colorMode={theme}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} style={{ backgroundColor: 'hsl(var(--background))' }} />
            <Controls showInteractive={false} />
          </ReactFlow>

          {/* Lint drawer toggle */}
          {graphLintResults.length > 0 && (
            <button
              onClick={() => setShowLintDrawer(v => !v)}
              className="absolute bottom-3 left-3 z-10 flex items-center gap-2 bg-card border border-border rounded-md px-3 py-1.5 shadow-sm cursor-pointer hover:bg-accent transition-colors"
            >
              <LintCounts violations={graphLintResults} />
              <ChevronUp className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showLintDrawer ? '' : 'rotate-180'}`} />
            </button>
          )}

          {/* Lint drawer */}
          {showLintDrawer && graphLintResults.length > 0 && (
            <div className="absolute bottom-12 left-3 right-3 z-10 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto p-3 space-y-1">
              {graphLintResults.map((v, i) => (
                <div key={i} className={`text-xs px-3 py-1.5 rounded flex items-start gap-2 ${
                  v.level === 'error' ? 'bg-red-500/10 text-red-400' :
                  v.level === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  <span className="font-mono shrink-0 uppercase w-6">{v.level === 'error' ? 'err' : v.level === 'warning' ? 'wrn' : 'inf'}</span>
                  <span className="text-foreground/50 font-mono shrink-0">{v.ruleId}</span>
                  <span className="text-foreground/70 font-medium shrink-0">{v.target}</span>
                  <span>{v.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analysis panel */}
        {showAnalysis && (
          <div className="basis-1/2 border-l border-border overflow-y-auto p-5" style={{ minWidth: 0 }}>
            {!analysisResults || Object.keys(analysisResults).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-12">
                {store.hasGraphErrors ? 'Graph has errors — analysis not available' : 'No analysis results'}
              </div>
            ) : (
              <AnalysisPanel results={analysisResults} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Analysis Panel ──────────────────────────────────────────

type AnalysisInsight = { description: string; targets: string[]; data?: Record<string, unknown> };

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  'boundaries': { label: 'Boundaries', color: 'text-amber-400', icon: '◇' },
  'coupling': { label: 'Coupling', color: 'text-red-400', icon: '⇄' },
  'impact': { label: 'Impact', color: 'text-orange-400', icon: '◉' },
  'clustering': { label: 'Clustering', color: 'text-violet-400', icon: '⬡' },
  'flow': { label: 'Flow', color: 'text-sky-400', icon: '→' },
};

function AnalysisPanel({ results }: { results: Record<string, AnalysisInsight[]> }) {
  const grouped = new Map<string, { id: string; insights: AnalysisInsight[] }[]>();

  for (const [id, insights] of Object.entries(results)) {
    let category = 'other';
    if (id.includes('context') || id.includes('isolation')) category = 'boundaries';
    else if (id.includes('coupling')) category = 'coupling';
    else if (id.includes('impact') || id.includes('bottleneck') || id.includes('blast') || id.includes('hotspot')) category = 'impact';
    else if (id.includes('clustering')) category = 'clustering';
    else if (id.includes('path') || id.includes('depth') || id.includes('ordering') || id.includes('component')) category = 'flow';

    const list = grouped.get(category) ?? [];
    list.push({ id, insights });
    grouped.set(category, list);
  }

  const categories = ['boundaries', 'impact', 'flow', 'clustering', 'coupling', 'other'];

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-5">Graph Analysis</h2>

      {categories.map(cat => {
        const analyses = grouped.get(cat);
        if (!analyses || analyses.length === 0) return null;
        const meta = CATEGORY_META[cat] ?? { label: cat, color: 'text-muted-foreground', icon: '•' };

        return (
          <div key={cat} className="mb-7">
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${meta.color}`}>
              <span>{meta.icon}</span>
              {meta.label}
            </h3>

            {analyses.map(({ id, insights }) => (
              <div key={id} className="mb-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  {id.replace('analysis/', '')}
                </h4>
                <div className="space-y-2">
                  {insights.map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function InsightCard({ insight }: { insight: AnalysisInsight }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <p className="text-sm text-foreground/90 leading-relaxed">{insight.description}</p>
      {insight.targets.length > 0 && insight.targets.length <= 8 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {insight.targets.map(t => (
            <span key={t} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}
      {insight.data && Object.keys(insight.data).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {Object.entries(insight.data).map(([key, value]) => {
            if (typeof value === 'number') {
              return (
                <span key={key} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{formatNumber(value)}</span> {key}
                </span>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
}

// ── Shared sub-components ───────────────────────────────────

function ProcessPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );
}

function LintCounts({ violations }: { violations: LintViolation[] }) {
  const errors = violations.filter(v => v.level === 'error').length;
  const warnings = violations.filter(v => v.level === 'warning').length;
  const infos = violations.filter(v => v.level === 'info').length;
  return (
    <span className="text-xs">
      {errors > 0 && <span className="text-red-500 font-medium">{errors} {errors === 1 ? 'error' : 'errors'} </span>}
      {warnings > 0 && <span className="text-yellow-500 font-medium">{warnings} {warnings === 1 ? 'warning' : 'warnings'} </span>}
      {infos > 0 && <span className="text-blue-400 font-medium">{infos} info</span>}
    </span>
  );
}
