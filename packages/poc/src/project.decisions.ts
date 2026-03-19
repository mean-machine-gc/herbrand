/// domain events (past tense) and commands (imperative)
type Outcomes = 'order_created' | 'order_submitted' | 'order_cancelled' | 'order_confirmed' | 'order_fulfilled'
    | 'order_routed_express' | 'order_routed_standard'
    | 'customer_email_sent' | 'order_audit_logged'
    | 'purchase_order_created' | 'purchase_order_approved' | 'purchase_order_rejected'
type Intents = 'create_order' | 'submit_order' | 'cancel_order' | 'confirm_order'
    | 'create_purchase_order' | 'approve_purchase_order' | 'reject_purchase_order'
    | 'fulfill_order' | 'route_order' | 'notify_order_confirmed'

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
    /// routing & notifications
    | 'shipping_preference'
    | 'order_route'
    | 'customer_email'
    | 'audit_log'
    /// procurement thresholds
    | 'purchase_order_amount'
    | 'auto_approval_threshold'

/// progressively populate as they become clear
type Contexts = 'ordering' | 'procurement'
type Modules = 'order_management' | 'purchasing'
type Aggregates = 'order-processing' | 'procurement-processing'

/// outcome decision rejects — only these can trigger reactive intent decisions
type OutcomeRejects = 'payment_failed' | 'stock_unavailable'
    | 'invalid_order_data' | 'order_not_cancellable'
    | 'invalid_purchase_order_data' | 'approval_processing_error' | 'rejection_processing_error'
    | 'fulfillment_failed'
    | 'routing_failed' | 'notification_failed'

/// project decision helpers — narrow framework helpers with this domain's unions

type HumanIntentDecision<
    Trigger extends Outcomes | Rejection<OutcomeRejects>,
    Rejects extends string,
    Choice extends Intents
> = IntentDecision<Human, Trigger, Info, Rejects, Choice>

type MachineIntentDecision<
    Trigger extends Outcomes | Rejection<OutcomeRejects>,
    Rejects extends string,
    Choice extends Intents
> = IntentDecision<Machine, Trigger, Info, Rejects, Choice>

type MachineOutcomeDecision<
    Trigger extends Intents,
    Rejects extends OutcomeRejects,
    Choice extends Outcomes
> = OutcomeDecision<Trigger, Info, Rejects, Choice>

