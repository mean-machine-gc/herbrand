# Example: Order Domain Discovery

## Conversation excerpt

> "So the customer picks their products, fills in their details, and places the order.
> Sometimes they forget their address or pick something we don't sell anymore — that should
> be caught. Once it's placed, the system needs to check payment and stock before confirming.
> If payment fails or we're out of stock, the order doesn't go through. Oh and customers
> should be able to cancel, but not after we've confirmed it."

## Scratchpad after listening

```markdown
## Session: 2026-03-18

### Observations
- "picks products, fills in details, places the order" — this is one action from the customer's perspective
- "sometimes they forget their address" — explicit failure case, customer-side
- "pick something we don't sell anymore" — another failure, product validation
- "system needs to check payment and stock" — this is a separate machine decision, happens after placement
- "payment fails or out of stock" — two distinct rejection reasons for confirmation
- "cancel, but not after confirmed" — cancellation has a guard based on order state

### Possible Decisions
| Who | Trigger | Produces | Rejects | Status |
|-----|---------|----------|---------|--------|
| customer | wants to order | create_order intent | missing info, bad product | ready |
| system | order submitted | order_confirmed outcome | payment, stock | ready |
| customer | wants to cancel | cancel_order intent | already confirmed | ready |

### Open Questions
- Is placing the order the same as submitting it, or are those two steps?
- Can the system cancel an order, or only the customer?
- What happens to a failed confirmation — does the customer get notified? Can they retry?

### Domain Vocabulary
| Term | Meaning | Notes |
|------|---------|-------|
| place an order | the act of creating + submitting? | need to clarify if one or two steps |
| doesn't go through | confirmation failure | they don't distinguish payment vs stock from user perspective |
```

## Resulting spec file: create-order.spec.ts

```typescript
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
        create_order: {
            condition: 'Customer info is valid and all products exist',
            description: 'A new order is created in draft state with the selected products',
            examples: [
                { description: 'Customer with complete profile selects two available products' }
            ]
        }
    },
    shouldAssert: {
        create_order: {
            assertion: 'Order exists in draft state with correct line items and customer reference',
            description: 'The order aggregate is persisted with status draft, linked to the customer and containing the selected products'
        }
    }
}
```

## What the agent said to the BA (not the framework)

> "So when a customer places an order, we need their address and valid products.
> If anything's missing or discontinued, we reject it. If everything checks out,
> the order is created. One thing I want to clarify — is placing the order and
> submitting it the same step, or does the customer first build the order and
> then explicitly submit it?"
