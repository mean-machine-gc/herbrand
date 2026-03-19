/// domain events (past tense) and commands (imperative)
type Outcomes = 'order_created' | 'order_submitted' | 'order_cancelled' | 'order_confirmed'
    | 'purchase_order_created' | 'purchase_order_approved' | 'purchase_order_rejected'
type Intents = 'create_order' | 'submit_order' | 'cancel_order' | 'confirm_order'
    | 'create_purchase_order' | 'approve_purchase_order' | 'reject_purchase_order'

type Info =
    /// ordering
    | 'customer_info'
    | 'available_products'
    | 'order_status'
    | 'order_line_items'
    | 'order_customer_reference'
    | 'order_editability'
    | 'payment_status'
    | 'stock_levels'
    | 'payment_authorization'
    | 'reserved_stock'
    /// procurement
    | 'supplier_status'
    | 'department_budget'
    | 'purchase_order_status'
    | 'purchase_order_supplier_reference'
    | 'budget_reservation'
    | 'approver_authority'
    | 'supplier_notification'

/// progressively populate as they become clear
type Contexts = 'ordering' | 'procurement'
type Modules = 'order_management' | 'purchasing'
type Aggregates = 'order-processing' | 'procurement-processing'

/// project decision types, pinned to this domain's outcomes and intents
type HumanIntentDecision<Outcome extends Outcomes, Rejects extends string, Intent extends Intents> = Decision<'intent', Human,  Outcome, Info, Rejects, Intent>
type MachineIntentDecision<Outcome extends Outcomes, Rejects extends string, Intent extends Intents> = Decision<'intent', Machine,  Outcome, Info, Rejects, Intent>
type MachineOutcomeDecision<Intent extends Intents, Rejects extends string, Outcome extends Outcomes> = Decision<'outcome', Machine, Intent, Info, Rejects, Outcome>

