import { useState, useRef, useEffect } from 'react';
import { useStore } from '../lib/useStore';
import type { BusinessViewItem } from 'policies-poc/business-view';
import type { LintViolation } from 'policies-poc/lint-types';
import type { Policy, Operation, Actor, ExecutionContext } from 'policies-poc';

export function SpecificationView() {
  const store = useStore();
  const system = store.system;
  const [activeProcess, setActiveProcess] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [showLintPanel, setShowLintPanel] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selectedDecision && cardRefs.current[selectedDecision]) {
      cardRefs.current[selectedDecision]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedDecision]);

  if (!system) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-base text-muted-foreground">
            {store.pipelineStatus === 'empty' ? 'No files loaded' : `Pipeline blocked: ${store.pipelineStatus}`}
          </p>
          {store.validationResults.length > 0 && (
            <div className="mt-4 text-left max-w-lg">
              {store.validationResults.map((v, i) => (
                <div key={i} className="text-sm text-red-500 mb-1">{v.target}: {v.message}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const allDecisions: (Policy | Operation)[] = [...system.policies, ...system.operations];
  const processes = system.processes ?? [];
  const actorMap = new Map(system.actors.map(a => [a.id, a]));
  const contextMap = new Map(system.contexts.map(c => [c.id, c]));

  const filteredDecisions = activeProcess
    ? allDecisions.filter(d => d.processes?.includes(activeProcess))
    : allDecisions;

  const filteredPolicies = filteredDecisions.filter((d): d is Policy => 'emits' in d);
  const filteredOperations = filteredDecisions.filter((d): d is Operation => 'unconditionalOutcome' in d);

  const filteredActorIds = new Set(filteredDecisions.map(d => d.actor).filter(Boolean));
  const filteredContextIds = new Set(filteredDecisions.map(d => d.context));
  const filteredActors = system.actors.filter(a => filteredActorIds.has(a.id));
  const filteredContexts = system.contexts.filter(c => filteredContextIds.has(c.id));

  const activeInfoPoints = new Set<string>();
  for (const p of filteredPolicies) {
    for (const pre of p.preconditions) for (const r of pre.reads) activeInfoPoints.add(r);
  }
  for (const op of filteredOperations) {
    for (const c of op.constraints) for (const r of c.reads) activeInfoPoints.add(r);
    for (const e of op.unconditionalOutcome.effects) activeInfoPoints.add(e.point);
    for (const co of op.conditionalOutcomes) {
      for (const r of co.condition.reads) activeInfoPoints.add(r);
      for (const e of co.outcome.effects) activeInfoPoints.add(e.point);
    }
  }
  const filteredInfoPoints = system.infoPoints.filter(ip => activeInfoPoints.has(ip.name));

  const lintByTarget = new Map<string, LintViolation[]>();
  for (const v of [...store.specLintResults, ...store.graphLintResults]) {
    const list = lintByTarget.get(v.target) ?? [];
    list.push(v);
    lintByTarget.set(v.target, list);
  }

  const contextDecisions = system.contexts.map(ctx => ({
    context: ctx,
    decisions: allDecisions.filter(d => d.context === ctx.id),
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Overview bar */}
      <div className="border-b border-border px-5 py-3 shrink-0">
        <div className="flex items-center gap-4 mb-2.5">
          <StatusBadge status={store.pipelineStatus} />
          <StatChip label="Contexts" value={system.contexts.length} />
          <StatChip label="Policies" value={system.policies.length} color="var(--h-policy)" />
          <StatChip label="Operations" value={system.operations.length} color="var(--h-operation)" />
          <StatChip label="Actors" value={system.actors.length} />
          <StatChip label="Info Points" value={system.infoPoints.length} color="var(--h-info)" />

          {store.allViolations.length > 0 && (
            <>
              <div className="w-px h-5 bg-border" />
              <button
                onClick={() => setShowLintPanel(v => !v)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <LintSummary violations={store.allViolations} expanded={showLintPanel} />
              </button>
            </>
          )}
        </div>

        {/* Expandable lint panel */}
        {showLintPanel && store.allViolations.length > 0 && (
          <div className="border-t border-border px-5 py-3 max-h-48 overflow-y-auto space-y-1">
            {store.allViolations.map((v, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded flex items-start gap-2 ${
                v.level === 'error' ? 'bg-red-500/10 text-red-400' :
                v.level === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                <span className="font-mono shrink-0 uppercase">{v.level === 'error' ? 'err' : v.level === 'warning' ? 'wrn' : 'inf'}</span>
                <span className="font-mono shrink-0 text-foreground/50">{v.ruleId}</span>
                <span className="text-foreground/70 font-medium">{v.target}</span>
                <span>{v.message}</span>
              </div>
            ))}
          </div>
        )}

        {processes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mr-1">Process:</span>
            <ProcessPill label="All" active={activeProcess === null} onClick={() => setActiveProcess(null)} />
            {processes.map(p => (
              <ProcessPill
                key={p.id}
                label={p.id}
                description={p.description}
                active={activeProcess === p.id}
                onClick={() => setActiveProcess(activeProcess === p.id ? null : p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Three columns — 25% / 50% / 25% */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Structure (25%) */}
        <div className="basis-1/4 border-r border-border overflow-y-auto p-4" style={{ minWidth: 0 }}>
          {/* Actors */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Actors</h3>
          <div className="mb-5 space-y-1.5">
            {filteredActors.map(actor => {
              const decisionCount = filteredDecisions.filter(d => d.actor === actor.id).length;
              const colorVar = actor.type === 'human' ? 'var(--h-human)' :
                actor.type === 'llm' ? 'var(--h-llm)' : 'var(--h-machine)';
              return (
                <div key={actor.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-card border border-border">
                  <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: `hsl(${colorVar})` }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {actor.type === 'human' ? (actor as any).role : actor.id}
                      </span>
                      <span className="text-[11px] px-1.5 py-px rounded text-muted-foreground bg-muted shrink-0">{actor.type}</span>
                    </div>
                    {'description' in actor && actor.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{actor.description as string}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{decisionCount} decision{decisionCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Execution Contexts */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Execution Contexts</h3>
          <div className="mb-5 space-y-1.5">
            {filteredContexts.map(ctx => {
              const ctxDecisions = filteredDecisions.filter(d => d.context === ctx.id);
              const ctxActors = new Set(ctxDecisions.map(d => d.actor).filter(Boolean));
              const isInst = ctx.type === 'institutional';
              return (
                <div key={ctx.id} className="px-3 py-2 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <ContextBadge context={ctx} />
                    <span className="text-xs text-muted-foreground">
                      {isInst ? (ctx as any).kind : (ctx as any).boundary}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{ctx.description}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{ctxDecisions.length} decision{ctxDecisions.length !== 1 ? 's' : ''}</span>
                    <span>&middot;</span>
                    <span>{ctxActors.size} actor{ctxActors.size !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Decisions tree */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Decisions</h3>
          {contextDecisions
            .filter(({ decisions }) => decisions.some(d => filteredDecisions.includes(d)))
            .map(({ context: ctx, decisions }) => (
              <div key={ctx.id} className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <ContextBadge context={ctx} />
                </div>
                {decisions.filter(d => filteredDecisions.includes(d)).map(d => {
                  const actor = d.actor ? actorMap.get(d.actor) : undefined;
                  const isPolicy = 'emits' in d;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDecision(d.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm mb-0.5 flex items-center gap-2 transition-colors cursor-pointer ${
                        selectedDecision === d.id
                          ? 'bg-accent text-foreground'
                          : 'hover:bg-accent/50 text-foreground/80'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isPolicy ? 'bg-[hsl(var(--h-policy))]' : 'bg-[hsl(var(--h-operation))]'
                      }`} />
                      <span className="truncate">{d.id}</span>
                      {actor && (
                        <span className={`text-[11px] ml-auto shrink-0 ${
                          actor.type === 'human' ? 'text-[hsl(var(--h-human))]' :
                          actor.type === 'llm' ? 'text-[hsl(var(--h-llm))]' :
                          'text-[hsl(var(--h-machine))]'
                        }`}>
                          {actor.type === 'human' ? (actor as any).role : actor.id}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        {/* Center: Decisions (50%) */}
        <div className="basis-1/2 overflow-y-auto p-5" style={{ minWidth: 0 }}>
          {filteredDecisions.length === 0 && (
            <div className="text-base text-muted-foreground text-center py-12">No decisions match the filter</div>
          )}
          {filteredDecisions.map(d => {
            const isPolicy = 'emits' in d;
            const policy = isPolicy ? d as Policy : null;
            const operation = !isPolicy ? d as Operation : null;
            const actor = d.actor ? actorMap.get(d.actor) : undefined;
            const ctx = contextMap.get(d.context);
            const violations = lintByTarget.get(d.id) ?? [];

            return (
              <div
                key={d.id}
                ref={el => { cardRefs.current[d.id] = el; }}
                className={`bg-card border rounded-lg p-5 mb-4 transition-colors ${
                  selectedDecision === d.id ? 'border-foreground/30 ring-1 ring-foreground/10' : 'border-border'
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                  <TypeBadge type={isPolicy ? 'policy' : 'operation'} />
                  <span className="text-base font-semibold text-foreground">{d.id}</span>
                  {actor && <ActorBadge actor={actor} />}
                  {ctx && <ContextBadge context={ctx} />}
                  {d.processes?.map(p => (
                    <span key={p} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{p}</span>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground mb-3">{d.description}</p>
                {policy?.businessGoal && (
                  <p className="text-sm text-foreground/60 mb-3 italic">Goal: {policy.businessGoal}</p>
                )}

                {/* Chain */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {d.activatedBy.map(s => (
                    <SignalTag key={s} kind={isPolicy ? 'outcome' : 'intent'} label={s} />
                  ))}
                  <span className="text-muted-foreground">&rarr;</span>
                  {policy && <SignalTag kind="intent" label={policy.emits} />}
                  {operation && (
                    <>
                      <SignalTag kind="outcome" label={operation.unconditionalOutcome.kind} />
                      {operation.conditionalOutcomes.map(co => (
                        <SignalTag key={co.outcome.kind} kind="outcome" label={co.outcome.kind} conditional />
                      ))}
                    </>
                  )}
                </div>

                {/* Preconditions */}
                {policy && policy.preconditions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preconditions</h4>
                    {policy.preconditions.map(pre => (
                      <div key={pre.id} className="text-sm mb-1.5 pl-3 border-l-2 border-[hsl(var(--h-policy))]/30 py-1">
                        <span className="text-foreground/80">{pre.description}</span>
                        <span className="text-[hsl(var(--h-info))] ml-2 text-xs">reads: {pre.reads.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {operation && operation.constraints.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Constraints</h4>
                    {operation.constraints.map(c => (
                      <div key={c.id} className="text-sm mb-1.5 pl-3 border-l-2 border-[hsl(var(--h-operation))]/30 py-1">
                        <span className="text-foreground/80">{c.description}</span>
                        <span className="text-[hsl(var(--h-info))] ml-2 text-xs">reads: {c.reads.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outcomes */}
                {operation && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Outcomes</h4>
                    <OutcomeBlock kind={operation.unconditionalOutcome.kind} description={operation.unconditionalOutcome.description} effects={operation.unconditionalOutcome.effects} />
                    {operation.conditionalOutcomes.map(co => (
                      <OutcomeBlock key={co.outcome.kind} kind={co.outcome.kind} description={co.outcome.description} effects={co.outcome.effects} condition={co.condition.description} />
                    ))}
                  </div>
                )}

                {/* Lint */}
                {violations.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {violations.map((v, i) => (
                      <div key={i} className={`text-xs px-3 py-1.5 rounded ${
                        v.level === 'error' ? 'bg-red-500/10 text-red-400' :
                        v.level === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {v.ruleId}: {v.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Info Universe (25%) */}
        <div className="basis-1/4 border-l border-border overflow-y-auto p-4" style={{ minWidth: 0 }}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Info Universe</h3>
          {filteredInfoPoints.map(ip => {
            const violations = lintByTarget.get(ip.name) ?? [];
            return (
              <div key={ip.name} className="mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--h-info))] shrink-0" />
                  <span className="text-sm font-mono text-foreground/80">{ip.name}</span>
                </div>
                {violations.length > 0 && (
                  <div className="ml-3.5 mt-1">
                    {violations.map((v, i) => (
                      <div key={i} className={`text-xs ${
                        v.level === 'warning' ? 'text-yellow-500' : 'text-blue-400'
                      }`}>
                        {v.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function ProcessPill({ label, description, active, onClick }: {
  label: string; description?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={description}
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'empty': 'bg-muted text-muted-foreground',
    'validation-errors': 'bg-red-500/10 text-red-500',
    'spec-errors': 'bg-red-500/10 text-red-500',
    'system-errors': 'bg-red-500/10 text-red-500',
    'graph-errors': 'bg-yellow-500/10 text-yellow-500',
    'clean': 'bg-green-500/10 text-green-500',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded ${styles[status] ?? styles.empty}`}>
      {status}
    </span>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <span className="text-sm text-muted-foreground">
      <span className="font-semibold" style={color ? { color: `hsl(${color})` } : undefined}>{value}</span>
      {' '}{label}
    </span>
  );
}

function LintSummary({ violations, expanded }: { violations: LintViolation[]; expanded: boolean }) {
  const errors = violations.filter(v => v.level === 'error').length;
  const warnings = violations.filter(v => v.level === 'warning').length;
  const infos = violations.filter(v => v.level === 'info').length;
  return (
    <span className="text-sm flex items-center gap-1">
      {errors > 0 && <span className="text-red-500 font-medium">{errors} {errors === 1 ? 'error' : 'errors'} </span>}
      {warnings > 0 && <span className="text-yellow-500 font-medium">{warnings} {warnings === 1 ? 'warning' : 'warnings'} </span>}
      {infos > 0 && <span className="text-blue-400 font-medium">{infos} info</span>}
      <span className={`text-muted-foreground text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>&#9662;</span>
    </span>
  );
}

function TypeBadge({ type }: { type: 'policy' | 'operation' }) {
  const color = type === 'policy' ? 'var(--h-policy)' : 'var(--h-operation)';
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
      style={{ backgroundColor: `hsl(${color} / 0.12)`, color: `hsl(${color})` }}>
      {type}
    </span>
  );
}

function ActorBadge({ actor }: { actor: Actor }) {
  const color = actor.type === 'human' ? 'var(--h-human)' :
    actor.type === 'llm' ? 'var(--h-llm)' : 'var(--h-machine)';
  const label = actor.type === 'human' ? (actor as any).role : actor.id;
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded"
      style={{ backgroundColor: `hsl(${color} / 0.1)`, color: `hsl(${color})` }}>
      {actor.type === 'human' ? '\u2659' : '\u2699'} {label}
    </span>
  );
}

function ContextBadge({ context: ctx }: { context: ExecutionContext }) {
  const isInst = ctx.type === 'institutional';
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
      isInst ? 'bg-amber-500/10 text-amber-500' : 'bg-sky-500/10 text-sky-500'
    }`}>
      {ctx.id}
    </span>
  );
}

function SignalTag({ kind, label, conditional }: { kind: 'intent' | 'outcome'; label: string; conditional?: boolean }) {
  const color = kind === 'intent' ? 'var(--h-intent)' : 'var(--h-outcome)';
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${conditional ? 'border-dashed' : ''}`}
      style={{ borderColor: `hsl(${color} / 0.3)`, color: `hsl(${color})` }}>
      {label}
    </span>
  );
}

function OutcomeBlock({ kind, description, effects, condition }: {
  kind: string; description: string; effects: { point: string; description: string }[]; condition?: string;
}) {
  return (
    <div className={`text-sm pl-3 border-l-2 mb-2 py-1 ${condition ? 'border-dashed border-[hsl(var(--h-outcome))]/20' : 'border-[hsl(var(--h-outcome))]/40'}`}>
      {condition && <span className="text-muted-foreground text-xs">if: {condition} &rarr; </span>}
      <span className="text-[hsl(var(--h-outcome))] font-medium">{kind}</span>
      <span className="text-foreground/60 ml-2">— {description}</span>
      {effects.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {effects.map(e => (
            <span key={e.point} className="text-xs text-[hsl(var(--h-info))]/70">
              {e.point}: {e.description}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
