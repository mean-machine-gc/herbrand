type CancelOrder = HumanIntentDecision<
    'order_created' | 'order_submitted',
    'order_not_yet_confirmed' | 'order_not_yet_cancelled',
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
    preconditions: {
        order_not_yet_confirmed: {
            description: 'The order has not been confirmed yet',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'Customer tries to cancel after receiving confirmation email' }
            ]
        },
        order_not_yet_cancelled: {
            description: 'The order has not already been cancelled',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'Customer tries to cancel an order that was already cancelled' }
            ]
        }
    },
    producesIntent: {
        intent: 'cancel_order',
        description: 'The order is cancelled and any held resources are released',
        requiredInfo: ['order_status'],
    },
}
