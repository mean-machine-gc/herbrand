import { zodToJsonSchema } from "zod-to-json-schema";
import { projectSchema, buildDecisionSchema, type Project } from "./schemas.js";

export function generateProjectJsonSchema(): object {
  return zodToJsonSchema(projectSchema as any, {
    name: "HerbrandProject",
    $refStrategy: "none",
  });
}

export function generateDecisionJsonSchema(project: Project): object {
  const schema = buildDecisionSchema(project);
  return zodToJsonSchema(schema as any, {
    name: "HerbrandDecision",
    $refStrategy: "none",
  });
}
