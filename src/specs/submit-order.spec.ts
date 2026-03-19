type SubmitOrder = HumanIntentDecision<
    'order_created',
    'order_empty' | 'order_already_submitted',
    'submit_order'
>

const submitOrder: DecisionSpec<SubmitOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    description: 'A customer submits a draft order for processing',
    trigger: 'order_created',
    shouldFailWith: {
        order_empty: {
            description: 'The order has no line items',
            requiredInfo: ['order_line_items'],
            examples: [
                { description: 'Customer tries to submit an order after removing all products' }
            ]
        },
        order_already_submitted: {
            description: 'The order has already been submitted',
            requiredInfo: ['order_status'],
            examples: [
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
    shouldAssert: {
        submit_order: [
            {
                tag: 'order_status_submitted',
                description: 'The order status transitions to submitted',
                affectedInfo: ['order_status']
            },
            {
                tag: 'order_not_editable',
                description: 'The order can no longer be modified by the customer',
                affectedInfo: ['order_editability']
            },
            {
                tag: 'confirmation_process_initiated',
                description: 'The system begins payment and stock verification',
                affectedInfo: []
            }
        ]
    }
}
