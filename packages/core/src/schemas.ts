import { z } from "zod";

// Naming conventions
const snakeCase = z.string().regex(/^[a-z][a-z0-9_]*$/, "Must be snake_case");
const namespacedSnakeCase = z.string().regex(/^[a-z][a-z0-9_]*(?::[a-z][a-z0-9_]*)?$/, "Must be snake_case or module:snake_case");
const kebabCase = z.string().regex(/^[a-z][a-z0-9-]*$/, "Must be kebab-case");
const nonEmpty = z.string().min(1, "Must not be empty");

/** Split a stream name into module prefix and base name. Handles rejected: prefix. */
export function parseStreamNamespace(stream: string): { module: string | null; name: string } {
  const s = stream.startsWith("rejected:") ? stream.slice(9) : stream;
  const idx = s.indexOf(":");
  if (idx === -1) return { module: null, name: s };
  return { module: s.slice(0, idx), name: s.slice(idx + 1) };
}

// Reusable entry schemas (parameterized by project info enum)

type AnyZodEnum = z.ZodEnum<any>;

const infoEntry = (infoEnum: AnyZodEnum) => z.object({
  description: nonEmpty.describe("What this precondition or constraint checks"),
  requiredInfo: z.array(infoEnum).min(1, "Must require at least one info unit").describe("Info units needed to evaluate this check"),
  scenarios: z.array(nonEmpty).optional().default([]).describe("Concrete real-world situations that exercise this path"),
}).describe("A precondition (intent) or constraint (outcome) entry");

const successEntry = (infoEnum: AnyZodEnum) => z.object({
  condition: nonEmpty.describe("When this outcome is produced — use 'always' for unconditional, or a descriptive condition"),
  description: nonEmpty.describe("What happens when this outcome is produced"),
  requiredInfo: z.array(infoEnum).describe("Info units needed to evaluate this condition"),
  scenarios: z.array(nonEmpty).optional().default([]).describe("Concrete real-world situations that exercise this path"),
}).describe("A success outcome entry in an outcome decision");

const assertionEntry = (infoEnum: AnyZodEnum) => z.object({
  tag: snakeCase.describe("Snake_case tag identifying this assertion — used in decision tables and scenarios"),
  description: nonEmpty.describe("What must be true after this outcome is produced"),
  affectedInfo: z.array(infoEnum).min(1, "Assertion must affect at least one info unit").describe("Info units that change as a side effect"),
}).describe("A post-condition that must hold after a successful outcome");

// Project schema — defines the streams and boundaries

export const projectSchema = z.object({
  outcomes: z.array(namespacedSnakeCase).min(1, "Must have at least one outcome").describe("Things that happened — past tense domain events (e.g. order_management:order_created)"),
  intents: z.array(namespacedSnakeCase).min(1, "Must have at least one intent").describe("Things someone wants to do — imperative commands (e.g. order_management:create_order)"),
  info: z.array(snakeCase).min(1, "Must have at least one info unit").describe("Named information units in the global information space"),
  outcomeRejects: z.array(namespacedSnakeCase).describe("Failure constraints from outcome decisions that produce rejection events"),
  contexts: z.array(snakeCase).min(1, "Must have at least one context").describe("Semantic and language boundaries"),
  modules: z.array(snakeCase).min(1, "Must have at least one module").describe("Consistency boundaries — groups of aggregates"),
  aggregates: z.array(kebabCase).min(1, "Must have at least one aggregate").describe("Transactional boundaries — named after processes, not entities"),
}).describe("Project streams and boundaries — the foundation of the decision model");

export type Project = z.infer<typeof projectSchema>;

// Build decision schemas dynamically from project streams

export function buildDecisionSchema(project: Project) {
  const outcomesEnum = z.enum(project.outcomes as [string, ...string[]]).describe("Must be a declared outcome from project.hb.yaml");
  const intentsEnum = z.enum(project.intents as [string, ...string[]]).describe("Must be a declared intent from project.hb.yaml");
  const infoEnum = z.enum(project.info as [string, ...string[]]).describe("Must be a declared info unit from project.hb.yaml");
  const outcomeRejectsEnum = z.enum(project.outcomeRejects as [string, ...string[]]).describe("Must be a declared outcome reject from project.hb.yaml");
  const contextsEnum = z.enum(project.contexts as [string, ...string[]]).describe("Must be a declared context from project.hb.yaml");
  const modulesEnum = z.enum(project.modules as [string, ...string[]]).describe("Must be a declared module from project.hb.yaml");
  const aggregatesEnum = z.enum(project.aggregates as [string, ...string[]]).describe("Must be a declared aggregate from project.hb.yaml");

  const rejectionEnum = z.enum(
    project.outcomeRejects.map(r => `rejected:${r}`) as [string, ...string[]]
  ).describe("Rejection event in rejected:tag format");

  // Agent types

  const humanAgent = z.object({
    kind: z.literal("human").describe("A human actor making a decision"),
    role: nonEmpty.describe("The role of the human actor (e.g. customer, department_manager)"),
  }).describe("A human agent with a specific role");

  const machineAgent = z.object({
    kind: z.literal("machine").describe("An automated system process"),
  }).strict().describe("A machine agent — no role, fully automated");

  const llmAgent = z.object({
    kind: z.literal("llm").describe("An LLM-based agent — placeholder for future use"),
  }).strict().describe("An LLM agent — reserved for future iterations");

  // Intent decision

  const intentDecisionSchema = z.object({
    type: z.literal("intent").describe("This is an intent decision — it consumes outcomes and produces intents"),
    agent: z.union([humanAgent, machineAgent, llmAgent]).describe("Who makes this decision"),
    context: contextsEnum.describe("The semantic boundary this decision belongs to"),
    module: modulesEnum.describe("The consistency boundary this decision belongs to"),
    aggregate: aggregatesEnum.describe("The transactional boundary this decision belongs to"),
    businessGoal: nonEmpty.describe("Why the actor wants this — completes 'so to...' in the user story"),
    description: nonEmpty.describe("What this decision does in plain language"),
    trigger: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("success").describe("Triggered by a success outcome"),
        outcome: outcomesEnum.describe("The outcome that triggers this decision"),
      }),
      z.object({
        type: z.literal("reject").describe("Triggered by a rejection from an outcome decision"),
        rejection: rejectionEnum.describe("The rejection event that triggers this decision"),
      }),
    ]).describe("What triggers this decision — an outcome or a rejection event"),
    preconditions: z.record(snakeCase, infoEntry(infoEnum))
      .refine(
        (precs) => Object.keys(precs).length >= 1,
        "Must have at least one precondition"
      )
      .describe("Positive-statement guards — all must pass for the intent to be produced, otherwise silent skip"),
    producesIntent: z.object({
      intent: intentsEnum.describe("The intent this decision produces when preconditions pass"),
      description: nonEmpty.describe("What the intent represents in business terms"),
      requiredInfo: z.array(infoEnum).describe("Info units needed to produce this intent"),
    }).describe("The single intent produced by this decision"),
  }).describe("An intent decision — consumes an outcome or rejection, produces an intent if preconditions pass");

  // Outcome decision

  const outcomeDecisionSchema = z.object({
    type: z.literal("outcome").describe("This is an outcome decision — it consumes intents and produces outcomes"),
    agent: machineAgent.describe("Outcome decisions are always machine-processed"),
    context: contextsEnum.describe("The semantic boundary this decision belongs to"),
    module: modulesEnum.describe("The consistency boundary this decision belongs to"),
    aggregate: aggregatesEnum.describe("The transactional boundary this decision belongs to"),
    description: nonEmpty.describe("What this decision does in plain language"),
    trigger: intentsEnum.describe("The intent that triggers this decision"),
    shouldFailWith: z.record(z.string(), infoEntry(infoEnum))
      .superRefine((obj, ctx) => {
        for (const key of Object.keys(obj)) {
          if (!project.outcomeRejects.includes(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid constraint key '${key}'. Expected one of: ${project.outcomeRejects.join(", ")}`,
              path: [key],
            });
          }
        }
      })
      .describe("Failure constraints — if any fails, a rejected:tag event is produced"),
    shouldSucceedWith: z.record(z.string(), successEntry(infoEnum))
      .superRefine((obj, ctx) => {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must have at least one success outcome", path: [] });
        }
        for (const key of keys) {
          if (!project.outcomes.includes(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid outcome key '${key}'. Expected one of: ${project.outcomes.join(", ")}`,
              path: [key],
            });
          }
        }
        if (!Object.values(obj).some(o => o.condition === "always")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one success outcome must have condition 'always'", path: [] });
        }
      })
      .describe("Success outcomes — at least one must have condition 'always' as the default path"),
    shouldAssert: z.record(z.string(), z.array(assertionEntry(infoEnum)).min(1, "Each outcome must have at least one assertion"))
      .superRefine((obj, ctx) => {
        for (const key of Object.keys(obj)) {
          if (!project.outcomes.includes(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid assertion key '${key}'. Expected one of: ${project.outcomes.join(", ")}`,
              path: [key],
            });
          }
        }
      })
      .describe("Post-conditions per outcome — what must be true after, and which info units are affected"),
  }).describe("An outcome decision — consumes an intent, produces an outcome (or rejection) with side effects");

  // Combined with cross-field validation

  const schema = z.discriminatedUnion("type", [
    intentDecisionSchema,
    outcomeDecisionSchema,
  ]).describe("A Herbrand decision spec — either an intent decision or an outcome decision");

  return schema.superRefine((spec, ctx) => {
    if (spec.type === "outcome") {
      const succeedKeys = Object.keys(spec.shouldSucceedWith);
      const assertKeys = Object.keys(spec.shouldAssert);
      for (const k of succeedKeys) {
        if (!assertKeys.includes(k)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `shouldAssert is missing entry for outcome '${k}'`,
            path: ["shouldAssert"],
          });
        }
      }
    }
  });
}
