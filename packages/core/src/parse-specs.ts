import YAML from "yaml";
import type { SpecFile, ParsedSpec, ParsedSpecs } from "./types.js";
import { projectSchema, buildDecisionSchema, type Project } from "./schemas.js";

function toParsedSpec(spec: any): ParsedSpec {
  if (spec.type === "intent") {
    // Aggregate requiredInfo from preconditions + producesIntent
    const allReqInfo = new Set<string>();
    for (const det of Object.values(spec.preconditions) as any[]) {
      for (const i of det.requiredInfo) allReqInfo.add(i);
    }
    for (const i of spec.producesIntent.requiredInfo) allReqInfo.add(i);

    // Rejects without scenarios
    const rejectsWithoutScenarios = Object.entries(spec.preconditions)
      .filter(([, det]: [string, any]) => !det.scenarios || det.scenarios.length === 0)
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
      rejectDetails: Object.fromEntries(
        Object.entries(spec.preconditions).map(([key, det]: [string, any]) => [
          key,
          {
            description: det.description,
            requiredInfo: det.requiredInfo,
            scenarios: det.scenarios ?? [],
          },
        ])
      ),
      assertionDetails: {},
      requiredInfo: [...allReqInfo],
      affectedInfo: [],
      rejectsWithoutScenarios,
      role: spec.agent.role ?? (spec.agent.kind === "machine" ? "machine" : null),
      context: spec.context,
      module: spec.module,
      aggregate: spec.aggregate,
    };
  } else {
    // Outcome decision
    const allReqInfo = new Set<string>();
    for (const det of Object.values(spec.shouldFailWith) as any[]) {
      for (const i of det.requiredInfo) allReqInfo.add(i);
    }
    for (const det of Object.values(spec.shouldSucceedWith) as any[]) {
      for (const i of det.requiredInfo) allReqInfo.add(i);
    }

    const allAffectedInfo = new Set<string>();
    for (const assertions of Object.values(spec.shouldAssert) as any[][]) {
      for (const a of assertions) {
        for (const i of a.affectedInfo) allAffectedInfo.add(i);
      }
    }

    const rejectsWithoutScenarios = Object.entries(spec.shouldFailWith)
      .filter(([, det]: [string, any]) => !det.scenarios || det.scenarios.length === 0)
      .map(([key]) => key);

    return {
      type: "outcome",
      description: spec.description,
      businessGoal: null,
      trigger: spec.trigger,
      triggerType: "intent",
      choices: Object.keys(spec.shouldSucceedWith),
      choiceDetails: Object.fromEntries(
        Object.entries(spec.shouldSucceedWith).map(([key, det]: [string, any]) => [
          key,
          {
            condition: det.condition,
            description: det.description,
            requiredInfo: det.requiredInfo,
            scenarios: det.scenarios ?? [],
          },
        ])
      ),
      rejects: Object.keys(spec.shouldFailWith),
      rejectDetails: Object.fromEntries(
        Object.entries(spec.shouldFailWith).map(([key, det]: [string, any]) => [
          key,
          {
            description: det.description,
            requiredInfo: det.requiredInfo,
            scenarios: det.scenarios ?? [],
          },
        ])
      ),
      assertionDetails: Object.fromEntries(
        Object.entries(spec.shouldAssert).map(([key, assertions]: [string, any]) => [
          key,
          assertions.map((a: any) => ({
            tag: a.tag,
            description: a.description,
            affectedInfo: a.affectedInfo,
          })),
        ])
      ),
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

export function parseSpecs(files: SpecFile[]): ParsedSpecs {
  const specs: Record<string, ParsedSpec> = {};
  let declaredInfos: string[] = [];

  // Find and parse project file first
  const projectFile = files.find(f => f.fileName === "project.hb.yaml");
  let project: Project | null = null;

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
    if (file.fileName === "project.hb.yaml") continue;
    if (!file.fileName.endsWith(".hb.yaml")) continue;

    const name = file.fileName.replace(".hb.yaml", "");
    const raw = YAML.parse(file.content);
    const result = decisionSchema.safeParse(raw);

    if (result.success) {
      const key = file.sourceContext ? `${file.sourceContext}/${name}` : name;
      const parsed = toParsedSpec(result.data);
      parsed.sourceContext = file.sourceContext;
      specs[key] = parsed;
    }
    // Invalid specs are silently skipped — spec-lint will catch the issues
    // via the validation results exposed separately
  }

  return { specs, declaredInfos };
}
