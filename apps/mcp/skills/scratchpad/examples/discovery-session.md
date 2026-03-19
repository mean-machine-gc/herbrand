# Order Processing — Discovery Session 2026-03-18

## Raw Quotes

> "The customer picks their products, fills in their details, and places the order."

> "Sometimes they forget their address or pick something we don't sell anymore — that should be caught."

> "Once it's placed, the system needs to check payment and stock before confirming."

> "If payment fails or we're out of stock, the order doesn't go through."

> "Customers should be able to cancel, but not after we've confirmed it."

## Possible Decisions

| Who | Trigger | Produces | Rejects | Status |
|-----|---------|----------|---------|--------|
| customer | wants to order | create_order intent | missing info, bad product | formalized → create-order.spec.ts |
| system | order submitted | order_confirmed outcome | payment, stock | formalized → confirm-order.spec.ts |
| customer | wants to cancel | cancel_order intent | already confirmed | formalized → cancel-order.spec.ts |
| system | order confirmed | fulfill_order intent | ? | ready |
| ? | payment fails | ? | ? | raw |

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
