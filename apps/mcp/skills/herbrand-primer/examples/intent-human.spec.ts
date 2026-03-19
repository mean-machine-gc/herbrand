type CreateOrder = HumanIntentDecision<
    'order_created',
    'customer_info_provided' | 'products_available',
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
    preconditions: {
        customer_info_provided: {
            description: 'The customer has provided required contact and shipping information',
            requiredInfo: ['customer_info'],
            scenarios: [
                { description: 'Customer submits order without a shipping address' },
                { description: 'Customer has no email on file' }
            ]
        },
        products_available: {
            description: 'All selected products exist and are available for sale',
            requiredInfo: ['available_products'],
            scenarios: [
                { description: 'Customer selects a discontinued product' }
            ]
        }
    },
    producesIntent: {
        intent: 'create_order',
        description: 'A new order is created in draft state with the selected products',
        requiredInfo: ['customer_info', 'available_products'],
        scenarios: [
            { description: 'Customer with complete profile selects two available products' }
        ]
    },
}
