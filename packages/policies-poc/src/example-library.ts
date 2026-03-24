/**
 * Example: Public Library Book Lending
 *
 * Now with execution contexts — decisions declare where they happen,
 * and integration points are discovered where chains cross boundaries.
 */

import type {
  Policy, Operation, ExecutionContext, Actor, ProcessDefinition,
} from './index.js';
import { buildSystem, deriveView, deriveActorResponsibilities } from './index.js';
import { deriveGraph, externalSignals, terminalSignals, nodesByContext, processSubgraph } from './graph.js';

// ============================================================
// Execution Contexts
// ============================================================

const libraryDesk: ExecutionContext = {
  type: 'institutional',
  id: 'library-desk',
  description: 'Front desk where librarians serve members',
  kind: 'role-authority',
};

const lms: ExecutionContext = {
  type: 'software',
  id: 'lms',
  description: 'Library Management System — core lending platform',
  boundary: 'internal',
};

const billingService: ExecutionContext = {
  type: 'software',
  id: 'billing-service',
  description: 'External billing and payments service',
  boundary: 'external',
};

// ============================================================
// Policies (outcome → intent)
// ============================================================

const lendingPolicy: Policy = {
  id: 'lending-policy',
  description: 'When a book is requested, attempt to lend it',
  businessGoal: 'members can borrow books from the library',
  context: 'library-desk',
  activatedBy: ['book.requested'],
  preconditions: [
    { id: 'book-exists', description: 'The requested book must exist in the catalog', reads: ['book.exists'] },
    { id: 'member-exists', description: 'The requesting member must exist', reads: ['member.exists'] },
  ],
  emits: 'lend.book',
  actor: 'librarian',
  processes: ['lending'],
};

const lateFeePolicy: Policy = {
  id: 'late-fee-policy',
  description: 'When a book is returned late, apply a late fee',
  businessGoal: 'overdue accounts are charged appropriately',
  context: 'lms',
  actor: 'catalog-bot',
  activatedBy: ['book.returned'],
  preconditions: [
    { id: 'loan-is-overdue', description: 'The loan must be past its due date', reads: ['loan.due.date', 'loan.returned.date'] },
  ],
  emits: 'apply.late.fee',
  processes: ['late-fee-collection'],
};

// ============================================================
// Operations (intent → outcome)
// ============================================================

const lendOperation: Operation = {
  id: 'lend-operation',
  description: 'Lend a book to a member',
  context: 'lms',
  activatedBy: ['lend.book'],
  constraints: [
    { id: 'book-available', description: 'Book must be available for lending', reads: ['book.available'] },
    { id: 'member-not-suspended', description: 'Member must not be suspended', reads: ['member.suspended'] },
    { id: 'under-loan-limit', description: 'Member must not have exceeded their loan limit', reads: ['member.active.loans', 'member.max.loans'] },
  ],
  unconditionalOutcome: {
    kind: 'book.lent',
    description: 'The book has been lent to the member',
    effects: [
      { point: 'book.available', description: 'Set to false' },
      { point: 'member.active.loans', description: 'Incremented by 1' },
      { point: 'loan.due.date', description: 'Set to 14 days from now' },
    ],
  },
  conditionalOutcomes: [{
    condition: { description: 'Member has reached their loan limit after this loan', reads: ['member.active.loans', 'member.max.loans'] },
    outcome: { kind: 'member.loan.limit.reached', description: 'Member has hit their borrowing limit', effects: [] },
  }],
  actor: 'lending-engine',
  processes: ['lending'],
};

const lateFeeOperation: Operation = {
  id: 'late-fee-operation',
  description: 'Apply a late fee to a member',
  context: 'billing-service',
  actor: 'fee-engine',
  activatedBy: ['apply.late.fee'],
  constraints: [],
  unconditionalOutcome: {
    kind: 'late.fee.applied',
    description: 'A late fee has been charged',
    effects: [{ point: 'member.balance', description: 'Debited by fee amount' }],
  },
  conditionalOutcomes: [],
  processes: ['late-fee-collection'],
};

// ============================================================
// Actors & Assignments
// ============================================================

const librarian: Actor = { type: 'human', id: 'librarian', role: 'Librarian' };
const catalogBot: Actor = { type: 'llm', id: 'catalog-bot', description: 'AI assistant for catalog operations' };
const lendingEngine: Actor = { type: 'machine', id: 'lending-engine', description: 'Deterministic lending transaction processor' };
const feeEngine: Actor = { type: 'machine', id: 'fee-engine', description: 'Deterministic fee calculation engine' };

// ============================================================
// Processes
// ============================================================

const lendingProcess: ProcessDefinition = {
  id: 'lending',
  description: 'A member requests a book and it is lent to them',
  startsWith: ['book.requested'],
  endsWith: ['book.lent', 'member.loan.limit.reached'],
};

const lateFeeProcess: ProcessDefinition = {
  id: 'late-fee-collection',
  description: 'A book is returned late and a fee is applied',
  startsWith: ['book.returned'],
  endsWith: ['late.fee.applied'],
};

// ============================================================
// Build & inspect
// ============================================================

const contexts = [libraryDesk, lms, billingService];
const policies = [lendingPolicy, lateFeePolicy];
const operations = [lendOperation, lateFeeOperation];
const actors = [librarian, catalogBot, lendingEngine, feeEngine];
const processes = [lendingProcess, lateFeeProcess];

const system = buildSystem({ contexts, policies, operations, actors, processes });

console.log('=== Discovered Info Points ===\n');
for (const ip of system.infoPoints) {
  console.log(`  ${ip.name}`);
  console.log(`    ${ip.description}\n`);
}

console.log('=== Derived Views ===\n');
for (const policy of policies) {
  const view = deriveView(policy);
  console.log(`  ${policy.id} (${policy.context}) needs: [${view.infoPoints.join(', ')}]`);
}

console.log('\n=== Actor Responsibilities ===\n');
const responsibilities = deriveActorResponsibilities(system);
for (const r of responsibilities) {
  const label = r.actor.type === 'human' ? (r.actor as any).role : (r.actor as any).description;
  console.log(`  ${r.actor.id} (${r.actor.type}) — ${label}`);
  if (r.policies.length > 0) console.log(`    policies:   [${r.policies.join(', ')}]`);
  if (r.operations.length > 0) console.log(`    operations: [${r.operations.join(', ')}]`);
  if (r.reads.length > 0) console.log(`    reads:      [${r.reads.join(', ')}]`);
  console.log();
}

console.log('=== Integration Points ===\n');
for (const ip of system.integrationPoints) {
  console.log(`  ${ip.from.contextId} → ${ip.to.contextId}`);
  console.log(`    via: ${ip.via}`);
  console.log(`    ${ip.from.decisionId} → ${ip.to.decisionId}\n`);
}

console.log('=== Spec Lint ===\n');
import { specLintRules } from './spec-linting-rules.js';
const specViolations = Object.values(specLintRules).flatMap(rule => {
  const decisions = [...system.policies, ...system.operations];
  return decisions.flatMap(d => {
    if (rule.applies === 'policy' && !('emits' in d)) return [];
    if (rule.applies === 'operation' && !('unconditionalOutcome' in d)) return [];
    return rule.check(d);
  });
});
if (specViolations.length === 0) {
  console.log('  No spec violations.\n');
} else {
  for (const v of specViolations) {
    const icon = v.level === 'error' ? 'ERR' : v.level === 'warning' ? 'WRN' : 'INF';
    console.log(`  [${icon}] ${v.ruleId} @ ${v.target}: ${v.message}`);
  }
  console.log();
}

console.log('=== System Lint ===\n');
import { systemLintRules } from './system-linting-rules.js';
const sysViolations = Object.values(systemLintRules).flatMap(rule => rule.check(system));
if (sysViolations.length === 0) {
  console.log('  No system violations.\n');
} else {
  for (const v of sysViolations) {
    const icon = v.level === 'error' ? 'ERR' : v.level === 'warning' ? 'WRN' : 'INF';
    console.log(`  [${icon}] ${v.ruleId} @ ${v.target}: ${v.message}`);
  }
  console.log();
}

console.log('=== Decision Graph ===\n');
const graph = deriveGraph(system);

const byType = { signal: 0, policy: 0, operation: 0, view: 0 };
for (const n of graph.nodes) byType[n.type]++;
console.log(`  Nodes: ${graph.nodes.length} (${byType.signal} signals, ${byType.policy} policies, ${byType.operation} operations, ${byType.view} views)`);
console.log(`  Edges: ${graph.edges.length}\n`);

console.log('  Nodes:');
for (const n of graph.nodes) {
  if (n.type === 'signal') {
    console.log(`    [${n.signalKind}] ${n.kind} (${n.origin})`);
  } else if (n.type === 'view') {
    console.log(`    [view] ${n.id} → [${n.infoPoints.join(', ')}]`);
  } else {
    console.log(`    [${n.type}] ${n.id} @ ${n.spec.context}`);
  }
}

console.log('\n  Edges:');
for (const e of graph.edges) {
  const label = e.type === 'emits' && e.conditional ? 'emits (conditional)' : e.type;
  console.log(`    ${e.from} --${label}--> ${e.to}`);
}

const ext = externalSignals(graph);
if (ext.length > 0) {
  console.log(`\n  External signals (entry points):`);
  for (const s of ext) console.log(`    ${s.kind} (${s.signalKind})`);
}

const term = terminalSignals(graph);
if (term.length > 0) {
  console.log(`\n  Terminal signals (exit points):`);
  for (const s of term) console.log(`    ${s.kind} (${s.signalKind})`);
}

console.log('\n  By context:');
const grouped = nodesByContext(graph, system);
for (const [ctxId, ctxNodes] of grouped) {
  if (ctxNodes.length === 0) continue;
  console.log(`    ${ctxId}: ${ctxNodes.map(n => n.id).join(', ')}`);
}

console.log('\n=== Graph Lint ===\n');
import { graphLintRules } from './graph-linting-rules.js';
const graphViolations = Object.values(graphLintRules).flatMap(rule => rule.check(graph, system));
if (graphViolations.length === 0) {
  console.log('  No violations found.\n');
} else {
  for (const v of graphViolations) {
    const icon = v.level === 'error' ? 'ERR' : v.level === 'warning' ? 'WRN' : 'INF';
    console.log(`  [${icon}] ${v.ruleId} @ ${v.target}`);
    console.log(`         ${v.message}\n`);
  }
  const ge = graphViolations.filter(v => v.level === 'error').length;
  const gw = graphViolations.filter(v => v.level === 'warning').length;
  const gi = graphViolations.filter(v => v.level === 'info').length;
  console.log(`  ${ge} errors, ${gw} warnings, ${gi} info`);
}

console.log('\n=== Graph Analysis ===\n');
import { graphAnalysisMap } from './graph-analysis-map.js';
for (const [id, analysis] of Object.entries(graphAnalysisMap)) {
  const results = analysis.analyze(graph, system);
  if (results.length > 0) {
    console.log(`  [${analysis.category}] ${id}:`);
    for (const r of results) {
      console.log(`    ${r.description}`);
    }
    console.log();
  }
}

console.log('=== Business View ===\n');
import { deriveBusinessView } from './business-view.js';
const businessItems = deriveBusinessView(graph, system);
for (const item of businessItems) {
  const badge = item.type === 'user-story' ? 'USER STORY' : 'AUTOMATION';
  console.log(`  [${badge}] ${item.formula}`);
  console.log(`    policy: ${item.policyId} → operation: ${item.operationId ?? 'none'}`);
  console.log(`    actor: ${item.actorId} (${item.actorType}) @ ${item.context}`);
  if (item.processes.length > 0) console.log(`    processes: [${item.processes.join(', ')}]`);
  if (item.view) console.log(`    view: [${item.view.infoPoints.join(', ')}]`);

  const ac = item.acceptanceCriteria;
  console.log(`    acceptance criteria:`);
  if (ac.given.length > 0) console.log(`      given: ${ac.given.map(g => g.description).join('; ')}`);
  console.log(`      when: ${ac.when}`);
  if (ac.then.length > 0) console.log(`      then: ${ac.then.map(t => t.kind + (t.conditional ? ` (if ${t.conditionDescription})` : '')).join('; ')}`);
  if (ac.shouldFailIf.length > 0) console.log(`      should fail if: ${ac.shouldFailIf.map(f => f.description).join('; ')}`);

  const dt = item.decisionTable;
  console.log(`    decision table: ${dt.rows.length} rows (${dt.preconditionColumns.length} preconditions, ${dt.constraintColumns.length} constraints)`);
  for (const row of dt.rows) {
    const icon = row.type === 'success' ? '+' : row.type === 'failure' ? 'x' : '-';
    console.log(`      [${icon}] ${row.description}${row.effects.length > 0 ? ' → ' + row.effects.join(', ') : ''}`);
  }
  console.log();
}

console.log('=== Process Views ===\n');
for (const proc of system.processes) {
  const sub = processSubgraph(graph, proc.id);
  const subDecisions = sub.nodes.filter(n => n.type === 'policy' || n.type === 'operation');
  const subSignals = sub.nodes.filter(n => n.type === 'signal');
  const subViews = sub.nodes.filter(n => n.type === 'view');
  console.log(`  ${proc.id}: ${proc.description}`);
  console.log(`    starts: [${proc.startsWith.join(', ')}] → ends: [${proc.endsWith.join(', ')}]`);
  console.log(`    decisions: [${subDecisions.map(n => n.id).join(', ')}]`);
  console.log(`    signals:   [${subSignals.map(n => n.id).join(', ')}]`);
  console.log(`    views:     [${subViews.map(n => n.id).join(', ')}]`);
  console.log(`    ${sub.nodes.length} nodes, ${sub.edges.length} edges\n`);
}

console.log('=== System Summary ===\n');
console.log(`  ${system.contexts.length} execution contexts`);
console.log(`  ${system.policies.length} policies`);
console.log(`  ${system.operations.length} operations`);
console.log(`  ${system.actors.length} actors`);
console.log(`  ${system.infoPoints.length} info points discovered`);
console.log(`  ${system.views.length} views derived`);
console.log(`  ${system.integrationPoints.length} integration points discovered`);
const allViolations = [...specViolations, ...sysViolations, ...graphViolations];
console.log(`  ${allViolations.filter(v => v.level === 'error').length} errors, ${allViolations.filter(v => v.level === 'warning').length} warnings, ${allViolations.filter(v => v.level === 'info').length} info`);
