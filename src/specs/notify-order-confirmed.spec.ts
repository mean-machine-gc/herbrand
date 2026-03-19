type NotifyOrderConfirmed = MachineIntentDecision<
    'order_confirmed',
    'order_is_confirmed',
    'notify_order_confirmed'
>

const notifyOrderConfirmed: IntentDecisionSpec<NotifyOrderConfirmed, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    businessGoal: 'keep customers informed and maintain audit trail for confirmed orders',
    description: 'The system sends a confirmation notification and logs the event',
    trigger: { type: 'success', outcome: 'order_confirmed' },
    preconditions: {
        order_is_confirmed: {
            description: 'The order is in confirmed state',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'System receives duplicate confirmation event' }
            ]
        }
    },
    producesIntent: {
        intent: 'notify_order_confirmed',
        description: 'The system sends customer notification and creates audit log entry',
        requiredInfo: ['order_status', 'customer_email'],
    },
}
