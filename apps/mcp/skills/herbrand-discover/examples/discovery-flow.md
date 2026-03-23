# Example: Discovering the "Create Order" Decision

## What the BA said

> "The customer picks products, fills in their details, and creates the order. If they haven't provided an address or their email is missing, it shouldn't go through. Same if they pick something discontinued."

## What the agent captured in scratchpad

```markdown
### Create Order

| Field | Value |
|-------|-------|
| Who decides? | Customer |
| What triggers it? | ? |
| What can fail? | Missing customer info; product discontinued |
| What it produces? | Order creation request |
| Status | **raw** |

- Customer picks products, fills in details, creates the order
- Address and email are required
- Discontinued products should be caught
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

All four answered → updated status to `ready`.

## Updated scratchpad card

```markdown
### Create Order

| Field | Value |
|-------|-------|
| Who decides? | Customer |
| What triggers it? | Entry point — customer comes to the site |
| What can fail? | Missing customer info (address, email); product discontinued |
| What it produces? | Order creation request |
| Status | **ready** |

- Customer picks products, fills in details, creates the order
- Address and email are required
- Discontinued products should be caught
- This is an entry point — no prior step triggers it
```

## What the agent did next

Spawned the `herbrand-spec-agent` subagent to formalize the scratchpad entry. The spec agent:
1. Read the scratchpad card
2. Created `specs/create-order.hb.yaml` and updated `project.hb.yaml`
3. Validated with `get_pipeline_results` — clean
4. Updated the scratchpad card status to `formalized` with spec file references

## What the agent said to the BA

> "Got it — so when a customer wants to create an order, we first check that they've provided their contact and shipping info, and that all the products they've selected are available. If anything's off, the order isn't created. Sound right?"
