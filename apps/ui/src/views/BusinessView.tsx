import { useState } from 'react';
import { useStore } from '../lib/useStore';
import type { BusinessViewItem } from '@herbrand/core/views/business';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

export function BusinessView() {
  const store = useStore();
  const items = store.businessView as BusinessViewItem[];
  const processes = store.system?.processes ?? [];
  const [activeProcess, setActiveProcess] = useState<string | null>(null);

  const filtered = activeProcess
    ? items.filter(item => item.processes.includes(activeProcess))
    : items;

  const userStories = filtered.filter(i => i.type === 'user-story');
  const automations = filtered.filter(i => i.type === 'automation');

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No business view available</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-border px-5 py-3 shrink-0">
        <div className="flex items-center gap-4 mb-2.5">
          <span className="text-sm font-semibold text-foreground">Business View</span>
          <div className="w-px h-5 bg-border" />
          <span className="text-sm text-[hsl(var(--h-human))]">
            <span className="font-semibold">{userStories.length}</span> {userStories.length === 1 ? 'user story' : 'user stories'}
          </span>
          <span className="text-sm text-[hsl(var(--h-machine))]">
            <span className="font-semibold">{automations.length}</span> {automations.length === 1 ? 'automation' : 'automations'}
          </span>
        </div>

        {processes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mr-1">Process:</span>
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
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-6xl mx-auto space-y-5">
          {filtered.map(item => (
            <StoryCard key={item.policyId} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Story Card ──────────────────────────────────────────────

function StoryCard({ item }: { item: BusinessViewItem }) {
  const isHuman = item.type === 'user-story';
  const accentVar = isHuman ? 'var(--h-human)' : item.actorType === 'llm' ? 'var(--h-llm)' : 'var(--h-machine)';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden mb-6"
      style={{ borderLeftWidth: 3, borderLeftColor: `hsl(${accentVar})` }}>

      {/* Header */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ backgroundColor: `hsl(${accentVar} / 0.12)`, color: `hsl(${accentVar})` }}>
            {isHuman ? 'User Story' : 'Automation'}
          </span>
          <span className="text-sm text-muted-foreground">{item.actorId}</span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span className="text-sm text-muted-foreground">{item.actorType}</span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span className="text-sm text-muted-foreground">{item.context}</span>
          {item.processes.map(p => (
            <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p}</span>
          ))}
        </div>
        <p className="text-lg text-foreground leading-relaxed font-medium">{item.formula}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="acceptance">
        <TabsList className="px-4">
          <TabsTrigger value="acceptance">Acceptance Criteria</TabsTrigger>
          <TabsTrigger value="table">Decision Table</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="view">View</TabsTrigger>
        </TabsList>
        <TabsContent value="acceptance" className="px-6 py-6">
          <AcceptanceCriteriaTab item={item} />
        </TabsContent>
        <TabsContent value="table" className="px-6 py-6">
          <DecisionTableTab item={item} />
        </TabsContent>
        <TabsContent value="scenarios" className="px-6 py-6">
          <ScenariosTab item={item} />
        </TabsContent>
        <TabsContent value="view" className="px-6 py-6">
          <ViewTab item={item} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Acceptance Criteria Tab ─────────────────────────────────

function AcceptanceCriteriaTab({ item }: { item: BusinessViewItem }) {
  const ac = item.acceptanceCriteria;

  return (
    <div className="space-y-4">
      {/* Given */}
      {ac.given.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Given</h4>
          {ac.given.map(g => (
            <div key={g.id} className="text-sm pl-3 border-l-2 border-[hsl(var(--h-policy))]/30 py-1.5 mb-1.5">
              <span className="text-foreground/90">{g.description}</span>
              {g.reads.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {g.reads.map(r => <InfoTag key={r} label={r} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* When */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">When</h4>
        <div className="text-sm pl-3 border-l-2 border-[hsl(var(--h-intent))]/30 py-1.5">
          <span className="text-[hsl(var(--h-intent))] font-medium font-mono">{ac.when}</span>
          <span className="text-muted-foreground ml-2">triggered by</span>
          <span className="text-[hsl(var(--h-outcome))] font-mono ml-1">{ac.trigger}</span>
        </div>
      </div>

      {/* Then */}
      {ac.then.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Then</h4>
          {ac.then.map(t => (
            <div key={t.kind} className={`text-sm pl-3 border-l-2 py-1.5 mb-1.5 ${t.conditional ? 'border-dashed border-[hsl(var(--h-outcome))]/20' : 'border-[hsl(var(--h-outcome))]/40'}`}>
              {t.conditional && t.conditionDescription && (
                <div className="text-xs text-muted-foreground mb-1">if: {t.conditionDescription}</div>
              )}
              <span className="text-[hsl(var(--h-outcome))] font-medium font-mono">{t.kind}</span>
              <span className="text-foreground/60 ml-2">— {t.description}</span>
              {t.effects.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {t.effects.map(e => (
                    <span key={e.point} className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--h-info))]/8 text-[hsl(var(--h-info))]">
                      {e.point}: {e.description}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Should Fail If */}
      {ac.shouldFailIf.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Should Fail If</h4>
          {ac.shouldFailIf.map(f => (
            <div key={f.id} className="text-sm pl-3 border-l-2 border-red-500/30 py-1.5 mb-1.5">
              <span className="text-foreground/90">{f.description}</span>
              {f.reads.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {f.reads.map(r => <InfoTag key={r} label={r} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Decision Table Tab ──────────────────────────────────────

function DecisionTableTab({ item }: { item: BusinessViewItem }) {
  const dt = item.decisionTable;

  if (dt.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No decision paths</p>;
  }

  const hasConditions = dt.conditionColumns.length > 0;

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Path</th>
            {dt.preconditionColumns.length > 0 && (
              <th colSpan={dt.preconditionColumns.length} className="text-center text-[10px] font-semibold text-[hsl(var(--h-policy))] uppercase tracking-wider py-1 px-2 border-l border-border/50">
                Preconditions
              </th>
            )}
            {dt.constraintColumns.length > 0 && (
              <th colSpan={dt.constraintColumns.length} className="text-center text-[10px] font-semibold text-[hsl(var(--h-operation))] uppercase tracking-wider py-1 px-2 border-l border-border/50">
                Constraints
              </th>
            )}
            {hasConditions && (
              <th colSpan={dt.conditionColumns.length} className="text-center text-[10px] font-semibold text-[hsl(var(--h-outcome))] uppercase tracking-wider py-1 px-2 border-l border-border/50">
                Conditions
              </th>
            )}
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3 border-l border-border/50">Outcome</th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3 border-l border-border/50">Effects</th>
          </tr>
          <tr className="border-b border-border">
            <th />
            {dt.preconditionColumns.map((col, i) => (
              <th key={col} className={`text-center text-[10px] font-mono text-[hsl(var(--h-policy))]/60 py-1.5 px-2 ${i === 0 ? 'border-l border-border/50' : ''}`}>
                {col}
              </th>
            ))}
            {dt.constraintColumns.map((col, i) => (
              <th key={col} className={`text-center text-[10px] font-mono text-[hsl(var(--h-operation))]/60 py-1.5 px-2 ${i === 0 ? 'border-l border-border/50' : ''}`}>
                {col}
              </th>
            ))}
            {dt.conditionColumns.map((col, i) => (
              <th key={col.id} className={`text-center text-[10px] font-mono text-[hsl(var(--h-outcome))]/60 py-1.5 px-2 max-w-32 ${i === 0 ? 'border-l border-border/50' : ''}`} title={col.description}>
                {col.id}
              </th>
            ))}
            <th className="border-l border-border/50" />
            <th className="border-l border-border/50" />
          </tr>
        </thead>
        <tbody>
          {dt.rows.map((row, i) => (
            <tr key={i} className={`border-b border-border/30 ${
              row.type === 'success' ? 'bg-green-500/3' :
              row.type === 'failure' ? 'bg-red-500/3' :
              'bg-muted/20'
            }`}>
              <td className="py-2.5 px-3">
                <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                  row.type === 'success' ? 'bg-green-500/10 text-green-500' :
                  row.type === 'failure' ? 'bg-red-500/10 text-red-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {row.type}
                </span>
              </td>
              {dt.preconditionColumns.map((col, j) => (
                <td key={col} className={`text-center py-2.5 px-2 ${j === 0 ? 'border-l border-border/30' : ''}`}>
                  {row.preconditions[col]
                    ? <span className="text-green-500">&#10003;</span>
                    : <span className="text-red-500">&#10007;</span>
                  }
                </td>
              ))}
              {dt.constraintColumns.map((col, j) => (
                <td key={col} className={`text-center py-2.5 px-2 ${j === 0 ? 'border-l border-border/30' : ''}`}>
                  {row.type === 'skipped'
                    ? <span className="text-muted-foreground/40">—</span>
                    : row.constraints[col]
                      ? <span className="text-green-500">&#10003;</span>
                      : <span className="text-red-500">&#10007;</span>
                  }
                </td>
              ))}
              {dt.conditionColumns.map((col, j) => (
                <td key={col.id} className={`text-center py-2.5 px-2 ${j === 0 ? 'border-l border-border/30' : ''}`}>
                  {row.conditions[col.id] === null
                    ? <span className="text-muted-foreground/40">—</span>
                    : row.conditions[col.id]
                      ? <span className="text-[hsl(var(--h-outcome))]">&#10003;</span>
                      : <span className="text-muted-foreground/40">&#9711;</span>
                  }
                </td>
              ))}
              <td className="py-2.5 px-3 border-l border-border/30">
                {row.outcome ? (
                  <span className={`text-xs font-mono ${
                    row.type === 'success' ? 'text-[hsl(var(--h-outcome))]' :
                    row.type === 'failure' ? 'text-red-400' :
                    'text-muted-foreground'
                  }`}>
                    {row.outcome}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">silent drop</span>
                )}
              </td>
              <td className="py-2.5 px-3 border-l border-border/30">
                {row.effects.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {row.effects.map((e, j) => (
                      <span key={j} className="text-[10px] text-[hsl(var(--h-info))]">{e}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Scenarios Tab ───────────────────────────────────────────

function ScenariosTab({ item }: { item: BusinessViewItem }) {
  const dt = item.decisionTable;

  const success = dt.rows.filter(r => r.type === 'success');
  const failure = dt.rows.filter(r => r.type === 'failure');
  const skipped = dt.rows.filter(r => r.type === 'skipped');

  return (
    <div className="space-y-5">
      {success.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-green-500">Success Paths</h4>
          <div className="space-y-2">
            {success.map((row, i) => (
              <ScenarioCard key={i} type="success" description={row.description} outcome={row.outcome} effects={row.effects} />
            ))}
          </div>
        </div>
      )}

      {failure.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-red-500">Failure Paths</h4>
          <div className="space-y-2">
            {failure.map((row, i) => (
              <ScenarioCard key={i} type="failure" description={row.description} outcome={row.outcome} effects={row.effects} />
            ))}
          </div>
        </div>
      )}

      {skipped.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Skipped Paths</h4>
          <div className="space-y-2">
            {skipped.map((row, i) => (
              <ScenarioCard key={i} type="skipped" description={row.description} outcome={row.outcome} effects={row.effects} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioCard({ type, description, outcome, effects }: {
  type: 'success' | 'failure' | 'skipped';
  description: string;
  outcome: string | null;
  effects: string[];
}) {
  const borderColor = type === 'success' ? 'border-green-500/30' :
    type === 'failure' ? 'border-red-500/30' : 'border-muted';

  return (
    <div className={`pl-3 border-l-2 ${borderColor} py-2`}>
      <p className="text-sm text-foreground/90">{description}</p>
      {outcome && (
        <p className="text-xs mt-1">
          <span className="text-muted-foreground">outcome: </span>
          <span className={`font-mono ${type === 'failure' ? 'text-red-400' : 'text-[hsl(var(--h-outcome))]'}`}>
            {outcome}
          </span>
        </p>
      )}
      {!outcome && type === 'skipped' && (
        <p className="text-xs mt-1 text-muted-foreground italic">policy does not fire — precondition not met</p>
      )}
      {effects.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {effects.map((e, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[hsl(var(--h-info))]/8 text-[hsl(var(--h-info))]">
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── View Tab ────────────────────────────────────────────────

function ViewTab({ item }: { item: BusinessViewItem }) {
  if (!item.view) {
    return <p className="text-sm text-muted-foreground">No view required — this decision reads no info points</p>;
  }

  const actorLabel = item.actorType === 'human'
    ? `This is the screen ${item.role} needs to make this decision`
    : item.actorType === 'llm'
      ? `This is the context the agent needs in its prompt`
      : `This is the read model / query the service needs`;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{actorLabel}</p>
      <div className="bg-[hsl(var(--h-info))]/5 border border-[hsl(var(--h-info))]/20 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-[hsl(var(--h-info))] uppercase tracking-wider mb-3">
          Info Points Required
        </h4>
        <div className="flex flex-wrap gap-2">
          {item.view.infoPoints.map(ip => (
            <span key={ip} className="text-sm font-mono px-2.5 py-1 rounded bg-[hsl(var(--h-info))]/10 text-[hsl(var(--h-info))]">
              {ip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────

function ProcessPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );
}

function InfoTag({ label }: { label: string }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[hsl(var(--h-info))]/8 text-[hsl(var(--h-info))]">
      {label}
    </span>
  );
}
