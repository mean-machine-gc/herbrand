export function specLint(parsed) {
    const results = [];
    const { specs, declaredInfos } = parsed;
    function warn(rule, message, spec) {
        results.push({ level: "warning", rule, message, spec: spec ?? null });
    }
    function error(rule, message, spec) {
        results.push({ level: "error", rule, message, spec: spec ?? null });
    }
    for (const [name, spec] of Object.entries(specs)) {
        // Missing trigger
        if (!spec.trigger) {
            error("missing_trigger", "Decision has no trigger defined", name);
        }
        // No choices
        if (spec.choices.length === 0) {
            error("missing_choices", "Decision has no success choices defined", name);
        }
        // No rejects
        if (spec.rejects.length === 0) {
            warn("no_rejects", "Decision has no rejection paths — is nothing able to go wrong?", name);
        }
        // Missing description
        if (!spec.description) {
            warn("missing_description", "Decision has no description", name);
        }
        // Missing context
        if (!spec.context) {
            warn("missing_context", "Decision has no context assigned", name);
        }
        // Missing module
        if (!spec.module) {
            warn("missing_module", "Decision has no module assigned", name);
        }
        // Missing aggregate
        if (!spec.aggregate) {
            warn("missing_aggregate", "Decision has no aggregate assigned", name);
        }
        // Missing role on intent decisions
        if (spec.type === "intent" && !spec.role) {
            warn("missing_role", "Intent decision has no agent role — who decides?", name);
        }
        // Missing businessGoal on intent decisions
        if (spec.type === "intent" && !spec.businessGoal) {
            warn("missing_business_goal", "Intent decision has no business goal — why does the actor want this?", name);
        }
        // Outcome decision condition rules:
        // - Single outcome must have condition: 'always'
        // - Multiple outcomes must have at least one condition: 'always'
        if (spec.type === "outcome" && spec.choices.length > 0) {
            for (const choice of spec.choices) {
                const det = spec.choiceDetails[choice];
                if (spec.choices.length === 1 && (!det || det.condition !== "always")) {
                    error("single_outcome_not_always", `Outcome decision has one success outcome '${choice}' — it must have condition 'always'`, name);
                }
            }
            if (spec.choices.length > 1) {
                const hasAlways = spec.choices.some((choice) => {
                    const det = spec.choiceDetails[choice];
                    return det && det.condition === "always";
                });
                if (!hasAlways) {
                    error("missing_default_condition", `Outcome decision has ${spec.choices.length} success outcomes but none has condition 'always'`, name);
                }
            }
        }
        // Intent decisions without requiredInfo
        if (spec.type === "intent" && spec.requiredInfo.length === 0) {
            warn("missing_required_info", "Intent decision has no requiredInfo — how is it deciding?", name);
        }
        // Outcome decisions without affectedInfo
        if (spec.type === "outcome" && spec.affectedInfo.length === 0) {
            warn("missing_affected_info", "Outcome decision has no affectedInfo — what state does it change?", name);
        }
        // Rejects without scenarios
        for (const reject of spec.rejectsWithoutScenarios) {
            warn("missing_scenarios", `Reject '${reject}' has no scenarios`, name);
        }
    }
    // Declared info never used in any spec
    const allUsedInfo = new Set();
    for (const spec of Object.values(specs)) {
        for (const i of spec.requiredInfo)
            allUsedInfo.add(i);
        for (const i of spec.affectedInfo)
            allUsedInfo.add(i);
    }
    for (const info of declaredInfos) {
        if (!allUsedInfo.has(info)) {
            warn("info_declared_unused", `Info '${info}' is declared in the Info union but never referenced by any spec`);
        }
    }
    return results;
}
