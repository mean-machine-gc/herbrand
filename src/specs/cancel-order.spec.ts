type CancelOrder = HumanIntentDecision<
    'order_created' | 'order_submitted',
    'order_already_confirmed' | 'order_already_cancelled',
    'cancel_order'
>

const cancelOrder: DecisionSpec<CancelOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    description: 'A customer cancels an order that has not yet been confirmed',
    trigger: 'order_created',
    shouldFailWith: {
        order_already_confirmed: {
            description: 'The order has already been confirmed and cannot be cancelled through this flow',
            requiredInfo: ['order_status'],
            examples: [
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
    shouldAssert: {
        cancel_order: [
            {
                tag: 'order_status_cancelled',
                description: 'The order status transitions to cancelled',
                affectedInfo: ['order_status']
            },
            {
                tag: 'payment_authorization_voided',
                description: 'Any pending payment authorization is voided',
                affectedInfo: ['payment_authorization']
            },
            {
                tag: 'stock_released',
                description: 'Reserved inventory is released back to available stock',
                affectedInfo: ['reserved_stock']
            }
        ]
    }
}
