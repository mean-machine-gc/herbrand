# Review Model

Use this skill when it's time to present the current understanding back to stakeholders. The review is a checkpoint — it lets the BA and domain experts confirm, correct, or expand what's been captured.

## When to review

- After a discovery session — "here's what I understood"
- Before moving to a new area of the domain — confirm what we have so far
- When the BA asks "what do we have?" or "show me what we've modeled"
- When behavior-lint is mostly clean and the model feels stable enough to present

## Workflow

### Step 1: Read the full picture

Call `get_user_stories` to see the business landscape — all decisions modeled so far, who's involved, what their goals are.

Call `get_pipeline_results` to see:
- Any remaining spec-lint warnings (incomplete areas)
- Behavior-lint warnings (gaps in the system)
- These inform what to flag as "still working on" during the review

### Step 2: Organize by process flow

Group user stories into flows — sequences of decisions that chain together. Present them in the order they happen, not alphabetically.

For example:
- **Order lifecycle:** create → submit → confirm (or cancel) → fulfill
- **Procurement lifecycle:** create PO → approve (or reject)

Call `get_user_story` for each key decision to get the full business details.

### Step 3: Present in plain language

For each flow, produce a narrative:

- A one-paragraph summary of the process end to end
- For each decision in the flow:
  - Who does it and what triggers it
  - What information they need (from the views)
  - What can go wrong (preconditions and constraints, in domain language)
  - What happens when it succeeds
  - What we're certain must be true afterwards (assertions)
  - What happens when it fails (recovery flows, if any)
- Open questions from the scratchpad related to this flow

At the end:
- Scratchpad items not yet formalized
- Behavior-lint findings translated to plain language
- Suggested areas to explore next

### Step 4: Listen

After presenting, listen carefully for:

- **"That's not quite right"** → refine-decision
- **"You're missing X"** → discover-decision or scratchpad
- **"Actually those are the same thing"** → merge decisions (refine one, delete the other)
- **"That reminds me..."** → new scratchpad entry

## Language rules

- **Never say:** spec, aggregate, module, context, union, decision type, precondition, constraint, assertion, info unit, intent decision, outcome decision, trigger
- **Instead say:** process, step, check, rule, result, guarantee, information, decision, action, event, role
- **Use the domain expert's vocabulary.** If they say "purchase request" not "purchase order", mirror their language.
- **Present failures as natural scenarios.** "If the payment doesn't go through..." not "when constraint payment_failed fires..."
- **Present assertions as guarantees.** "After this, we know that..." not "the assertion order_status_confirmed affects..."
- **Flag uncertainty honestly.** "I'm not sure about X — can you clarify?"

## Example review narrative

> Here's what I understand about how orders work. Let me know where I've got it wrong.
>
> A customer starts by creating an order — they pick their products and provide their details. This needs their contact info and valid products. If anything's missing or a product isn't available, the order isn't created.
>
> Once the order exists, the customer can submit it for processing. The order needs to have items and be in draft. After submission, the system automatically checks payment and stock. If payment fails or items are out of stock, it doesn't go through. If everything checks out, the order is confirmed — payment is charged and stock is reserved.
>
> At any point before confirmation, the customer can cancel. But not after confirmation.
>
> After confirmation, the system starts fulfillment — picking, packing, shipping.
>
> Things I'm still working on:
> - What happens when fulfillment fails? Does the customer get notified?
> - Can the system cancel an order, or only the customer?

## Rules

- **Use `get_user_story`, not spec files.** The user story has everything you need in business-friendly format.
- **Keep it conversational.** This is a checkpoint, not a document.
- **Ask one or two questions at a time.** Don't overwhelm with twenty gaps.
- **Read the scratchpad before reviewing.** Open questions are your agenda.
