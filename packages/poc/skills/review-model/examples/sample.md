# Example: Order Domain Review

## What the agent reads

The four order specs (create, submit, confirm, cancel) and any scratchpad notes.

## What the agent produces

---

Here's what I understand so far about how orders work. Let me know where I've got it wrong.

**The order lifecycle**

A customer starts by creating an order — they pick their products and provide their details. This can fail if their information is incomplete (no shipping address, no email) or if they've selected a product that's no longer available.

Once the order is created, the customer can submit it for processing. At this point, the order needs to have at least one item — an empty order can't be submitted. And they can only submit it once.

After submission, the system takes over. It checks payment and stock. If the payment fails (card declined, gateway issues) or the items are out of stock, the order doesn't go through. If everything checks out, the order is confirmed — at that point, payment is captured and inventory is reserved.

At any point before confirmation, the customer can cancel. But once it's confirmed, they can't cancel through this process. And obviously, you can't cancel something twice.

**What we're sure about after each step:**
- After creation: the order exists in draft, with the right products, tied to the customer
- After submission: the order can't be edited anymore, and the system starts checking payment and stock
- After confirmation: payment is charged, stock is set aside, no more changes
- After cancellation: any pending payment is voided, reserved stock is released

**Things I'm still unsure about:**
- What happens when confirmation fails? Does the customer get notified? Can they retry or modify the order?
- Can the system cancel an order, or is that only a customer action?
- Is there a timeout on submitted orders waiting for confirmation?

**What's next?**
I think we should dig into what happens after confirmation — fulfillment, shipping, delivery. That's probably a whole separate flow. Also, the failure scenarios around confirmation feel like they need more detail — a payment failure and a stock issue probably have different recovery paths.

---

## What the agent listens for

After presenting, the agent waits. Typical responses and what to do:

- "Actually, managers can also cancel confirmed orders" → new decision or refinement to cancel-order
- "The timeout thing is important, orders expire after 24 hours" → new scratchpad entry, possibly a new machine decision
- "Yeah, fulfillment is completely separate" → confirms a context boundary
