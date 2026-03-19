export function buildDecisionGraph(parsed) {
    const { specs, declaredInfos } = parsed;
    const nodes = [];
    const edges = [];
    const intentSet = new Set();
    const outcomeSet = new Set();
    const outcomeRejectSet = new Set();
    // Classify nodes from specs
    for (const [, spec] of Object.entries(specs)) {
        if (spec.triggerType === "success")
            outcomeSet.add(spec.trigger);
        else if (spec.triggerType === "reject")
            outcomeRejectSet.add(spec.trigger);
        else if (spec.triggerType === "intent")
            intentSet.add(spec.trigger);
        for (const choice of spec.choices) {
            if (spec.type === "outcome")
                outcomeSet.add(choice);
            else
                intentSet.add(choice);
        }
        if (spec.type === "outcome") {
            for (const reject of spec.rejects)
                outcomeRejectSet.add(`rejected:${reject}`);
        }
    }
    // Map intents → role
    const intentToRole = {};
    for (const [, spec] of Object.entries(specs)) {
        if (spec.type === "intent") {
            for (const choice of spec.choices)
                intentToRole[choice] = spec.role ?? "unknown";
        }
    }
    // Map outcomes/rejects → role (via the intent that triggers the outcome decision)
    const outcomeToRole = {};
    for (const [, spec] of Object.entries(specs)) {
        if (spec.type === "outcome") {
            const role = intentToRole[spec.trigger] ?? "unknown";
            for (const choice of spec.choices)
                outcomeToRole[choice] = role;
            for (const reject of spec.rejects)
                outcomeToRole[`rejected:${reject}`] = role;
        }
    }
    // Create nodes
    for (const id of intentSet) {
        nodes.push({ id, type: "intent", role: intentToRole[id] ?? null });
    }
    for (const id of outcomeSet) {
        nodes.push({ id, type: "outcome", role: outcomeToRole[id] ?? null });
    }
    for (const id of outcomeRejectSet) {
        nodes.push({ id, type: "outcome_reject", role: outcomeToRole[id] ?? null });
    }
    const views = [];
    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type !== "intent" || spec.requiredInfo.length === 0)
            continue;
        for (const choice of spec.choices) {
            const viewId = `view_${name}_${choice}`;
            views.push({ id: viewId, infos: spec.requiredInfo, targetIntent: choice, role: spec.role });
            nodes.push({ id: viewId, type: "view", role: spec.role, infos: spec.requiredInfo });
        }
    }
    // Build edges
    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type === "intent") {
            for (const choice of spec.choices) {
                edges.push({ from: spec.trigger, to: choice, type: "intent_flow", intentRejects: spec.rejects, spec: name });
            }
        }
        else {
            for (const choice of spec.choices) {
                edges.push({ from: spec.trigger, to: choice, type: "outcome_flow", spec: name });
            }
            for (const reject of spec.rejects) {
                edges.push({ from: spec.trigger, to: `rejected:${reject}`, type: "reject_flow", spec: name });
            }
        }
    }
    // View → intent edges
    for (const view of views) {
        edges.push({ from: view.id, to: view.targetIntent, type: "view_to_intent" });
    }
    // Outcome → view info flow edges
    for (const [, spec] of Object.entries(specs)) {
        if (spec.type !== "outcome" || spec.affectedInfo.length === 0)
            continue;
        for (const choice of spec.choices) {
            for (const view of views) {
                const overlap = view.infos.filter((i) => spec.affectedInfo.includes(i));
                if (overlap.length > 0) {
                    edges.push({ from: choice, to: view.id, type: "info_flow", infos: overlap });
                }
            }
        }
    }
    return { nodes, edges, specs, declaredInfos };
}
