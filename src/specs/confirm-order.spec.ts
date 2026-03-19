type ConfirmOrder = MachineOutcomeDecision<
    'submit_order',
    'payment_failed' | 'stock_unavailable',
    'order_confirmed'
>

const confirmOrder: DecisionSpec<ConfirmOrder, Contexts, Modules, Aggregates> = {
    type: 'outcome',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    description: 'The system confirms a submitted order after verifying payment and stock',
    shouldFailWith: {
        payment_failed: {
            description: 'Payment could not be processed',
            examples: [
                { description: 'Credit card is declined' },
                { description: 'Payment gateway timeout' }
            ]
        },
        stock_unavailable: {
            description: 'One or more products are out of stock',
            examples: [
                { description: 'Last unit was purchased by another customer moments before' }
            ]
        }
    },
    shouldSucceedWith: {
        order_confirmed: {
            condition: 'Payment is successful and all items are in stock',
            description: 'The order is confirmed and ready for fulfillment',
        }
    },
    shouldAssert: {
        order_confirmed: [
            {
                tag: 'order_status_confirmed',
                description: 'The order status transitions to confirmed'
            },
            {
                tag: 'payment_captured',
                description: 'Payment has been charged to the customer'
            },
            {
                tag: 'stock_reserved',
                description: 'Inventory is decremented for the ordered items'
            }
        ]
    }
}
