/**
 * Zod schemas for all authored types.
 *
 * These are the source of truth for:
 *   1. TypeScript types (via z.infer)
 *   2. Runtime validation (via z.parse / z.safeParse)
 *   3. JSON Schema generation (via zod-to-json-schema, for VS Code YAML validation)
 *
 * Only authored types live here — things the user writes in YAML.
 * Derived types (DecisionGraph, DerivedView, System) stay as plain TypeScript.
 */

import { z } from 'zod';

// ============================================================
// Info Effects
// ============================================================

export const InfoEffectSchema = z.object({
  point: z.string().describe('Which info point is affected'),
  description: z.string().describe('How the info point is modified'),
});

// ============================================================
// Preconditions & Constraints
// ============================================================

export const PreconditionSchema = z.object({
  id: z.string(),
  description: z.string(),
  reads: z.array(z.string()).describe('Info points this precondition needs to evaluate'),
});

export const ConstraintSchema = z.object({
  id: z.string(),
  description: z.string(),
  reads: z.array(z.string()).describe('Info points this constraint needs to evaluate'),
});

// ============================================================
// Outcome specs
// ============================================================

export const OutcomeSpecSchema = z.object({
  kind: z.string(),
  description: z.string(),
  effects: z.array(InfoEffectSchema).describe('Info points this outcome creates or modifies'),
});

export const ConditionalOutcomeSpecSchema = z.object({
  condition: z.object({
    description: z.string(),
    reads: z.array(z.string()).describe('Info points the condition needs to evaluate'),
  }),
  outcome: OutcomeSpecSchema,
});

// ============================================================
// Policy
// ============================================================

export const PolicySchema = z.object({
  id: z.string(),
  type: z.literal('policy').describe('Discriminator for YAML file type'),
  description: z.string(),
  businessGoal: z.string().optional().describe('The business goal this policy serves'),
  context: z.string().describe('Execution context ID where this policy runs'),
  actor: z.string().optional().describe('Actor ID who executes this policy'),
  activatedBy: z.array(z.string()).min(1).describe('Outcome kinds that activate this policy'),
  preconditions: z.array(PreconditionSchema).describe('Preconditions — ALL must pass'),
  emits: z.string().describe('The intent kind this policy emits on success'),
  processes: z.array(z.string()).optional().describe('Business processes this decision participates in'),
});

// ============================================================
// Operation
// ============================================================

export const OperationSchema = z.object({
  id: z.string(),
  type: z.literal('operation').describe('Discriminator for YAML file type'),
  description: z.string(),
  context: z.string().describe('Execution context ID where this operation runs'),
  actor: z.string().optional().describe('Actor ID who executes this operation'),
  activatedBy: z.array(z.string()).min(1).describe('Intent kinds that activate this operation'),
  constraints: z.array(ConstraintSchema).describe('Success constraints — ALL must pass'),
  unconditionalOutcome: OutcomeSpecSchema.describe('Always emitted on success'),
  conditionalOutcomes: z.array(ConditionalOutcomeSpecSchema).describe('Conditionally emitted on success'),
  processes: z.array(z.string()).optional().describe('Business processes this decision participates in'),
});

// ============================================================
// Decision (discriminated union for YAML parsing)
// ============================================================

export const DecisionSchema = z.discriminatedUnion('type', [
  PolicySchema,
  OperationSchema,
]);

// ============================================================
// Execution Contexts (discriminated union)
// ============================================================

export const SoftwareContextSchema = z.object({
  type: z.literal('software'),
  id: z.string(),
  description: z.string(),
  boundary: z.enum(['internal', 'external']).describe('Is this the system under design, or an external dependency?'),
});

export const InstitutionalContextSchema = z.object({
  type: z.literal('institutional'),
  id: z.string(),
  description: z.string(),
  kind: z.enum(['role-authority', 'ceremony', 'department', 'committee']).describe('What kind of institutional structure'),
});

export const ExecutionContextSchema = z.discriminatedUnion('type', [
  SoftwareContextSchema,
  InstitutionalContextSchema,
]);

// ============================================================
// Actors (discriminated union)
// ============================================================

export const HumanActorSchema = z.object({
  type: z.literal('human'),
  id: z.string(),
  role: z.string().describe('The human role'),
});

export const LlmActorSchema = z.object({
  type: z.literal('llm'),
  id: z.string(),
  description: z.string(),
});

export const MachineActorSchema = z.object({
  type: z.literal('machine'),
  id: z.string(),
  description: z.string(),
});

export const ActorSchema = z.discriminatedUnion('type', [
  HumanActorSchema,
  LlmActorSchema,
  MachineActorSchema,
]);

// ============================================================
// Process Definition
// ============================================================

export const ProcessDefinitionSchema = z.object({
  id: z.string(),
  description: z.string(),
  startsWith: z.array(z.string()).describe('Entry point signal kinds'),
  endsWith: z.array(z.string()).describe('Terminal signal kinds'),
});

// ============================================================
// System YAML file schema
// ============================================================

export const SystemFileSchema = z.object({
  contexts: z.array(ExecutionContextSchema),
  actors: z.array(ActorSchema),
  processes: z.array(ProcessDefinitionSchema).optional(),
});

// ============================================================
// SystemSpec (full system input for buildSystem)
// ============================================================

export const SystemSpecSchema = z.object({
  contexts: z.array(ExecutionContextSchema),
  policies: z.array(PolicySchema.omit({ type: true })),
  operations: z.array(OperationSchema.omit({ type: true })),
  actors: z.array(ActorSchema),
  processes: z.array(ProcessDefinitionSchema).optional(),
});

// ============================================================
// Schemas without the `type` discriminator (for internal use)
// When building a system programmatically, the `type` field is optional.
// ============================================================

const PolicySchemaInternal = PolicySchema.omit({ type: true });
const OperationSchemaInternal = OperationSchema.omit({ type: true });

// ============================================================
// Inferred types
// ============================================================

export type InfoEffect = z.infer<typeof InfoEffectSchema>;
export type Precondition = z.infer<typeof PreconditionSchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type OutcomeSpec = z.infer<typeof OutcomeSpecSchema>;
export type ConditionalOutcomeSpec = z.infer<typeof ConditionalOutcomeSpecSchema>;
export type Policy = z.infer<typeof PolicySchemaInternal>;
export type Operation = z.infer<typeof OperationSchemaInternal>;
export type SoftwareContext = z.infer<typeof SoftwareContextSchema>;
export type InstitutionalContext = z.infer<typeof InstitutionalContextSchema>;
export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;
export type HumanActor = z.infer<typeof HumanActorSchema>;
export type LlmActor = z.infer<typeof LlmActorSchema>;
export type MachineActor = z.infer<typeof MachineActorSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type ProcessDefinition = z.infer<typeof ProcessDefinitionSchema>;
export type SystemSpec = z.infer<typeof SystemSpecSchema>;
