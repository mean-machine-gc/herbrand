import type { DecisionGraph, LintResult, ParsedSpec } from "./types.js";

export function behaviorLint(graph: DecisionGraph): LintResult[] {
  const results: LintResult[] = [];
  const { nodes, edges, specs, declaredInfos } = graph;

  function warn(rule: string, message: string, spec?: string) {
    results.push({ level: "warning", rule, message, spec: spec ?? null });
  }

  // Collect sets from graph
  const outcomeNodes = new Set(nodes.filter((n) => n.type === "outcome").map((n) => n.id));
  const outcomeRejectNodes = new Set(nodes.filter((n) => n.type === "outcome_reject").map((n) => n.id));

  // Edges by type
  const intentFlowEdges = edges.filter((e) => e.type === "intent_flow");
  const outcomeFlowEdges = edges.filter((e) => e.type === "outcome_flow");
  const rejectFlowEdges = edges.filter((e) => e.type === "reject_flow");

  // Derived sets from edges
  const outcomesUsedAsTriggers = new Set(intentFlowEdges.map((e) => e.from).filter((id) => outcomeNodes.has(id)));
  const rejectsUsedAsTriggers = new Set(intentFlowEdges.map((e) => e.from).filter((id) => outcomeRejectNodes.has(id)));
  const intentsConsumedByOutcomeDecisions = new Set(outcomeFlowEdges.map((e) => e.from));
  const outcomesProducedByOutcomeDecisions = new Set(outcomeFlowEdges.map((e) => e.to));
  const rejectsProducedByOutcomeDecisions = new Set(rejectFlowEdges.map((e) => e.to));
  const intentsProducedByIntentDecisions = new Set(intentFlowEdges.map((e) => e.to));

  // All info usage from specs
  const allReadInfo = new Set<string>();
  const allWriteInfo = new Set<string>();
  for (const spec of Object.values(specs)) {
    for (const i of spec.requiredInfo) allReadInfo.add(i);
    for (const i of spec.affectedInfo) allWriteInfo.add(i);
  }

  // === ORPHAN DETECTION ===

  for (const outcome of outcomesUsedAsTriggers) {
    if (!outcomesProducedByOutcomeDecisions.has(outcome)) {
      warn("orphan_outcome", `Outcome '${outcome}' is used as a trigger but no outcome decision produces it`);
    }
  }

  for (const intent of intentsProducedByIntentDecisions) {
    if (!intentsConsumedByOutcomeDecisions.has(intent)) {
      warn("unconsumed_intent", `Intent '${intent}' is produced but no outcome decision is triggered by it`);
    }
  }

  for (const reject of rejectsProducedByOutcomeDecisions) {
    if (!rejectsUsedAsTriggers.has(reject)) {
      warn("unhandled_rejection", `Outcome rejection '${reject}' has no intent decision reacting to it`);
    }
  }

  // === DEAD END DETECTION ===

  for (const outcome of outcomesProducedByOutcomeDecisions) {
    if (!outcomesUsedAsTriggers.has(outcome)) {
      warn("dead_end_outcome", `Outcome '${outcome}' is produced but no intent decision is triggered by it`);
    }
  }

  // === INFO FLOW CONSISTENCY ===

  for (const info of allReadInfo) {
    if (!allWriteInfo.has(info)) {
      warn("info_never_written", `Info '${info}' is required by decisions but never affected by any outcome decision — where does it come from?`);
    }
  }

  for (const info of allWriteInfo) {
    if (!allReadInfo.has(info)) {
      warn("info_never_read", `Info '${info}' is affected by outcome decisions but never required by any decision — is anyone using it?`);
    }
  }

  for (const info of declaredInfos) {
    if (!allReadInfo.has(info) && !allWriteInfo.has(info)) {
      warn("info_declared_unused", `Info '${info}' is declared in the Info union but never referenced by any spec`);
    }
  }

  // === COMPLETENESS ===

  for (const [name, spec] of Object.entries(specs)) {
    if (spec.type === "intent" && spec.requiredInfo.length === 0) {
      warn("missing_required_info", "Intent decision has no requiredInfo — how is it deciding?", name);
    }
    if (spec.type === "outcome" && spec.affectedInfo.length === 0) {
      warn("missing_affected_info", "Outcome decision has no affectedInfo — what state does it change?", name);
    }
    for (const reject of spec.rejectsWithoutScenarios) {
      warn("missing_scenarios", `Reject '${reject}' has no scenarios`, name);
    }

    // Outcome decision condition rules
    if (spec.type === "outcome" && spec.choices.length > 0) {
      for (const choice of spec.choices) {
        const det = spec.choiceDetails[choice];
        if (spec.choices.length === 1 && (!det || det.condition !== "always")) {
          warn("single_outcome_not_always", `Outcome '${choice}' is the only success path — should have condition 'always'`, name);
        }
      }
      if (spec.choices.length > 1) {
        const hasAlways = spec.choices.some((choice) => {
          const det = spec.choiceDetails[choice];
          return det && det.condition === "always";
        });
        if (!hasAlways) {
          warn("missing_default_condition", `Outcome decision has ${spec.choices.length} success outcomes but none has condition 'always'`, name);
        }
      }
    }
  }

  // === STRUCTURAL ===

  // Multiple outcome decisions for same intent
  const intentTriggerCount: Record<string, string[]> = {};
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.type === "outcome") {
      if (!intentTriggerCount[spec.trigger]) intentTriggerCount[spec.trigger] = [];
      intentTriggerCount[spec.trigger].push(name);
    }
  }
  for (const [, specNames] of Object.entries(intentTriggerCount)) {
    if (specNames.length > 1) {
      warn("competing_outcome_decisions", `Intent '${specNames[0]}' triggers multiple outcome decisions: ${specNames.join(", ")}`);
    }
  }

  // Duplicate intent decisions
  const intentSigs: Record<string, string[]> = {};
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.type === "intent") {
      for (const choice of spec.choices) {
        const sig = `${spec.trigger}→${choice}`;
        if (!intentSigs[sig]) intentSigs[sig] = [];
        intentSigs[sig].push(name);
      }
    }
  }
  for (const [sig, specNames] of Object.entries(intentSigs)) {
    if (specNames.length > 1) {
      warn("duplicate_intent_decision", `Multiple intent decisions with same flow (${sig}): ${specNames.join(", ")}`);
    }
  }

  // Duplicate views
  const viewSigs: Record<string, string[]> = {};
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.type === "intent" && spec.requiredInfo.length > 0) {
      const sig = [...spec.requiredInfo].sort().join(",");
      if (!viewSigs[sig]) viewSigs[sig] = [];
      viewSigs[sig].push(name);
    }
  }
  for (const [sig, specNames] of Object.entries(viewSigs)) {
    if (specNames.length > 1) {
      warn("duplicate_views", `Same info set [${sig}] — could be the same view: ${specNames.join(", ")}`);
    }
  }

  // === BOUNDARY HINTS ===

  const aggregateSpecs: Record<string, Array<{ name: string; spec: ParsedSpec }>> = {};
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.aggregate) {
      if (!aggregateSpecs[spec.aggregate]) aggregateSpecs[spec.aggregate] = [];
      aggregateSpecs[spec.aggregate].push({ name, spec });
    }
  }
  for (const [agg, specList] of Object.entries(aggregateSpecs)) {
    if (specList.length < 2) continue;
    for (let i = 0; i < specList.length; i++) {
      for (let j = i + 1; j < specList.length; j++) {
        const a = specList[i], b = specList[j];
        const aInfos = new Set([...a.spec.requiredInfo, ...a.spec.affectedInfo]);
        const bInfos = new Set([...b.spec.requiredInfo, ...b.spec.affectedInfo]);
        if ([...aInfos].filter((x) => bInfos.has(x)).length === 0) {
          warn("aggregate_no_shared_info", `'${a.name}' and '${b.name}' in aggregate '${agg}' share no info — do they belong together?`);
        }
      }
    }
  }

  return results;
}
