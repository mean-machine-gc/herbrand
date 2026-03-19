type SubmitOrder = HumanIntentDecision<
    'order_created',
    'order_has_items' | 'order_in_draft',
    'submit_order'
>

const submitOrder: IntentDecisionSpec<SubmitOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    businessGoal: 'proceed with the purchase and receive the goods',
    description: 'A customer submits a draft order for processing',
    trigger: { type: 'success', outcome: 'order_created' },
    preconditions: {
        order_has_items: {
            description: 'The order contains at least one line item',
            requiredInfo: ['order_line_items'],
            scenarios: [
                { description: 'Customer tries to submit an order after removing all products' }
            ]
        },
        order_in_draft: {
            description: 'The order is in draft state and has not been submitted yet',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'Customer double-clicks the submit button' }
            ]
        }
    },
    producesIntent: {
        intent: 'submit_order',
        condition: 'Order has at least one line item and is in draft state',
        description: 'The order transitions from draft to submitted and is queued for confirmation',
        requiredInfo: ['order_status', 'order_line_items'],
    },
}
