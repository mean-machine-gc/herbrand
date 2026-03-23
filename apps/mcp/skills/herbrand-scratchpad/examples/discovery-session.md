# Order Processing — Discovery Session 2026-03-18

## Raw Quotes

> "The customer picks their products, fills in their details, and places the order."

> "Sometimes they forget their address or pick something we don't sell anymore — that should be caught."

> "Once it's placed, the system needs to check payment and stock before confirming."

> "If payment fails or we're out of stock, the order doesn't go through."

> "Customers should be able to cancel, but not after we've confirmed it."

## Decision Cards

### Create Order

| Field | Value |
|-------|-------|
| Who decides? | Customer |
| What triggers it? | Wants to order |
| What can fail? | Missing info; product no longer available |
| What it produces? | Order creation request |
| Status | **formalized** |
| Spec files | `create-order.hb.yaml` |

- Customer picks products, fills in details, places order
- Address and email must be provided
- Products must be currently available (not discontinued)

### Confirm Order

| Field | Value |
|-------|-------|
| Who decides? | System (automatic) |
| What triggers it? | Order submitted |
| What can fail? | Payment fails; stock unavailable |
| What it produces? | Order confirmed |
| Status | **formalized** |
| Spec files | `confirm-order.hb.yaml` |

- System checks payment and stock after submission
- If either fails, the order doesn't go through

### Cancel Order

| Field | Value |
|-------|-------|
| Who decides? | Customer |
| What triggers it? | Wants to cancel |
| What can fail? | Order already confirmed |
| What it produces? | Order cancellation request |
| Status | **formalized** |
| Spec files | `cancel-order.hb.yaml` |

- Customers can cancel, but not after confirmation

### Start Fulfillment

| Field | Value |
|-------|-------|
| Who decides? | System (automatic) |
| What triggers it? | Order confirmed |
| What can fail? | ? |
| What it produces? | Fulfillment started |
| Status | **ready** |

- What happens after fulfillment is triggered? Need to clarify with warehouse team.

### Payment Failure Recovery

| Field | Value |
|-------|-------|
| Who decides? | ? |
| What triggers it? | Payment fails |
| What can fail? | ? |
| What it produces? | ? |
| Status | **raw** |

- Domain expert said "the order doesn't go through" — but is that the end, or can the customer retry?

## Open Questions

- Is placing the order the same as submitting it, or are those two steps?
- Can the system cancel an order, or only the customer?
- What happens to a failed confirmation — does the customer get notified? Can they retry?
- What happens after fulfillment? Shipping? Delivery confirmation?

## Domain Vocabulary

| Term | Meaning | Notes |
|------|---------|-------|
| place an order | creating + submitting? | need to clarify if one or two steps |
| doesn't go through | confirmation failure | they don't distinguish payment vs stock from user perspective |
| confirmed | payment captured + stock reserved | terminal for changes |
