# Scratchpad

The scratchpad is your working memory between conversation and formalization. It lives at `src/scratchpad/*.md` — one file per topic or session.

## When to write

Write to the scratchpad whenever you hear something that isn't ready to become a spec:

- The domain expert mentions a process but you don't know who decides
- You hear a failure case but don't know what decision it belongs to
- Two people use the same word to mean different things
- Something contradicts what you heard earlier
- A decision seems to exist but you can't identify the trigger yet

## What to capture

### Raw quotes

Write down what the domain expert actually said, in their words. Don't interpret yet.

```markdown
> "When the order comes in, someone in the warehouse checks if we have the stuff"
```

### Possible decisions

Things that sound like someone choosing or reacting. Use a simple table:

```markdown
| Who | Trigger | Produces | Rejects | Status |
|-----|---------|----------|---------|--------|
| warehouse staff | order received | pick list created | items not found | raw |
```

Status is one of: `raw` → `ready` → `formalized`

### Open questions

Things to clarify before formalizing:

```markdown
- Is "order received" the same as "order confirmed" or a separate step?
- Who handles backorders — warehouse or procurement?
- What happens if only some items are in stock?
```

### Domain vocabulary

Terms and their meanings, especially when ambiguous:

```markdown
| Term | Meaning | Notes |
|------|---------|-------|
| order | customer purchase request | not the same as purchase order |
| PO | purchase order | internal, to suppliers |
| booking | same as order? | client uses both interchangeably |
```

## When to formalize

A decision is ready to move from scratchpad to spec when you can answer all four:

1. **Who decides?** A human (with a role) or the system (machine)?
2. **What triggers it?** An outcome (something happened) or a rejection?
3. **What can go wrong?** At least one precondition or constraint.
4. **What does it produce?** An intent or an outcome.

If you can't answer all four, it stays in the scratchpad.

## After formalizing

When you write a spec from a scratchpad entry:

- Mark the entry as `formalized` in the status column
- Note which spec it became: `→ create-order.spec.ts`
- Keep any remaining open questions — they may inform refinement later

## File naming

Use descriptive names based on topic or session:

```
src/scratchpad/
  order-lifecycle.md
  warehouse-process.md
  session-2026-03-19.md
  payment-unclear.md
```

## Rules

- **Write more, not less.** You can always delete later. You can't recover what you didn't capture.
- **Don't interpret too early.** Write what you heard, not what you think it means.
- **One topic per file.** Don't mix order processing notes with procurement notes.
- **Review before each session.** Read open questions from previous scratchpad entries — they're your agenda.
- **Never show scratchpad to the BA.** It's your working memory, not a deliverable.
