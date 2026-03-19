# Example: Discovering the "Create Order" Decision

## What the BA said

> "The customer picks products, fills in their details, and creates the order. If they haven't provided an address or their email is missing, it shouldn't go through. Same if they pick something discontinued."

## What the agent captured in scratchpad

```markdown
## Possible Decisions

| Who | Trigger | Produces | Rejects | Status |
|-----|---------|----------|---------|--------|
| customer | ? | create_order intent | missing info, bad product | raw |

## Open Questions
- What triggers the customer to create an order? Do they react to something, or initiate?
```

## What the agent asked

> "What prompts a customer to create an order? Is it after they've browsed the catalog, or after some other step?"

BA answered: "They just come to the site and start ordering. There's no prior step they're reacting to."

Agent noted: This is an entry point — triggered by an initial outcome like `order_created` that bootstraps the flow.

## Readiness test

1. **Who decides?** Customer (human) ✓
2. **What triggers it?** `order_created` outcome ✓
3. **What can go wrong?** Missing customer info, invalid product ✓
4. **What does it produce?** `create_order` intent ✓

All four answered → ready to formalize.

## What the agent wrote

### 1. Updated `project.decisions.ts`

Added to Outcomes: `'order_created'`
Added to Intents: `'create_order'`
Added to Info: `'customer_info'`, `'available_products'`

### 2. Created `src/specs/create-order.spec.ts`

(See examples/intent-human.spec.ts)

### 3. Validated

Called `get_pipeline_results` → spec-lint clean, no errors.

## What the agent said to the BA

> "Got it — so when a customer wants to create an order, we first check that they've provided their contact and shipping info, and that all the products they've selected are available. If anything's off, the order isn't created. Sound right?"
