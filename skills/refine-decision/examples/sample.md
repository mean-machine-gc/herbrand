# Example: Refining CreateOrder

## Conversation excerpt

> "Actually, I forgot — we also need to check if the customer's account is suspended.
> That happened last month, a suspended customer managed to place an order and it caused
> a mess with billing. Oh and for the shipping address thing, another case is when
> the address is outside our delivery zone."

## Scratchpad entry before applying

```markdown
## Refinement: create-order — 2026-03-18

### New information
- Client mentioned suspended customer accounts as a failure case (learned from a real incident last month)
- Additional example for missing_customer_info: address outside delivery zone

### Source
Domain expert, during follow-up session about order validation rules

### Impact
- New reject: account_suspended on CreateOrder
- New example on existing reject: missing_customer_info
```

## Changes applied

### project.decisions.ts — no changes needed
(no new outcomes or intents)

### create-order.spec.ts — before

```typescript
type CreateOrder = HumanIntentDecision<
    'order_created',
    'missing_customer_info' | 'invalid_product',
    'create_order'
>
```

### create-order.spec.ts — after

```typescript
type CreateOrder = HumanIntentDecision<
    'order_created',
    'missing_customer_info' | 'invalid_product' | 'account_suspended',
    'create_order'
>
```

With new `shouldFailWith` entry:

```typescript
account_suspended: {
    description: 'The customer account is suspended and cannot place orders',
    scenarios: [
        { description: 'A customer whose account was flagged for payment issues tries to create an order' }
    ]
}
```

And new example added to existing reject:

```typescript
missing_customer_info: {
    description: 'The customer has not provided required contact or shipping information',
    scenarios: [
        { description: 'Customer submits order without a shipping address' },
        { description: 'Customer has no email on file' },
        { description: 'Customer shipping address is outside the delivery zone' }
    ]
}
```

## What the agent said to the BA

> "Got it — so we need to block orders from suspended accounts. That makes sense,
> especially after what happened with billing. And I'll note that delivery zone
> validation is part of the address check. Are there other account-level checks
> we should consider, or is suspension the main one?"
