type RejectPurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'not_authorized' | 'purchase_order_already_rejected',
    'reject_purchase_order'
>

const rejectPurchaseOrder: DecisionSpec<RejectPurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'department_manager' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    description: 'A department manager rejects a purchase order',
    trigger: 'purchase_order_created',
    shouldFailWith: {
        not_authorized: {
            description: 'The rejector does not have authority over this department',
            requiredInfo: ['approver_authority'],
            examples: [
                { description: 'A manager from a different department tries to reject the PO' }
            ]
        },
        purchase_order_already_rejected: {
            description: 'The purchase order has already been rejected',
            requiredInfo: ['purchase_order_status'],
        }
    },
    shouldSucceedWith: {
        reject_purchase_order: {
            condition: 'Rejector has authority and PO is in pending approval state',
            description: 'The purchase order is rejected and the budget reservation is released',
            requiredInfo: ['approver_authority', 'purchase_order_status'],
        }
    },
    shouldAssert: {
        reject_purchase_order: [
            {
                tag: 'purchase_order_status_rejected',
                description: 'The purchase order status transitions to rejected',
                affectedInfo: ['purchase_order_status']
            },
            {
                tag: 'budget_reservation_released',
                description: 'The reserved budget amount is released back to the department',
                affectedInfo: ['budget_reservation', 'department_budget']
            }
        ]
    }
}
