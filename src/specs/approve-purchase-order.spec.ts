type ApprovePurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'not_authorized' | 'purchase_order_already_approved',
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
    shouldFailWith: {
        not_authorized: {
            description: 'The approver does not have authority over this department or amount',
            requiredInfo: ['approver_authority'],
            scenarios: [
                { description: 'A manager from a different department tries to approve the PO' }
            ]
        },
        purchase_order_already_approved: {
            description: 'The purchase order has already been approved',
            requiredInfo: ['purchase_order_status'],
        }
    },
    shouldSucceedWith: {
        approve_purchase_order: {
            condition: 'Approver has authority and PO is in pending approval state',
            description: 'The purchase order is approved and sent to the supplier',
            requiredInfo: ['approver_authority', 'purchase_order_status'],
        }
    },
}
