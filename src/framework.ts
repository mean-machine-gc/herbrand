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

type Decision<Type extends string, A extends Agent, Input extends string, Rejects extends string, Choices extends string> = {
    type: Type
    agent: A
    input: Input
    rejects: Rejects
    choices: Choices
}

type AnyDecision = Decision<any, any, any, any, any>

type DecisionSpec<D extends AnyDecision, Contexts extends string, Modules extends string, Aggregates extends string> = {
    type: D['type']
    agent: D['agent']
    context: Contexts
    module: Modules
    aggregate: Aggregates
    description: string
    shouldFailWith: Record<D['rejects'], {
        description: string,
        examples?: Array<{ description: string }>
    }>
    shouldSucceedWith: Record<D['choices'], {
        condition: string
        description: string
        examples?: Array<{ description: string }>
    }>
    shouldAssert: Record<D['choices'], Array<{
        tag: string
        description: string
    }>>
}
