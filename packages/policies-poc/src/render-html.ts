/**
 * Renders the library system as a self-contained HTML view.
 */

import type { Policy, Operation, Actor, ExecutionContext, SystemSpec } from './index.js';
import { buildSystem, deriveView, deriveActorResponsibilities } from './index.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Example data (same as example-library.ts) ──────────────

const libraryDesk: ExecutionContext = {
  type: 'institutional', id: 'library-desk',
  description: 'Front desk where librarians serve members', kind: 'role-authority',
};
const lms: ExecutionContext = {
  type: 'software', id: 'lms',
  description: 'Library Management System — core lending platform', boundary: 'internal',
};
const billingService: ExecutionContext = {
  type: 'software', id: 'billing-service',
  description: 'External billing and payments service', boundary: 'external',
};

const lendingPolicy: Policy = {
  id: 'lending-policy',
  description: 'When a book is requested, attempt to lend it',
  context: 'library-desk',
  activatedBy: ['book.requested'],
  preconditions: [
    { id: 'book-exists', description: 'The requested book must exist in the catalog', reads: ['book.exists'] },
    { id: 'member-exists', description: 'The requesting member must exist', reads: ['member.exists'] },
  ],
  emits: 'lend.book',
  actor: 'librarian',
};

const lateFeePolicy: Policy = {
  id: 'late-fee-policy',
  description: 'When a book is returned late, apply a late fee',
  context: 'lms',
  actor: 'catalog-bot',
  activatedBy: ['book.returned'],
  preconditions: [
    { id: 'loan-is-overdue', description: 'The loan must be past its due date', reads: ['loan.due.date', 'loan.returned.date'] },
  ],
  emits: 'apply.late.fee',
};

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
};

const librarian: Actor = { type: 'human', id: 'librarian', role: 'Librarian' };
const catalogBot: Actor = { type: 'llm', id: 'catalog-bot', description: 'AI assistant for catalog operations' };
const lendingEngine: Actor = { type: 'machine', id: 'lending-engine', description: 'Deterministic lending transaction processor' };
const feeEngine: Actor = { type: 'machine', id: 'fee-engine', description: 'Deterministic fee calculation engine' };

const spec: SystemSpec = {
  contexts: [libraryDesk, lms, billingService],
  policies: [lendingPolicy, lateFeePolicy],
  operations: [lendOperation, lateFeeOperation],
  actors: [librarian, catalogBot, lendingEngine, feeEngine],
};

// ── Build & render ──────────────────────────────────────────

const system = buildSystem(spec);
const responsibilities = deriveActorResponsibilities(system);

function actorLabel(a: Actor) {
  return a.type === 'human' ? a.role : a.description;
}

function actorBadge(a: Actor) {
  const cls = `actor-badge actor-${a.type}`;
  const icon = a.type === 'human' ? '&#9823;' : a.type === 'llm' ? '&#9881;' : '&#9881;';
  return `<span class="${cls}">${icon} ${a.type}</span>`;
}

function tag(text: string, cls: string = 'tag') {
  return `<span class="${cls}">${text}</span>`;
}

function findPolicyActor(policyId: string): Actor | undefined {
  const policy = spec.policies.find(p => p.id === policyId);
  return policy?.actor ? spec.actors.find(a => a.id === policy.actor) : undefined;
}

function findOperationActor(operationId: string): Actor | undefined {
  const op = spec.operations.find(o => o.id === operationId);
  return op?.actor ? spec.actors.find(a => a.id === op.actor) : undefined;
}

// ── Reactive chain discovery ────────────────────────────────

type ChainStep =
  | { type: 'outcome'; kind: string }
  | { type: 'policy'; id: string; context: string }
  | { type: 'intent'; kind: string }
  | { type: 'operation'; id: string; context: string };

function buildChains(): ChainStep[][] {
  const chains: ChainStep[][] = [];
  for (const policy of spec.policies) {
    for (const outcomeKind of policy.activatedBy) {
      const chain: ChainStep[] = [
        { type: 'outcome', kind: outcomeKind },
        { type: 'policy', id: policy.id, context: policy.context },
      ];
      chain.push({ type: 'intent', kind: policy.emits });
      const op = spec.operations.find(o => o.activatedBy.includes(policy.emits));
      if (op) {
        chain.push({ type: 'operation', id: op.id, context: op.context });
        chain.push({ type: 'outcome', kind: op.unconditionalOutcome.kind });
      }
      chains.push(chain);
    }
  }
  return chains;
}

function contextBadge(contextId: string) {
  const ctx = spec.contexts.find(c => c.id === contextId);
  if (!ctx) return '';
  const cls = ctx.type === 'software'
    ? (ctx.boundary === 'external' ? 'ctx-badge ctx-external' : 'ctx-badge ctx-software')
    : 'ctx-badge ctx-institutional';
  return `<span class="${cls}">${ctx.id}</span>`;
}

const chains = buildChains();

// ── HTML ────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Herbrand — System View</title>
<style>
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --surface2: #1c2129;
    --border: #30363d;
    --text: #e6edf3;
    --text-dim: #8b949e;
    --accent-policy: #7c6fe0;
    --accent-operation: #2dd4bf;
    --accent-outcome: #f0883e;
    --accent-intent: #58a6ff;
    --accent-info: #3fb950;
    --accent-human: #f0883e;
    --accent-llm: #a371f7;
    --accent-machine: #79c0ff;
    --accent-context: #ffa657;
    --accent-ctx-software: #79c0ff;
    --accent-ctx-external: #f47067;
    --accent-ctx-institutional: #ffa657;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    padding: 2rem;
  }

  h1 { font-size: 1.6rem; font-weight: 600; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
  h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; }

  .header { margin-bottom: 2.5rem; }
  .header p { color: var(--text-dim); font-size: 0.9rem; }

  .section { margin-bottom: 2.5rem; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 1rem;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.25rem;
    border-left: 3px solid var(--border);
  }
  .card-policy { border-left-color: var(--accent-policy); }
  .card-operation { border-left-color: var(--accent-operation); }
  .card-actor { border-left-color: var(--accent-human); }
  .card-info { border-left-color: var(--accent-info); }

  .card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .card-title code {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
  }
  .card-desc {
    font-size: 0.85rem;
    color: var(--text-dim);
    margin-bottom: 0.75rem;
  }

  .card-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
  }
  .card-row-label {
    color: var(--text-dim);
    min-width: 90px;
    flex-shrink: 0;
  }
  .card-row-value {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tag {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
  }
  .tag-outcome { color: var(--accent-outcome); border-color: color-mix(in srgb, var(--accent-outcome) 30%, transparent); }
  .tag-intent { color: var(--accent-intent); border-color: color-mix(in srgb, var(--accent-intent) 30%, transparent); }
  .tag-info { color: var(--accent-info); border-color: color-mix(in srgb, var(--accent-info) 30%, transparent); }
  .tag-effect { color: var(--accent-operation); border-color: color-mix(in srgb, var(--accent-operation) 30%, transparent); }

  .actor-badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .actor-human { background: color-mix(in srgb, var(--accent-human) 15%, transparent); color: var(--accent-human); }
  .actor-llm { background: color-mix(in srgb, var(--accent-llm) 15%, transparent); color: var(--accent-llm); }
  .actor-machine { background: color-mix(in srgb, var(--accent-machine) 15%, transparent); color: var(--accent-machine); }

  .precondition, .constraint {
    font-size: 0.8rem;
    padding: 0.4rem 0.6rem;
    background: var(--surface2);
    border-radius: 4px;
    margin-bottom: 0.35rem;
    border-left: 2px solid var(--border);
  }
  .precondition { border-left-color: var(--accent-policy); }
  .constraint { border-left-color: var(--accent-operation); }
  .precondition code, .constraint code { color: var(--accent-info); font-size: 0.75rem; }

  .outcome-block {
    font-size: 0.8rem;
    padding: 0.5rem 0.6rem;
    background: var(--surface2);
    border-radius: 4px;
    margin-bottom: 0.35rem;
    border-left: 2px solid var(--accent-outcome);
  }
  .outcome-block.conditional { border-left-color: var(--text-dim); border-left-style: dashed; }
  .outcome-block code { font-size: 0.75rem; }
  .outcome-label { font-weight: 600; color: var(--accent-outcome); }
  .outcome-label.conditional { color: var(--text-dim); }

  .chain {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .chain-step {
    padding: 0.3rem 0.7rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
  }
  .chain-arrow {
    color: var(--text-dim);
    font-size: 0.85rem;
    padding: 0 0.25rem;
  }
  .chain-outcome { background: color-mix(in srgb, var(--accent-outcome) 12%, transparent); color: var(--accent-outcome); }
  .chain-policy { background: color-mix(in srgb, var(--accent-policy) 12%, transparent); color: var(--accent-policy); }
  .chain-intent { background: color-mix(in srgb, var(--accent-intent) 12%, transparent); color: var(--accent-intent); }
  .chain-operation { background: color-mix(in srgb, var(--accent-operation) 12%, transparent); color: var(--accent-operation); }

  .stats {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }
  .stat {
    text-align: center;
  }
  .stat-num {
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1;
  }
  .stat-label {
    font-size: 0.75rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .stat-policy .stat-num { color: var(--accent-policy); }
  .stat-operation .stat-num { color: var(--accent-operation); }
  .stat-context .stat-num { color: var(--accent-context); }
  .stat-actor .stat-num { color: var(--accent-human); }
  .stat-info .stat-num { color: var(--accent-info); }
  .stat-integration .stat-num { color: var(--accent-ctx-external); }

  .ctx-badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .ctx-software { background: color-mix(in srgb, var(--accent-ctx-software) 15%, transparent); color: var(--accent-ctx-software); }
  .ctx-external { background: color-mix(in srgb, var(--accent-ctx-external) 15%, transparent); color: var(--accent-ctx-external); }
  .ctx-institutional { background: color-mix(in srgb, var(--accent-ctx-institutional) 15%, transparent); color: var(--accent-ctx-institutional); }

  .card-context { border-left-color: var(--accent-context); }
  .card-integration { border-left-color: var(--accent-ctx-external); }

  .chain-separator {
    border-left: 2px dashed var(--accent-ctx-external);
    height: 1.4rem;
    margin: 0 0.15rem;
  }

  .integration-arrow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface2);
    border-radius: 4px;
    font-size: 0.85rem;
    margin-bottom: 0.4rem;
    border-left: 2px solid var(--accent-ctx-external);
  }
  .integration-via {
    font-size: 0.75rem;
    color: var(--text-dim);
  }
</style>
</head>
<body>

<div class="header">
  <h1>Herbrand System View</h1>
  <p>Public Library Book Lending</p>
  <div class="stats">
    <div class="stat stat-context"><div class="stat-num">${system.contexts.length}</div><div class="stat-label">Contexts</div></div>
    <div class="stat stat-policy"><div class="stat-num">${system.policies.length}</div><div class="stat-label">Policies</div></div>
    <div class="stat stat-operation"><div class="stat-num">${system.operations.length}</div><div class="stat-label">Operations</div></div>
    <div class="stat stat-actor"><div class="stat-num">${system.actors.length}</div><div class="stat-label">Actors</div></div>
    <div class="stat stat-info"><div class="stat-num">${system.infoPoints.length}</div><div class="stat-label">Info Points</div></div>
    <div class="stat stat-integration"><div class="stat-num">${system.integrationPoints.length}</div><div class="stat-label">Integrations</div></div>
  </div>
</div>

<div class="section">
  <h2>Reactive Chains</h2>
  ${chains.map(chain => `
  <div class="chain">
    ${chain.map((step, i) => {
      // detect context boundary crossing
      let separator = '';
      if (i > 0) {
        const prev = chain[i - 1];
        const prevCtx = ('context' in prev) ? prev.context : null;
        const curCtx = ('context' in step) ? step.context : null;
        if (prevCtx && curCtx && prevCtx !== curCtx) {
          separator = '<span class="chain-separator"></span>';
        }
      }
      const arrow = i > 0 ? '<span class="chain-arrow">&#8594;</span>' : '';
      if (step.type === 'outcome') return `${separator}${arrow}<span class="chain-step chain-outcome">${step.kind}</span>`;
      if (step.type === 'policy') return `${separator}${arrow}<span class="chain-step chain-policy">${step.id}<span style="opacity:0.5;margin-left:0.4em;font-size:0.7rem">@ ${step.context}</span></span>`;
      if (step.type === 'intent') return `${separator}${arrow}<span class="chain-step chain-intent">${step.kind}</span>`;
      if (step.type === 'operation') return `${separator}${arrow}<span class="chain-step chain-operation">${step.id}<span style="opacity:0.5;margin-left:0.4em;font-size:0.7rem">@ ${step.context}</span></span>`;
      return '';
    }).join('')}
  </div>`).join('')}
</div>

<div class="section">
  <h2>Policies</h2>
  <div class="grid">
    ${spec.policies.map(p => {
      const actor = findPolicyActor(p.id);
      const view = deriveView(p);
      return `
    <div class="card card-policy">
      <div class="card-title">
        <code>${p.id}</code>
        ${actor ? actorBadge(actor) : ''}
      </div>
      <div class="card-desc">${p.description}</div>
      <div class="card-row">
        <span class="card-row-label">Context</span>
        <span class="card-row-value">${contextBadge(p.context)}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label">Activated by</span>
        <span class="card-row-value">${p.activatedBy.map(a => tag(a, 'tag tag-outcome')).join(' ')}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label">Emits</span>
        <span class="card-row-value">${tag(p.emits, 'tag tag-intent')}</span>
      </div>
      ${actor ? `<div class="card-row">
        <span class="card-row-label">Actor</span>
        <span class="card-row-value">${actorLabel(actor)}</span>
      </div>` : ''}
      <div class="card-row">
        <span class="card-row-label">View</span>
        <span class="card-row-value">${view.infoPoints.map(ip => tag(ip, 'tag tag-info')).join(' ')}</span>
      </div>
      <h3 style="margin-top: 0.75rem">Preconditions</h3>
      ${p.preconditions.map(pre => `
      <div class="precondition">
        ${pre.description}<br/>
        reads: ${pre.reads.map(r => `<code>${r}</code>`).join(', ')}
      </div>`).join('')}
    </div>`;
    }).join('')}
  </div>
</div>

<div class="section">
  <h2>Operations</h2>
  <div class="grid">
    ${spec.operations.map(op => {
      const actor = findOperationActor(op.id);
      return `
    <div class="card card-operation">
      <div class="card-title">
        <code>${op.id}</code>
        ${actor ? actorBadge(actor) : ''}
      </div>
      <div class="card-desc">${op.description}</div>
      <div class="card-row">
        <span class="card-row-label">Context</span>
        <span class="card-row-value">${contextBadge(op.context)}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label">Activated by</span>
        <span class="card-row-value">${op.activatedBy.map(a => tag(a, 'tag tag-intent')).join(' ')}</span>
      </div>
      ${actor ? `<div class="card-row">
        <span class="card-row-label">Actor</span>
        <span class="card-row-value">${actorLabel(actor)}</span>
      </div>` : ''}
      ${op.constraints.length > 0 ? `
      <h3 style="margin-top: 0.75rem">Constraints</h3>
      ${op.constraints.map(c => `
      <div class="constraint">
        ${c.description}<br/>
        reads: ${c.reads.map(r => `<code>${r}</code>`).join(', ')}
      </div>`).join('')}` : ''}
      <h3 style="margin-top: 0.75rem">Outcomes</h3>
      <div class="outcome-block">
        <span class="outcome-label">${op.unconditionalOutcome.kind}</span><br/>
        ${op.unconditionalOutcome.description}
        ${op.unconditionalOutcome.effects.length > 0 ? `<br/>effects: ${op.unconditionalOutcome.effects.map(e => tag(`${e.point}: ${e.description}`, 'tag tag-effect')).join(' ')}` : ''}
      </div>
      ${op.conditionalOutcomes.map(co => `
      <div class="outcome-block conditional">
        <span class="outcome-label conditional">if: ${co.condition.description}</span><br/>
        <span class="outcome-label">${co.outcome.kind}</span> — ${co.outcome.description}
      </div>`).join('')}
    </div>`;
    }).join('')}
  </div>
</div>

<div class="section">
  <h2>Execution Contexts</h2>
  <div class="grid">
    ${spec.contexts.map(ctx => {
      const ctxPolicies = spec.policies.filter(p => p.context === ctx.id);
      const ctxOps = spec.operations.filter(o => o.context === ctx.id);
      const typeLabel = ctx.type === 'software'
        ? `software (${ctx.boundary})`
        : `institutional (${ctx.kind})`;
      return `
    <div class="card card-context">
      <div class="card-title">
        <code>${ctx.id}</code>
        ${contextBadge(ctx.id)}
      </div>
      <div class="card-desc">${ctx.description}</div>
      <div class="card-row">
        <span class="card-row-label">Type</span>
        <span class="card-row-value">${typeLabel}</span>
      </div>
      ${ctxPolicies.length > 0 ? `<div class="card-row">
        <span class="card-row-label">Policies</span>
        <span class="card-row-value">${ctxPolicies.map(p => tag(p.id, 'tag')).join(' ')}</span>
      </div>` : ''}
      ${ctxOps.length > 0 ? `<div class="card-row">
        <span class="card-row-label">Operations</span>
        <span class="card-row-value">${ctxOps.map(o => tag(o.id, 'tag')).join(' ')}</span>
      </div>` : ''}
    </div>`;
    }).join('')}
  </div>
</div>

${system.integrationPoints.length > 0 ? `
<div class="section">
  <h2>Integration Points</h2>
  ${system.integrationPoints.map(ip => {
    const fromCtx = spec.contexts.find(c => c.id === ip.from.contextId);
    const toCtx = spec.contexts.find(c => c.id === ip.to.contextId);
    return `
  <div class="integration-arrow">
    ${contextBadge(ip.from.contextId)}
    <span>${ip.from.decisionId}</span>
    <span class="chain-arrow">&#8594;</span>
    ${contextBadge(ip.to.contextId)}
    <span>${ip.to.decisionId}</span>
    <span class="integration-via">via ${tag(ip.via, 'tag tag-intent')}</span>
  </div>`;
  }).join('')}
</div>` : ''}

<div class="section">
  <h2>Actors</h2>
  <div class="grid">
    ${responsibilities.map(r => `
    <div class="card card-actor">
      <div class="card-title">
        <code>${r.actor.id}</code>
        ${actorBadge(r.actor)}
      </div>
      <div class="card-desc">${actorLabel(r.actor)}</div>
      ${r.policies.length > 0 ? `<div class="card-row">
        <span class="card-row-label">Policies</span>
        <span class="card-row-value">${r.policies.map(p => tag(p, 'tag')).join(' ')}</span>
      </div>` : ''}
      ${r.operations.length > 0 ? `<div class="card-row">
        <span class="card-row-label">Operations</span>
        <span class="card-row-value">${r.operations.map(o => tag(o, 'tag')).join(' ')}</span>
      </div>` : ''}
      ${r.reads.length > 0 ? `<div class="card-row">
        <span class="card-row-label">Reads</span>
        <span class="card-row-value">${r.reads.map(ip => tag(ip, 'tag tag-info')).join(' ')}</span>
      </div>` : ''}
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <h2>Info Universe</h2>
  <div class="grid">
    ${system.infoPoints.map(ip => `
    <div class="card card-info">
      <div class="card-title"><code>${ip.name}</code></div>
      <div class="card-desc">${ip.description}</div>
    </div>`).join('')}
  </div>
</div>

</body>
</html>`;

const outPath = resolve(process.cwd(), 'system-view.html');
writeFileSync(outPath, html);
console.log(`Written to ${outPath}`);
