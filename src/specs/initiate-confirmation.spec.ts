type InitiateConfirmation = MachineIntentDecision<
    'order_submitted',
    'order_is_submitted',
    'confirm_order'
>

const initiateConfirmation: IntentDecisionSpec<InitiateConfirmation, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    businessGoal: 'automatically process submitted orders for payment and stock verification',
    description: 'The system automatically initiates confirmation for a submitted order',
    trigger: { type: 'success', outcome: 'order_submitted' },
    preconditions: {
        order_is_submitted: {
            description: 'The order is in submitted state',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'System receives a duplicate submission event for an already confirmed order' }
            ]
        }
    },
    producesIntent: {
        intent: 'confirm_order',
        description: 'The system begins payment and stock verification',
        requiredInfo: ['order_status'],
    },
}
