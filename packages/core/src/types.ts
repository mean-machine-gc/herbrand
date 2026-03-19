/// Core types for the Herbrand framework

export type RejectDetail = {
  description: string | null
  requiredInfo: string[]
  scenarios: string[]
}

export type ChoiceDetail = {
  condition: string | null
  description: string | null
  requiredInfo: string[]
  scenarios: string[]
}

export type AssertionDetail = {
  tag: string
  description: string
  affectedInfo: string[]
}

export type ParsedSpec = {
  type: 'intent' | 'outcome'
  description: string | null
  businessGoal: string | null
  trigger: string
  triggerType: 'success' | 'reject' | 'intent'
  choices: string[]
  choiceDetails: Record<string, ChoiceDetail>
  rejects: string[]
  rejectDetails: Record<string, RejectDetail>
  assertionDetails: Record<string, AssertionDetail[]>
  requiredInfo: string[]
  affectedInfo: string[]
  rejectsWithoutScenarios: string[]
  role: string | null
  context: string | null
  module: string | null
  aggregate: string | null
}

export type ParsedSpecs = {
  specs: Record<string, ParsedSpec>
  declaredInfos: string[]
}

export type GraphNode = {
  id: string
  type: 'intent' | 'outcome' | 'outcome_reject' | 'view'
  role: string | null
  infos?: string[]
}

export type GraphEdge = {
  from: string
  to: string
  type: 'intent_flow' | 'outcome_flow' | 'reject_flow' | 'view_to_intent' | 'info_flow'
  intentRejects?: string[]
  infos?: string[]
  spec?: string
}

export type DecisionGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  specs: Record<string, ParsedSpec>
  declaredInfos: string[]
}

export type LintResult = {
  level: 'error' | 'warning'
  rule: string
  message: string
  spec: string | null
}

export type SpecInput = {
  name: string
  type: 'intent' | 'outcome'
  trigger: string
  triggerType: 'success' | 'reject' | 'intent'
  role?: string
  context?: string
  module?: string
  aggregate?: string
  businessGoal?: string
  description?: string
  preconditions?: Record<string, { description: string; requiredInfo: string[]; scenarios?: string[] }>
  producesIntent?: { intent: string; description: string; requiredInfo: string[] }
  shouldFailWith?: Record<string, { description: string; requiredInfo: string[]; scenarios?: string[] }>
  shouldSucceedWith?: Record<string, { condition: string; description: string; requiredInfo: string[]; scenarios?: string[] }>
  shouldAssert?: Record<string, Array<{ tag: string; description: string; affectedInfo: string[] }>>
}

export type SpecUpdate = {
  name: string
  changes: Partial<SpecInput>
}
