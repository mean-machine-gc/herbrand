/**
 * Load the example YAML files via the store — full reactive pipeline.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { HerbrandStore, type StoreFile } from './store.js';
import { specLintRules } from './lint/spec-linting-rules.js';
import { systemLintRules } from './lint/system-linting-rules.js';
import { graphLintRules } from './lint/graph-linting-rules.js';
import { graphAnalysisMap } from './graph/graph-analysis-map.js';

const exampleDir = resolve(process.cwd(), 'example');

// ── Collect all YAML files ──────────────────────────────────

function collectFiles(dir: string, base: string): StoreFile[] {
  const files: StoreFile[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = join(base, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, rel));
    } else if (entry.endsWith('.yaml')) {
      files.push({ path: rel, content: readFileSync(full, 'utf-8') });
    }
  }
  return files;
}

const files = collectFiles(exampleDir, '');
console.log(`Loaded ${files.length} files:\n  ${files.map(f => f.path).join('\n  ')}\n`);

// ── Feed the store ──────────────────────────────────────────

const store = new HerbrandStore({
  specLintRules,
  systemLintRules,
  graphLintRules,
  graphAnalysisMap,
});
store.setFiles(files);

// ── Report ──────────────────────────────────────────────────

console.log(`Pipeline status: ${store.pipelineStatus}\n`);

if (store.validationResults.length > 0) {
  console.log('=== Validation ===\n');
  for (const v of store.validationResults) {
    console.log(`  [ERR] ${v.ruleId} @ ${v.target}: ${v.message}`);
  }
  console.log();
}

const system = store.system;
if (system) {
  console.log('=== System ===\n');
  console.log(`  ${system.contexts.length} contexts, ${system.policies.length} policies, ${system.operations.length} operations`);
  console.log(`  ${system.actors.length} actors, ${system.processes.length} processes`);
  console.log(`  ${system.infoPoints.length} info points, ${system.views.length} views, ${system.integrationPoints.length} integration points\n`);
}

if (store.specLintResults.length > 0) {
  console.log('=== Spec Lint ===\n');
  for (const v of store.specLintResults) {
    const icon = v.level === 'error' ? 'ERR' : v.level === 'warning' ? 'WRN' : 'INF';
    console.log(`  [${icon}] ${v.ruleId} @ ${v.target}: ${v.message}`);
  }
  console.log();
}

if (store.systemLintResults.length > 0) {
  console.log('=== System Lint ===\n');
  for (const v of store.systemLintResults) {
    const icon = v.level === 'error' ? 'ERR' : v.level === 'warning' ? 'WRN' : 'INF';
    console.log(`  [${icon}] ${v.ruleId} @ ${v.target}: ${v.message}`);
  }
  console.log();
}

const graph = store.graph;
if (graph) {
  console.log('=== Decision Graph ===\n');
  console.log(`  ${graph.nodes.length} nodes, ${graph.edges.length} edges\n`);
}

if (store.graphLintResults.length > 0) {
  console.log('=== Graph Lint ===\n');
  for (const v of store.graphLintResults) {
    const icon = v.level === 'error' ? 'ERR' : v.level === 'warning' ? 'WRN' : 'INF';
    console.log(`  [${icon}] ${v.ruleId} @ ${v.target}: ${v.message}`);
  }
  console.log();
}

const analysis = store.graphAnalysisResults;
if (analysis) {
  console.log('=== Graph Analysis ===\n');
  for (const [id, insights] of Object.entries(analysis)) {
    console.log(`  ${id}:`);
    for (const r of insights) console.log(`    ${r.description}`);
    console.log();
  }
}

const bv = store.businessView;
if (bv.length > 0) {
  console.log('=== Business View ===\n');
  for (const item of bv) {
    const badge = item.type === 'user-story' ? 'USER STORY' : 'AUTOMATION';
    console.log(`  [${badge}] ${item.formula}`);
    console.log(`    ${item.policyId} → ${item.operationId ?? 'none'} | ${item.actorId} (${item.actorType}) @ ${item.context}`);
    console.log(`    decision table: ${item.decisionTable.rows.length} rows\n`);
  }
}

const all = store.allViolations;
const errors = all.filter(v => v.level === 'error').length;
const warnings = all.filter(v => v.level === 'warning').length;
const infos = all.filter(v => v.level === 'info').length;
console.log(`=== Summary: ${errors} errors, ${warnings} warnings, ${infos} info ===`);
