# Example: Challenging the Order Domain

## What the agent finds

After reading all specs:

1. **Dead end:** `order_confirmed` is an outcome but no decision uses it as input. What happens after confirmation? Fulfillment? Shipping notification?

2. **Missing failure on cancel:** What if the customer tries to cancel but there's a partial shipment in progress? Current rejects only cover "already confirmed" and "already cancelled."

3. **No reverse flow:** Confirmation captures payment and reserves stock — but what if the customer disputes the charge? There's no compensation flow.

4. **Single choice everywhere:** Every decision has exactly one success path. Is there ever a case where, say, confirming an order could result in a partial confirmation (some items in stock, some not)?

5. **Implicit timing:** Between `order_submitted` and `order_confirmed`, the system checks payment and stock. How long can this take? What if it takes too long?

## What the agent says (one or two at a time)

### Round 1

> "I've been thinking about what happens after an order is confirmed. Right now
> that's where the process ends in what we've mapped. Is there a next step —
> does someone start preparing the shipment, or does the customer get a notification?
> I imagine that's a whole separate part of the business."

### Round 2 (after getting answers to round 1)

> "One thing I'm curious about — when the system is checking payment and stock
> after submission, how long does that usually take? I'm wondering if there's a
> scenario where it takes too long and something should happen — like maybe the
> customer gets worried and tries to cancel while the check is still running."

### Round 3

> "Here's an edge case that might not come up often — what if a customer disputes
> a payment after the order is confirmed? At that point we've already charged them
> and reserved the stock. Is there a process for handling that, or does it go
> through a completely different channel?"

## What the agent captures

Each answer goes into the scratchpad:

```markdown
## Challenge session: 2026-03-18

### Answers received

1. After confirmation → fulfillment team picks and packs, then shipping.
   This is handled by the warehouse team, different from ordering.
   → Likely a separate context. Capture as scratchpad observation.

2. Payment/stock check usually instant, but payment gateway can timeout.
   If it takes more than 5 minutes, customer service gets alerted.
   → Possible new decision: timeout handling on confirmation.
   → New reject on confirm_order: confirmation_timeout?

3. Payment disputes go through customer service, completely manual process.
   They can reverse the order but it's not the same as cancellation.
   → Separate flow, different role. Scratchpad for now.
```
