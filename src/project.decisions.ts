/// domain events (past tense) and commands (imperative)
type Outcomes = 'order_created' | 'order_submitted' | 'order_cancelled' | 'order_confirmed'
    | 'purchase_order_created' | 'purchase_order_approved' | 'purchase_order_rejected'
type Intents = 'create_order' | 'submit_order' | 'cancel_order' | 'confirm_order'
    | 'create_purchase_order' | 'approve_purchase_order' | 'reject_purchase_order'

/// progressively populate as they become clear
type Contexts = 'ordering' | 'procurement'
type Modules = 'order_management' | 'purchasing'
type Aggregates = 'order-processing' | 'procurement-processing'

/// project decision types, pinned to this domain's outcomes and intents
type HumanIntentDecision<Outcome extends Outcomes, Rejects extends string, Intent extends Intents> = Decision<'intent', Human, Outcome, Rejects, Intent>
type MachineIntentDecision<Outcome extends Outcomes, Rejects extends string, Intent extends Intents> = Decision<'intent', Machine, Outcome, Rejects, Intent>
type MachineOutcomeDecision<Intent extends Intents, Rejects extends string, Outcome extends Outcomes> = Decision<'outcome', Machine, Intent, Rejects, Outcome>

