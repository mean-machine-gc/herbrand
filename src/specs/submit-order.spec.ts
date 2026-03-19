type SubmitOrder = HumanIntentDecision<
    'order_created',
    'order_empty' | 'order_already_submitted',
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
    shouldFailWith: {
        order_empty: {
            description: 'The order has no line items',
            requiredInfo: ['order_line_items'],
            scenarios: [
                { description: 'Customer tries to submit an order after removing all products' }
            ]
        },
        order_already_submitted: {
            description: 'The order has already been submitted',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'Customer double-clicks the submit button' }
            ]
        }
    },
    shouldSucceedWith: {
        submit_order: {
            condition: 'Order has at least one line item and is in draft state',
            description: 'The order transitions from draft to submitted and is queued for confirmation',
            requiredInfo: ['order_status', 'order_line_items'],
        }
    },
}
