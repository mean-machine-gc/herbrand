type CancelOrder = HumanIntentDecision<
    'order_created' | 'order_submitted',
    'order_already_confirmed' | 'order_already_cancelled',
    'cancel_order'
>

const cancelOrder: IntentDecisionSpec<CancelOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    businessGoal: 'avoid being charged for unwanted products',
    description: 'A customer cancels an order that has not yet been confirmed',
    trigger: { type: 'success', outcome: 'order_created' },
    shouldFailWith: {
        order_already_confirmed: {
            description: 'The order has already been confirmed and cannot be cancelled through this flow',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'Customer tries to cancel after receiving confirmation email' }
            ]
        },
        order_already_cancelled: {
            description: 'The order was already cancelled',
            requiredInfo: ['order_status'],
        }
    },
    shouldSucceedWith: {
        cancel_order: {
            condition: 'Order is in draft or submitted state',
            description: 'The order is cancelled and any held resources are released',
            requiredInfo: ['order_status'],
        }
    },
}
