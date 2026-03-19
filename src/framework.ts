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

type Decision<Type extends string, A extends Agent, Input extends string, Info extends string, Rejects extends string, Choices extends string> = {
    type: Type
    agent: A
    input: Input
    info: Info
    rejects: Rejects
    choices: Choices
}

type AnyDecision = Decision<any, any, any, any, any, any>

type DecisionSpec<D extends AnyDecision, Contexts extends string, Modules extends string, Aggregates extends string> = {
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
