export type SpecFile = {
    fileName: string;
    content: string;
};
export type RejectDetail = {
    description: string | null;
    requiredInfo: string[];
    scenarios: string[];
};
export type ChoiceDetail = {
    condition: string | null;
    description: string | null;
    requiredInfo: string[];
    scenarios: string[];
};
export type AssertionDetail = {
    tag: string;
    description: string;
    affectedInfo: string[];
};
export type ParsedSpec = {
    type: 'intent' | 'outcome';
    description: string | null;
    businessGoal: string | null;
    trigger: string;
    triggerType: 'success' | 'reject' | 'intent';
    choices: string[];
    choiceDetails: Record<string, ChoiceDetail>;
    rejects: string[];
    rejectDetails: Record<string, RejectDetail>;
    assertionDetails: Record<string, AssertionDetail[]>;
    requiredInfo: string[];
    affectedInfo: string[];
    rejectsWithoutScenarios: string[];
    role: string | null;
    context: string | null;
    module: string | null;
    aggregate: string | null;
};
export type ParsedSpecs = {
    specs: Record<string, ParsedSpec>;
    declaredInfos: string[];
};
export type GraphNode = {
    id: string;
    type: 'intent' | 'outcome' | 'outcome_reject' | 'view';
    role: string | null;
    infos?: string[];
};
export type GraphEdge = {
    from: string;
    to: string;
    type: 'intent_flow' | 'outcome_flow' | 'reject_flow' | 'view_to_intent' | 'info_flow';
    intentRejects?: string[];
    infos?: string[];
    spec?: string;
};
export type DecisionGraph = {
    nodes: GraphNode[];
    edges: GraphEdge[];
    specs: Record<string, ParsedSpec>;
    declaredInfos: string[];
};
export type LintResult = {
    level: 'error' | 'warning';
    rule: string;
    message: string;
    spec: string | null;
};
export type UserStoryPrecondition = {
    tag: string;
    description: string | null;
    requiredInfo: string[];
    scenarios: string[];
};
export type UserStoryOutcome = {
    outcome: string;
    condition: string | null;
    description: string | null;
    scenarios: string[];
    assertions: AssertionDetail[];
};
export type UserStoryConstraint = {
    tag: string;
    description: string | null;
    scenarios: string[];
};
export type UserStoryView = {
    id: string;
    infos: string[];
    role: string | null;
};
export type AcceptanceCriteria = {
    given: UserStoryPrecondition[];
    when: string;
    then: UserStoryOutcome[];
    shouldFailIf: UserStoryConstraint[];
};
export type DecisionTableRow = {
    type: 'success' | 'failure' | 'skipped';
    scenarioDescription: string | null;
    preconditions: Record<string, boolean>;
    constraints: Record<string, boolean>;
    outcome: string | null;
    assertions: string[];
    effects: string[];
};
export type DecisionTable = {
    preconditionColumns: string[];
    constraintColumns: string[];
    rows: DecisionTableRow[];
};
export type Scenario = {
    type: 'success' | 'failure' | 'skipped';
    tag: string;
    description: string | null;
    scenarios: string[];
};
export type UserStory = {
    name: string;
    role: string | null;
    intent: string;
    intentLabel: string;
    businessGoal: string | null;
    description: string | null;
    context: string | null;
    module: string | null;
    aggregate: string | null;
    acceptanceCriteria: AcceptanceCriteria;
    decisionTable: DecisionTable;
    scenarios: Scenario[];
    views: UserStoryView[];
    hasLinkedOutcome: boolean;
};
