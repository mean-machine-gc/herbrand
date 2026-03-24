/**
 * Reactive signal store for the Herbrand policies-poc pipeline.
 *
 * Input: raw YAML files via setFiles()
 * Dependencies: rule sets and analysis map injected via constructor.
 *
 * Pipeline:
 *   files (input)
 *     → parse YAML + Zod validation
 *     → build system (null if validation errors)
 *     → spec lint (per-decision validation)
 *     → system lint (cross-decision, gates graph)
 *     → derive graph (null if system lint errors)
 *     → graph lint (gates analysis)
 *     → graph analysis (null if graph lint errors)
 *     → business view
 *
 * Scoped views (by actor, context, process) are imperative helpers.
 */

import { signal, computed } from '@preact/signals-core';
import { parse as parseYaml } from 'yaml';
import type { Policy, Operation, System } from './index.js';
import { buildSystem } from './index.js';
import { SystemFileSchema, DecisionSchema } from './schemas.js';
import type { DecisionGraph } from './graph.js';
import { deriveGraph, processSubgraph } from './graph.js';
import type { BusinessViewItem } from './business-view.js';
import { deriveBusinessView } from './business-view.js';
import type { LintViolation, SpecLintRule, SystemLintRule, GraphLintRule } from './lint-types.js';
import type { AnalysisInsight, GraphAnalysis } from './graph-analysis.js';
import { deriveSystemSummary, type SystemSummary } from './system-summary.js';

// ============================================================
// Types
// ============================================================

export type StoreFile = {
  readonly path: string;
  readonly content: string;
};

export type StoreConfig = {
  readonly specLintRules: Record<string, SpecLintRule>;
  readonly systemLintRules: Record<string, SystemLintRule>;
  readonly graphLintRules: Record<string, GraphLintRule>;
  readonly graphAnalysisMap: Record<string, GraphAnalysis>;
};

// ============================================================
// Store
// ============================================================

export class HerbrandStore {

  private specRules: Record<string, SpecLintRule>;
  private systemRules: Record<string, SystemLintRule>;
  private graphRules: Record<string, GraphLintRule>;
  private analysisMap: Record<string, GraphAnalysis>;

  constructor(config: StoreConfig) {
    this.specRules = config.specLintRules;
    this.systemRules = config.systemLintRules;
    this.graphRules = config.graphLintRules;
    this.analysisMap = config.graphAnalysisMap;
  }

  // ── Root signal ───────────────────────────────────────────

  private _files = signal<StoreFile[]>([]);

  // ── YAML parse + Zod validation ───────────────────────────

  private _validationResults = computed(() => {
    const files = this._files.value;
    const violations: LintViolation[] = [];
    let systemData: { contexts: any[]; actors: any[]; processes?: any[] } | null = null;
    const policies: Policy[] = [];
    const operations: Operation[] = [];

    if (files.length === 0) return { violations, systemData, policies, operations };

    const systemFile = files.find(f => f.path.endsWith('/system.yaml') || f.path === 'system.yaml');
    const decisionFiles = files.filter(f => f !== systemFile && f.path.endsWith('.yaml'));

    if (!systemFile) {
      violations.push({ ruleId: 'schema/system-file-missing', level: 'error',
        target: 'system.yaml', message: 'system.yaml not found' });
    } else {
      try {
        const raw = parseYaml(systemFile.content);
        const parsed = SystemFileSchema.safeParse(raw);
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            violations.push({ ruleId: 'schema/system-file', level: 'error',
              target: `system.yaml:${issue.path.join('.')}`, message: issue.message });
          }
        } else {
          systemData = parsed.data;
        }
      } catch (e) {
        violations.push({ ruleId: 'schema/yaml-parse', level: 'error',
          target: 'system.yaml', message: `YAML parse error: ${e instanceof Error ? e.message : String(e)}` });
      }
    }

    for (const file of decisionFiles) {
      try {
        const raw = parseYaml(file.content);
        const parsed = DecisionSchema.safeParse(raw);

        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            violations.push({ ruleId: 'schema/decision-file', level: 'error',
              target: `${file.path}:${issue.path.join('.')}`, message: issue.message });
          }
          continue;
        }

        if (parsed.data.type === 'policy') {
          const { type: _, ...policy } = parsed.data;
          policies.push(policy);
        } else {
          const { type: _, ...operation } = parsed.data;
          operations.push(operation);
        }
      } catch (e) {
        violations.push({ ruleId: 'schema/yaml-parse', level: 'error',
          target: file.path, message: `YAML parse error: ${e instanceof Error ? e.message : String(e)}` });
      }
    }

    return { violations, systemData, policies, operations };
  });

  // ── System (null if validation errors) ────────────────────

  private _system = computed<System | null>(() => {
    const { violations, systemData, policies, operations } = this._validationResults.value;
    if (violations.some(v => v.level === 'error')) return null;
    if (!systemData) return null;
    if (policies.length === 0 && operations.length === 0) return null;

    return buildSystem({
      ...systemData,
      policies,
      operations,
    });
  });

  // ── Spec lint (per-decision) ──────────────────────────────

  private _specLintResults = computed<LintViolation[]>(() => {
    const system = this._system.value;
    if (!system) return [];

    const decisions: (Policy | Operation)[] = [...system.policies, ...system.operations];
    const violations: LintViolation[] = [];
    for (const rule of Object.values(this.specRules)) {
      for (const decision of decisions) {
        if (rule.applies === 'policy' && !('emits' in decision)) continue;
        if (rule.applies === 'operation' && !('unconditionalOutcome' in decision)) continue;
        violations.push(...rule.check(decision));
      }
    }
    return violations;
  });

  // ── System lint (cross-decision, gates graph) ─────────────

  private _systemLintResults = computed<LintViolation[]>(() => {
    const system = this._system.value;
    if (!system) return [];

    const violations: LintViolation[] = [];
    for (const rule of Object.values(this.systemRules)) {
      violations.push(...rule.check(system));
    }
    return violations;
  });

  // ── Graph (null if spec or system errors) ─────────────────

  private _graph = computed<DecisionGraph | null>(() => {
    const system = this._system.value;
    if (!system) return null;
    if (this._specLintResults.value.some(v => v.level === 'error')) return null;
    if (this._systemLintResults.value.some(v => v.level === 'error')) return null;
    return deriveGraph(system);
  });

  // ── Graph lint (gates analysis) ───────────────────────────

  private _graphLintResults = computed<LintViolation[]>(() => {
    const graph = this._graph.value;
    const system = this._system.value;
    if (!graph || !system) return [];

    const violations: LintViolation[] = [];
    for (const rule of Object.values(this.graphRules)) {
      violations.push(...rule.check(graph, system));
    }
    return violations;
  });

  // ── Graph analysis (null if graph lint errors) ────────────

  private _graphAnalysisResults = computed<Record<string, AnalysisInsight[]> | null>(() => {
    const graph = this._graph.value;
    const system = this._system.value;
    if (!graph || !system) return null;
    if (this._graphLintResults.value.some(v => v.level === 'error')) return null;

    const results: Record<string, AnalysisInsight[]> = {};
    for (const [id, analysis] of Object.entries(this.analysisMap)) {
      const insights = analysis.analyze(graph, system);
      if (insights.length > 0) results[id] = insights;
    }
    return results;
  });

  // ── Business view (derived from graph + system) ───────────

  private _businessView = computed<BusinessViewItem[]>(() => {
    const graph = this._graph.value;
    const system = this._system.value;
    if (!graph || !system) return [];
    return deriveBusinessView(graph, system);
  });

  // ── Setter ────────────────────────────────────────────────

  setFiles(files: StoreFile[]) {
    this._files.value = files;
  }

  // ── Getters ───────────────────────────────────────────────

  get files(): StoreFile[] { return this._files.value; }
  get validationResults(): LintViolation[] { return this._validationResults.value.violations; }
  get system(): System | null { return this._system.value; }
  get specLintResults(): LintViolation[] { return this._specLintResults.value; }
  get systemLintResults(): LintViolation[] { return this._systemLintResults.value; }
  get graph(): DecisionGraph | null { return this._graph.value; }
  get graphLintResults(): LintViolation[] { return this._graphLintResults.value; }
  get graphAnalysisResults(): Record<string, AnalysisInsight[]> | null { return this._graphAnalysisResults.value; }
  get businessView(): BusinessViewItem[] { return this._businessView.value; }

  get hasValidationErrors(): boolean {
    return this._validationResults.value.violations.some(v => v.level === 'error');
  }

  get hasSpecErrors(): boolean {
    return this._specLintResults.value.some(v => v.level === 'error');
  }

  get hasSystemErrors(): boolean {
    return this._systemLintResults.value.some(v => v.level === 'error');
  }

  get hasGraphErrors(): boolean {
    return this._graphLintResults.value.some(v => v.level === 'error');
  }

  get allViolations(): LintViolation[] {
    return [
      ...this._validationResults.value.violations,
      ...this._specLintResults.value,
      ...this._systemLintResults.value,
      ...this._graphLintResults.value,
    ];
  }

  get pipelineStatus(): 'empty' | 'validation-errors' | 'spec-errors' | 'system-errors' | 'graph-errors' | 'clean' {
    if (this._files.value.length === 0) return 'empty';
    if (this.hasValidationErrors) return 'validation-errors';
    if (this.hasSpecErrors) return 'spec-errors';
    if (this.hasSystemErrors) return 'system-errors';
    if (this.hasGraphErrors) return 'graph-errors';
    return 'clean';
  }

  // ── System summary — birds-eye index for scoped requests ──

  get systemSummary(): SystemSummary | null {
    const system = this._system.value;
    if (!system) return null;
    return deriveSystemSummary(system, this._businessView.value, this.allViolations, this.pipelineStatus);
  }

  // ── Scoped views — imperative helpers ─────────────────────

  processView(processId: string): DecisionGraph | null {
    const graph = this._graph.value;
    if (!graph) return null;
    return processSubgraph(graph, processId);
  }

  actorView(actorId: string): { policies: Policy[]; operations: Operation[] } {
    const system = this._system.value;
    if (!system) return { policies: [], operations: [] };

    return {
      policies: system.policies.filter(p => p.actor === actorId),
      operations: system.operations.filter(o => o.actor === actorId),
    };
  }

  contextView(contextId: string): { policies: Policy[]; operations: Operation[] } {
    const system = this._system.value;
    if (!system) return { policies: [], operations: [] };

    return {
      policies: system.policies.filter(p => p.context === contextId),
      operations: system.operations.filter(o => o.context === contextId),
    };
  }

  processOverview(): { id: string; description: string; nodes: number; edges: number }[] {
    const graph = this._graph.value;
    const system = this._system.value;
    if (!graph || !system) return [];

    return system.processes.map(proc => {
      const sub = processSubgraph(graph, proc.id);
      return { id: proc.id, description: proc.description, nodes: sub.nodes.length, edges: sub.edges.length };
    });
  }

  // ── Raw signals ───────────────────────────────────────────

  get signals() {
    return {
      files: this._files,
      validationResults: this._validationResults,
      system: this._system,
      specLintResults: this._specLintResults,
      systemLintResults: this._systemLintResults,
      graph: this._graph,
      graphLintResults: this._graphLintResults,
      graphAnalysisResults: this._graphAnalysisResults,
      businessView: this._businessView,
    };
  }
}
