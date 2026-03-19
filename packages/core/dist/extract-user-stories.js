export function extractUserStories(graph) {
    const { nodes, edges, specs } = graph;
    const stories = {};
    // Find intent specs — each one becomes a user story
    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type !== "intent")
            continue;
        const intent = spec.choices[0] ?? name;
        const intentLabel = intent.replace(/_/g, " ");
        // Find linked outcome decision via graph edges: intent → outcome_flow → outcome
        const outcomeEdge = edges.find((e) => e.type === "outcome_flow" && e.from === intent);
        const outcomeSpecName = outcomeEdge?.spec;
        const outcomeSpec = outcomeSpecName ? specs[outcomeSpecName] : null;
        // === ACCEPTANCE CRITERIA ===
        // Given: from intent spec rejects (preconditions)
        const given = spec.rejects.map((tag) => {
            const det = spec.rejectDetails[tag];
            return {
                tag,
                description: det?.description ?? null,
                requiredInfo: det?.requiredInfo ?? [],
                scenarios: det?.scenarios ?? [],
            };
        });
        // Then: from linked outcome decision's choices
        const then = [];
        if (outcomeSpec) {
            for (const choice of outcomeSpec.choices) {
                const det = outcomeSpec.choiceDetails[choice];
                const assertions = (outcomeSpec.assertionDetails[choice] ?? []).map((a) => ({
                    tag: a.tag,
                    description: a.description,
                    affectedInfo: a.affectedInfo,
                }));
                then.push({
                    outcome: choice,
                    condition: det?.condition ?? null,
                    description: det?.description ?? null,
                    scenarios: det?.scenarios ?? [],
                    assertions,
                });
            }
        }
        // Should Fail If: from linked outcome decision's rejects
        const shouldFailIf = [];
        if (outcomeSpec) {
            for (const tag of outcomeSpec.rejects) {
                const det = outcomeSpec.rejectDetails[tag];
                shouldFailIf.push({
                    tag,
                    description: det?.description ?? null,
                    scenarios: det?.scenarios ?? [],
                });
            }
        }
        const acceptanceCriteria = {
            given,
            when: intentLabel,
            then,
            shouldFailIf,
        };
        // === DECISION TABLE ===
        const preconditionColumns = spec.rejects;
        const constraintColumns = outcomeSpec?.rejects ?? [];
        const dtRows = [];
        // Success rows — one per outcome
        for (const t of then) {
            const preconditions = {};
            for (const p of preconditionColumns)
                preconditions[p] = true;
            const constraints = {};
            for (const c of constraintColumns)
                constraints[c] = true;
            dtRows.push({
                type: "success",
                scenarioDescription: t.condition !== "always" ? t.condition : null,
                preconditions,
                constraints,
                outcome: t.outcome,
                assertions: t.assertions.map((a) => a.tag),
                effects: t.assertions.flatMap((a) => a.affectedInfo),
            });
        }
        // Failure rows — one per constraint
        for (let i = 0; i < constraintColumns.length; i++) {
            const preconditions = {};
            for (const p of preconditionColumns)
                preconditions[p] = true;
            const constraints = {};
            for (let j = 0; j < constraintColumns.length; j++) {
                constraints[constraintColumns[j]] = j !== i;
            }
            const failDet = outcomeSpec?.rejectDetails[constraintColumns[i]];
            dtRows.push({
                type: "failure",
                scenarioDescription: failDet?.description ?? null,
                preconditions,
                constraints,
                outcome: `rejected:${constraintColumns[i]}`,
                assertions: [],
                effects: [],
            });
        }
        // Skipped rows — one per precondition
        for (let i = 0; i < preconditionColumns.length; i++) {
            const preconditions = {};
            for (let j = 0; j < preconditionColumns.length; j++) {
                preconditions[preconditionColumns[j]] = j !== i;
            }
            const constraints = {};
            for (const c of constraintColumns)
                constraints[c] = true; // N/A but marked true
            const skipDet = spec.rejectDetails[preconditionColumns[i]];
            dtRows.push({
                type: "skipped",
                scenarioDescription: skipDet?.description ?? null,
                preconditions,
                constraints,
                outcome: null,
                assertions: [],
                effects: [],
            });
        }
        const decisionTable = {
            preconditionColumns,
            constraintColumns,
            rows: dtRows,
        };
        // === SCENARIOS ===
        const scenarios = [];
        // Success scenarios from outcome choices
        for (const t of then) {
            scenarios.push({
                type: "success",
                tag: t.outcome,
                description: t.condition !== "always" ? t.condition : t.description,
                scenarios: t.scenarios,
            });
        }
        // Failure scenarios from outcome rejects
        for (const f of shouldFailIf) {
            scenarios.push({
                type: "failure",
                tag: f.tag,
                description: f.description,
                scenarios: f.scenarios,
            });
        }
        // Skipped scenarios from intent preconditions
        for (const g of given) {
            scenarios.push({
                type: "skipped",
                tag: g.tag,
                description: g.description,
                scenarios: g.scenarios,
            });
        }
        // === VIEWS ===
        // Find view nodes from graph that point to this intent
        const views = nodes
            .filter((n) => n.type === "view")
            .filter((n) => edges.some((e) => e.from === n.id && e.to === intent && e.type === "view_to_intent"))
            .map((n) => ({
            id: n.id,
            infos: n.infos ?? [],
            role: n.role,
        }));
        // === ASSEMBLE ===
        stories[name] = {
            name,
            role: spec.role,
            intent,
            intentLabel,
            businessGoal: spec.businessGoal,
            description: spec.description,
            context: spec.context,
            module: spec.module,
            aggregate: spec.aggregate,
            acceptanceCriteria,
            decisionTable,
            scenarios,
            views,
            hasLinkedOutcome: !!outcomeSpec,
        };
    }
    return stories;
}
