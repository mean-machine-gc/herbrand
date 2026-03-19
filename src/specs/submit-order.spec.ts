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
    shouldFailWith: {
        order_empty: {
            description: 'The order has no line items',
            examples: [
                { description: 'Customer tries to submit an order after removing all products' }
            ]
        },
        order_already_submitted: {
            description: 'The order has already been submitted',
            examples: [
                { description: 'Customer double-clicks the submit button' }
            ]
        }
    },
    shouldSucceedWith: {
        submit_order: {
            condition: 'Order has at least one line item and is in draft state',
            description: 'The order transitions from draft to submitted and is queued for confirmation',
        }
    },
    shouldAssert: {
        submit_order: [
            {
                tag: 'order_status_submitted',
                description: 'The order status transitions to submitted'
            },
            {
                tag: 'order_not_editable',
                description: 'The order can no longer be modified by the customer'
            },
            {
                tag: 'confirmation_process_initiated',
                description: 'The system begins payment and stock verification'
            }
        ]
    }
}
