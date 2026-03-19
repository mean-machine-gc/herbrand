type ProcessCreateOrder = MachineOutcomeDecision<
    'create_order',
    'invalid_order_data',
    'order_created'
>

const processCreateOrder: OutcomeDecisionSpec<ProcessCreateOrder, Contexts, Modules, Aggregates> = {
    type: 'outcome',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    description: 'The system processes the create order intent and persists a new order',
    trigger: 'create_order',
    shouldFailWith: {
        invalid_order_data: {
            description: 'The order data is malformed or contains inconsistencies',
            requiredInfo: ['customer_info', 'available_products'],
            scenarios: [
                { description: 'Product quantity is negative' },
                { description: 'Customer reference points to a deleted account' }
            ]
        }
    },
    shouldSucceedWith: {
        order_created: {
            condition: 'always',
            description: 'A new order is persisted in draft state',
            requiredInfo: ['customer_info', 'available_products'],
            scenarios: [
                { description: 'Customer creates an order with two valid products' }
            ]
        }
    },
    shouldAssert: {
        order_created: [
            {
                tag: 'order_in_draft_state',
                description: 'The order is persisted with status draft',
                affectedInfo: ['order_status']
            },
            {
                tag: 'order_has_line_items',
                description: 'The order contains the selected products as line items',
                affectedInfo: ['order_line_items']
            },
            {
                tag: 'order_linked_to_customer',
                description: 'The order is linked to the customer who created it',
                affectedInfo: ['order_customer_reference']
            }
        ]
    }
}
