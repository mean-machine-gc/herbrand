/// domain events (past tense) and commands (imperative)
type Outcomes = 'order_created' | 'order_submitted' | 'order_cancelled' | 'order_confirmed'
type Intents = 'create_order' | 'submit_order' | 'cancel_order' | 'confirm_order'

/// progressively populate as they become clear
type Contexts = 'ordering'
type Modules = 'order_management'
type Aggregates = 'order'

/// project decision types, pinned to this domain's outcomes and intents
type HumanIntentDecision<Rejects extends string, Choices extends string> = Decision<'intent', Human, Outcomes, Intents, Rejects, Choices>
type MachineIntentDecision<Rejects extends string, Choices extends string> = Decision<'intent', Machine, Outcomes, Intents, Rejects, Choices>
type MachineOutcomeDecision<Rejects extends string, Choices extends string> = Decision<'outcome', Machine, Intents, Outcomes, Rejects, Choices>

/// decision types

type CreateOrder = HumanIntentDecision<
    'missing_customer_info' | 'invalid_product',
    'order_created'
>

type SubmitOrder = HumanIntentDecision<
    'order_empty' | 'order_already_submitted',
    'order_submitted'
>

type ConfirmOrder = MachineOutcomeDecision<
    'payment_failed' | 'stock_unavailable',
    'order_confirmed'
>

type CancelOrder = HumanIntentDecision<
    'order_already_confirmed' | 'order_already_cancelled',
    'order_cancelled'
>

/// decision specs

const createOrder: DecisionSpec<CreateOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order',
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
        order_created: {
            condition: 'Customer info is valid and all products exist',
            description: 'A new order is created in draft state with the selected products',
            examples: [
                { description: 'Customer with complete profile selects two available products' }
            ]
        }
    },
    shouldAssert: {
        order_created: {
            assertion: 'Order exists in draft state with correct line items and customer reference',
            description: 'The order aggregate is persisted with status draft, linked to the customer and containing the selected products'
        }
    }
}

const submitOrder: DecisionSpec<SubmitOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order',
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
        order_submitted: {
            condition: 'Order has at least one line item and is in draft state',
            description: 'The order transitions from draft to submitted and is queued for confirmation',
        }
    },
    shouldAssert: {
        order_submitted: {
            assertion: 'Order status is submitted and a confirmation process has been initiated',
            description: 'The order is no longer editable and the system begins payment and stock verification'
        }
    }
}

const confirmOrder: DecisionSpec<ConfirmOrder, Contexts, Modules, Aggregates> = {
    type: 'outcome',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order',
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
        order_confirmed: {
            assertion: 'Order status is confirmed, payment is captured, and stock is reserved',
            description: 'The order cannot be modified, payment has been charged, and inventory is decremented'
        }
    }
}

const cancelOrder: DecisionSpec<CancelOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'customer' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order',
    description: 'A customer cancels an order that has not yet been confirmed',
    shouldFailWith: {
        order_already_confirmed: {
            description: 'The order has already been confirmed and cannot be cancelled through this flow',
            examples: [
                { description: 'Customer tries to cancel after receiving confirmation email' }
            ]
        },
        order_already_cancelled: {
            description: 'The order was already cancelled',
        }
    },
    shouldSucceedWith: {
        order_cancelled: {
            condition: 'Order is in draft or submitted state',
            description: 'The order is cancelled and any held resources are released',
        }
    },
    shouldAssert: {
        order_cancelled: {
            assertion: 'Order status is cancelled and no payment is captured',
            description: 'The order is terminal, any pending payment authorization is voided, and reserved stock is released'
        }
    }
}
