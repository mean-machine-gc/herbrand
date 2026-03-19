/// agents

type Human = {
    kind: 'human'
    role: string
}

type Llm = {
    kind: 'llm'
}

type Machine = {
    kind: 'machine'
}

type Agent =
    | Human
    | Llm
    | Machine

/// streams

type Rejection = `rejected:${string}`

/// decision (internal, use helpers below)

type Decision<Type extends 'intent' | 'outcome', A extends Agent, Input extends string, Info extends string, Rejects extends string, Choices extends string> = {
    type: Type
    agent: A
    input: Input
    info: Info
    rejects: Rejects
    choices: Choices
}

type AnyDecision = Decision<any, any, any, any, any, any>

/// decision helpers — projects should narrow these with their own unions

type IntentDecision<
    A extends Agent,
    Trigger extends string,
    Info extends string,
    Rejects extends string,
    Choice extends string
> = Decision<'intent', A, Trigger, Info, Rejects, Choice>

type OutcomeDecision<
    Trigger extends string,
    Info extends string,
    Rejects extends string,
    Choice extends string
> = Decision<'outcome', Machine, Trigger, Info, Rejects, Choice>

/// spec types

type IntentDecisionSpec<D extends AnyDecision, Contexts extends string, Modules extends string, Aggregates extends string> = {
    type: D['type']
    agent: D['agent']
    context: Contexts
    module: Modules
    aggregate: Aggregates
    description: string
    trigger:
        | { type: 'success', outcome: D['input'] }
        | { type: 'reject', rejection: D['input'] }
    shouldFailWith: Record<D['rejects'], {
        description: string
        requiredInfo: Array<D['info']>
        examples?: Array<{ description: string }>
    }>
    shouldSucceedWith: Record<D['choices'], {
        condition: string
        description: string
        requiredInfo: Array<D['info']>
        examples?: Array<{ description: string }>
    }>
}

type OutcomeDecisionSpec<D extends AnyDecision, Contexts extends string, Modules extends string, Aggregates extends string> = {
    type: D['type']
    agent: D['agent']
    context: Contexts
    module: Modules
    aggregate: Aggregates
    description: string
    trigger: D['input']
    shouldFailWith: Record<D['rejects'], {
        description: string
        requiredInfo: Array<D['info']>
        examples?: Array<{ description: string }>
    }>
    shouldSucceedWith: Record<D['choices'], {
        condition: string
        description: string
        requiredInfo: Array<D['info']>
        examples?: Array<{ description: string }>
    }>
    shouldAssert: Record<D['choices'], Array<{
        tag: string
        description: string
        affectedInfo: Array<D['info']>
    }>>
}
