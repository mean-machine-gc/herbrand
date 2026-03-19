import YAML from "yaml";
import { projectSchema, buildDecisionSchema } from "./schemas.js";
function toParsedSpec(spec) {
    if (spec.type === "intent") {
        // Aggregate requiredInfo from preconditions + producesIntent
        const allReqInfo = new Set();
        for (const det of Object.values(spec.preconditions)) {
            for (const i of det.requiredInfo)
                allReqInfo.add(i);
        }
        for (const i of spec.producesIntent.requiredInfo)
            allReqInfo.add(i);
        // Rejects without scenarios
        const rejectsWithoutScenarios = Object.entries(spec.preconditions)
            .filter(([, det]) => !det.scenarios || det.scenarios.length === 0)
            .map(([key]) => key);
        return {
            type: "intent",
            description: spec.description,
            businessGoal: spec.businessGoal,
            trigger: spec.trigger.type === "success" ? spec.trigger.outcome : spec.trigger.rejection,
            triggerType: spec.trigger.type,
            choices: [spec.producesIntent.intent],
            choiceDetails: {
                [spec.producesIntent.intent]: {
                    condition: null,
                    description: spec.producesIntent.description,
                    requiredInfo: spec.producesIntent.requiredInfo,
                    scenarios: [],
                },
            },
            rejects: Object.keys(spec.preconditions),
            rejectDetails: Object.fromEntries(Object.entries(spec.preconditions).map(([key, det]) => [
                key,
                {
                    description: det.description,
                    requiredInfo: det.requiredInfo,
                    scenarios: det.scenarios ?? [],
                },
            ])),
            assertionDetails: {},
            requiredInfo: [...allReqInfo],
            affectedInfo: [],
            rejectsWithoutScenarios,
            role: spec.agent.role ?? (spec.agent.kind === "machine" ? "machine" : null),
            context: spec.context,
            module: spec.module,
            aggregate: spec.aggregate,
        };
    }
    else {
        // Outcome decision
        const allReqInfo = new Set();
        for (const det of Object.values(spec.shouldFailWith)) {
            for (const i of det.requiredInfo)
                allReqInfo.add(i);
        }
        for (const det of Object.values(spec.shouldSucceedWith)) {
            for (const i of det.requiredInfo)
                allReqInfo.add(i);
        }
        const allAffectedInfo = new Set();
        for (const assertions of Object.values(spec.shouldAssert)) {
            for (const a of assertions) {
                for (const i of a.affectedInfo)
                    allAffectedInfo.add(i);
            }
        }
        const rejectsWithoutScenarios = Object.entries(spec.shouldFailWith)
            .filter(([, det]) => !det.scenarios || det.scenarios.length === 0)
            .map(([key]) => key);
        return {
            type: "outcome",
            description: spec.description,
            businessGoal: null,
            trigger: spec.trigger,
            triggerType: "intent",
            choices: Object.keys(spec.shouldSucceedWith),
            choiceDetails: Object.fromEntries(Object.entries(spec.shouldSucceedWith).map(([key, det]) => [
                key,
                {
                    condition: det.condition,
                    description: det.description,
                    requiredInfo: det.requiredInfo,
                    scenarios: det.scenarios ?? [],
                },
            ])),
            rejects: Object.keys(spec.shouldFailWith),
            rejectDetails: Object.fromEntries(Object.entries(spec.shouldFailWith).map(([key, det]) => [
                key,
                {
                    description: det.description,
                    requiredInfo: det.requiredInfo,
                    scenarios: det.scenarios ?? [],
                },
            ])),
            assertionDetails: Object.fromEntries(Object.entries(spec.shouldAssert).map(([key, assertions]) => [
                key,
                assertions.map((a) => ({
                    tag: a.tag,
                    description: a.description,
                    affectedInfo: a.affectedInfo,
                })),
            ])),
            requiredInfo: [...allReqInfo],
            affectedInfo: [...allAffectedInfo],
            rejectsWithoutScenarios,
            role: "machine",
            context: spec.context,
            module: spec.module,
            aggregate: spec.aggregate,
        };
    }
}
export function parseSpecs(files) {
    const specs = {};
    let declaredInfos = [];
    // Find and parse project file first
    const projectFile = files.find(f => f.fileName === "project.hb.yaml");
    let project = null;
    if (projectFile) {
        const raw = YAML.parse(projectFile.content);
        const result = projectSchema.safeParse(raw);
        if (result.success) {
            project = result.data;
            declaredInfos = project.info;
        }
    }
    // If no project file, return empty (can't validate specs without streams)
    if (!project) {
        return { specs, declaredInfos };
    }
    // Build decision schema from project streams
    const decisionSchema = buildDecisionSchema(project);
    // Parse spec files
    for (const file of files) {
        if (file.fileName === "project.hb.yaml")
            continue;
        if (!file.fileName.endsWith(".hb.yaml"))
            continue;
        const name = file.fileName.replace(".hb.yaml", "");
        const raw = YAML.parse(file.content);
        const result = decisionSchema.safeParse(raw);
        if (result.success) {
            specs[name] = toParsedSpec(result.data);
        }
        // Invalid specs are silently skipped — spec-lint will catch the issues
        // via the validation results exposed separately
    }
    return { specs, declaredInfos };
}
