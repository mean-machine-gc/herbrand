type RejectPurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'rejector_authorized' | 'purchase_order_not_yet_rejected',
    'reject_purchase_order'
>

const rejectPurchaseOrder: IntentDecisionSpec<RejectPurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'department_manager' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    businessGoal: 'prevent unauthorized or unnecessary spending',
    description: 'A department manager rejects a purchase order',
    trigger: { type: 'success', outcome: 'purchase_order_created' },
    preconditions: {
        rejector_authorized: {
            description: 'The rejector has authority over this department',
            requiredInfo: ['approver_authority'],
            scenarios: [
                { description: 'A manager from a different department tries to reject the PO' }
            ]
        },
        purchase_order_not_yet_rejected: {
            description: 'The purchase order has not already been rejected',
            requiredInfo: ['purchase_order_status'],
        }
    },
    producesIntent: {
        intent: 'reject_purchase_order',
        condition: 'Rejector has authority and PO is in pending approval state',
        description: 'The purchase order is rejected and the budget reservation is released',
        requiredInfo: ['approver_authority', 'purchase_order_status'],
    },
}
