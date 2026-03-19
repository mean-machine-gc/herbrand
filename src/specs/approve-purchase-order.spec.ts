type ApprovePurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'not_authorized' | 'purchase_order_already_approved',
    'approve_purchase_order'
>

const approvePurchaseOrder: DecisionSpec<ApprovePurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'department_manager' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    description: 'A department manager approves a purchase order for fulfillment',
    trigger: 'purchase_order_created',
    shouldFailWith: {
        not_authorized: {
            description: 'The approver does not have authority over this department or amount',
            requiredInfo: ['approver_authority'],
            examples: [
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
    shouldAssert: {
        approve_purchase_order: [
            {
                tag: 'purchase_order_status_approved',
                description: 'The purchase order status transitions to approved',
                affectedInfo: ['purchase_order_status']
            },
            {
                tag: 'supplier_notified',
                description: 'The supplier is notified of the approved purchase order',
                affectedInfo: ['supplier_notification']
            }
        ]
    }
}
