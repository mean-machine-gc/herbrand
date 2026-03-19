type RouteOrder = MachineIntentDecision<
    'order_submitted',
    'order_is_submitted',
    'route_order'
>

const routeOrder: IntentDecisionSpec<RouteOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    businessGoal: 'route orders to the appropriate fulfillment channel',
    description: 'The system determines the shipping route for a submitted order',
    trigger: { type: 'success', outcome: 'order_submitted' },
    preconditions: {
        order_is_submitted: {
            description: 'The order is in submitted state and ready for routing',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'System receives a routing request for an already routed order' }
            ]
        }
    },
    producesIntent: {
        intent: 'route_order',
        description: 'The order is queued for routing based on shipping preference',
        requiredInfo: ['order_status', 'shipping_preference'],
    },
}
