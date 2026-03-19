type ProcessFulfillOrder = MachineOutcomeDecision<
    'fulfill_order',
    'fulfillment_failed',
    'order_fulfilled'
>

const processFulfillOrder: OutcomeDecisionSpec<ProcessFulfillOrder, Contexts, Modules, Aggregates> = {
    type: 'outcome',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    description: 'The system fulfills the order by picking, packing and shipping',
    trigger: 'fulfill_order',
    shouldFailWith: {
        fulfillment_failed: {
            description: 'The order could not be fulfilled due to a logistics issue',
            requiredInfo: ['stock_levels', 'order_line_items'],
            scenarios: [
                { description: 'Warehouse reports damaged goods for an item in the order' },
                { description: 'Shipping provider rejects the delivery address' }
            ]
        }
    },
    shouldSucceedWith: {
        order_fulfilled: {
            condition: 'always',
            description: 'The order is fulfilled and shipped to the customer',
            requiredInfo: ['stock_levels', 'order_line_items'],
            scenarios: [
                { description: 'All items are in stock and successfully shipped' }
            ]
        }
    },
    shouldAssert: {
        order_fulfilled: [
            {
                tag: 'order_status_fulfilled',
                description: 'The order status transitions to fulfilled',
                affectedInfo: ['order_status']
            },
            {
                tag: 'stock_decremented',
                description: 'Physical stock is decremented for shipped items',
                affectedInfo: ['stock_levels']
            }
        ]
    }
}
