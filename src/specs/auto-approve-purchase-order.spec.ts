type AutoApprovePurchaseOrder = MachineIntentDecision<
    'purchase_order_created',
    'amount_below_threshold',
    'approve_purchase_order'
>

const autoApprovePurchaseOrder: IntentDecisionSpec<AutoApprovePurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'machine' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    businessGoal: 'streamline low-value purchases by auto-approving below threshold',
    description: 'The system automatically approves purchase orders below the auto-approval threshold',
    trigger: { type: 'success', outcome: 'purchase_order_created' },
    preconditions: {
        amount_below_threshold: {
            description: 'The purchase order amount is below the auto-approval threshold',
            requiredInfo: ['purchase_order_amount', 'auto_approval_threshold'],
            scenarios: [
                { description: 'PO for $500 when threshold is $1000 — auto-approved' },
                { description: 'PO for $5000 when threshold is $1000 — skipped, requires manual approval' }
            ]
        }
    },
    producesIntent: {
        intent: 'approve_purchase_order',
        description: 'The purchase order is automatically approved without manager intervention',
        requiredInfo: ['purchase_order_amount', 'auto_approval_threshold'],
    },
}
