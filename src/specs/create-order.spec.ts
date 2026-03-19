type CreateOrder = HumanIntentDecision<
    'order_created',
    'missing_customer_info' | 'invalid_product',
    'create_order'
>

const createOrder: IntentDecisionSpec<CreateOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    businessGoal: 'purchase desired products',
    description: 'A customer creates a new order by selecting products',
    trigger: { type: 'success', outcome: 'order_created' },
    shouldFailWith: {
        missing_customer_info: {
            description: 'The customer has not provided required contact or shipping information',
            requiredInfo: ['customer_info'],
            scenarios: [
                { description: 'Customer submits order without a shipping address' },
                { description: 'Customer has no email on file' }
            ]
        },
        invalid_product: {
            description: 'One or more selected products do not exist or are not available for sale',
            requiredInfo: ['available_products'],
            scenarios: [
                { description: 'Customer selects a discontinued product' }
            ]
        }
    },
    shouldSucceedWith: {
        create_order: {
            condition: 'Customer info is valid and all products exist',
            description: 'A new order is created in draft state with the selected products',
            requiredInfo: ['customer_info', 'available_products'],
            scenarios: [
                { description: 'Customer with complete profile selects two available products' }
            ]
        }
    },
}
