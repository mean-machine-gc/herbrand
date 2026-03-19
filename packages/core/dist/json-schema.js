import { zodToJsonSchema } from "zod-to-json-schema";
import { projectSchema, buildDecisionSchema } from "./schemas.js";
export function generateProjectJsonSchema() {
    return zodToJsonSchema(projectSchema, {
        name: "HerbrandProject",
        $refStrategy: "none",
    });
}
export function generateDecisionJsonSchema(project) {
    const schema = buildDecisionSchema(project);
    return zodToJsonSchema(schema, {
        name: "HerbrandDecision",
        $refStrategy: "none",
    });
}
