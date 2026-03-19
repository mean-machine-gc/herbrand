import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { projectSchema, buildDecisionSchema } from "./schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specsDir = path.resolve(__dirname, "../specs");

// Step 1: Parse and validate project.hb.yaml
const projectContent = fs.readFileSync(path.join(specsDir, "project.hb.yaml"), "utf-8");
const projectRaw = YAML.parse(projectContent);
const projectResult = projectSchema.safeParse(projectRaw);

if (!projectResult.success) {
  console.log("✗ project.hb.yaml invalid:");
  for (const issue of projectResult.error.issues) {
    console.log(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const project = projectResult.data;
console.log("✓ project.hb.yaml valid");
console.log(`  ${project.outcomes.length} outcomes, ${project.intents.length} intents, ${project.info.length} info, ${project.outcomeRejects.length} rejects`);

// Step 2: Build decision schema from project streams
const decisionSchema = buildDecisionSchema(project);

// Step 3: Parse and validate all decision specs against project streams
const specFiles = fs.readdirSync(specsDir).filter((f) => f.endsWith(".hb.yaml") && f !== "project.hb.yaml");

let errors = 0;
for (const file of specFiles) {
  const content = fs.readFileSync(path.join(specsDir, file), "utf-8");
  const raw = YAML.parse(content);
  const result = decisionSchema.safeParse(raw);

  if (result.success) {
    const spec = result.data;
    const trigger = spec.type === "intent"
      ? `${spec.trigger.type}:${spec.trigger.outcome || spec.trigger.rejection}`
      : spec.trigger;
    const choices = spec.type === "intent"
      ? [spec.producesIntent.intent]
      : Object.keys(spec.shouldSucceedWith);
    console.log(`✓ ${file} (${spec.type}) — trigger: ${trigger} → ${choices.join(", ")}`);
  } else {
    errors++;
    console.log(`✗ ${file} invalid:`);
    for (const issue of result.error.issues) {
      console.log(`  ${issue.path.join(".")}: ${issue.message}`);
    }
  }
}

if (errors === 0) {
  console.log(`\n✓ All ${specFiles.length} specs valid against project streams`);
} else {
  console.log(`\n✗ ${errors} spec(s) failed validation`);
}
