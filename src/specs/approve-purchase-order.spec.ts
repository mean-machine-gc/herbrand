type ApprovePurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'approver_authorized' | 'purchase_order_pending_approval',
    'approve_purchase_order'
>

const approvePurchaseOrder: IntentDecisionSpec<ApprovePurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'department_manager' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    businessGoal: 'authorize spending and ensure procurement compliance',
    description: 'A department manager approves a purchase order for fulfillment',
    trigger: { type: 'success', outcome: 'purchase_order_created' },
    preconditions: {
        approver_authorized: {
            description: 'The approver has authority over this department and amount',
            requiredInfo: ['approver_authority'],
            scenarios: [
                { description: 'A manager from a different department tries to approve the PO' }
            ]
        },
        purchase_order_pending_approval: {
            description: 'The purchase order is in pending approval state',
            requiredInfo: ['purchase_order_status'],
            scenarios: [
                { description: 'Manager tries to approve an already approved PO' }
            ]
        }
    },
    producesIntent: {
        intent: 'approve_purchase_order',
        description: 'The purchase order is approved and sent to the supplier',
        requiredInfo: ['approver_authority', 'purchase_order_status'],
    },
}
