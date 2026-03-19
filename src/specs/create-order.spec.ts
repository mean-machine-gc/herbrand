type CreateOrder = HumanIntentDecision<
    'order_created',
    'missing_customer_info' | 'invalid_product',
    'create_order'
>

const createOrder: DecisionSpec<CreateOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    description: 'A customer creates a new order by selecting products',
    shouldFailWith: {
        missing_customer_info: {
            description: 'The customer has not provided required contact or shipping information',
            examples: [
                { description: 'Customer submits order without a shipping address' },
                { description: 'Customer has no email on file' }
            ]
        },
        invalid_product: {
            description: 'One or more selected products do not exist or are not available for sale',
            examples: [
                { description: 'Customer selects a discontinued product' }
            ]
        }
    },
    shouldSucceedWith: {
        create_order: {
            condition: 'Customer info is valid and all products exist',
            description: 'A new order is created in draft state with the selected products',
            examples: [
                { description: 'Customer with complete profile selects two available products' }
            ]
        }
    },
    shouldAssert: {
        create_order: [
            {
                tag: 'order_in_draft_state',
                description: 'The order aggregate is persisted with status draft'
            },
            {
                tag: 'order_has_line_items',
                description: 'The order contains the selected products as line items'
            },
            {
                tag: 'order_linked_to_customer',
                description: 'The order is linked to the customer who created it'
            }
        ]
    }
}
