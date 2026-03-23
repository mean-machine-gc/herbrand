---
name: herbrand-scratchpad
user_invocable: true
description: >-
  Workflow for using the scratchpad as working memory between conversation and formalization. Covers when to write (unclear decisions, unresolved contradictions, ambiguous triggers), what to capture (raw domain expert quotes, decision cards with who/trigger/produces/rejects/status tracking, open questions, domain vocabulary with disambiguation), the four-question readiness test for promoting entries, the coordination protocol with the Spec Agent (status lifecycle, Agent Questions section), and file naming conventions. The scratchpad lives at scratchpad/*.md, one file per topic or session.
---

# Scratchpad

The scratchpad is your working memory between conversation and formalization. There are two levels:

- **Global scratchpad** (`scratchpad/`): strategic notes, DDD classification (core/supporting/generic contexts), cross-context questions, and things that don't belong to one context yet.
- **Context scratchpad** (`ordering/scratchpad/`, `warehousing/scratchpad/`): decisions within a specific context. Use these once you know which context a decision belongs to.

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

### Decision cards

When you identify something that looks like a decision, capture it as a **decision card** — one card per decision. The card maps directly to the four readiness questions:

```markdown
### Decision Name

| Field | Value |
|-------|-------|
| Who decides? | Role (e.g., Customer, Warehouse operator) or System (automatic) |
| What triggers it? | The event or action that starts this decision |
| What can fail? | Failure modes, things that can go wrong |
| What it produces? | The result when it succeeds |
| Status | **raw** |

- Detail bullet points here
- Domain expert quotes relevant to this decision
- Context and reasoning
```

**Status values:**
- `raw` — captured but incomplete, not all four questions answered yet
- `ready` — all four questions answered, ready for the spec agent to formalize
- `formalized` — spec agent has written the spec files (status updated by spec agent)
- `needs-clarification` — spec agent found ambiguity, check Agent Questions section

After the spec agent formalizes, the card gets a `Spec files` row:

```markdown
| Status | **formalized** |
| Spec files | `create-order.hb.yaml`, `process-order-creation.hb.yaml` |
```

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

A decision card is ready to move from `raw` to `ready` when you can answer all four:

1. **Who decides?** A human (with a role) or the system (machine)?
2. **What triggers it?** An outcome (something happened) or a rejection?
3. **What can go wrong?** At least one failure mode.
4. **What does it produce?** An intent or an outcome.

If you can't answer all four, it stays `raw` in the scratchpad.

## Spec agent handoff

When one or more decision cards are marked `ready`:

1. Spawn the `herbrand-spec-agent` subagent
2. The spec agent reads the scratchpad, formalizes ready entries into `.hb.yaml` specs, validates, and updates each card's status to `formalized` with spec file references
3. If the spec agent marks an entry as `needs-clarification`, check the **Agent Questions** section and address the questions with the domain expert

**The conversation agent does NOT write spec files directly.** Formalization is the spec agent's job.

## Agent Questions

The spec agent may write questions here when it encounters ambiguity:

```markdown
## Agent Questions

- [ ] **RE: warehouse staff / order received**: Is "order received" the same outcome as "order_submitted", or is it a separate event from an external system? (spec-agent)
```

Address these with the domain expert, update the decision card, and re-run the spec agent.

## File naming

Use descriptive names based on topic or session. Place files in the appropriate scratchpad:

```
scratchpad/                         ← global (strategic, cross-context)
  strategic-overview.md
  cross-context-questions.md
ordering/scratchpad/                ← ordering context decisions
  order-lifecycle.md
  payment-unclear.md
warehousing/scratchpad/             ← warehousing context decisions
  warehouse-process.md
  fulfillment-rework.md
```

## Rules

- **Write more, not less.** You can always delete later. You can't recover what you didn't capture.
- **Don't interpret too early.** Write what you heard, not what you think it means.
- **One topic per file.** Don't mix order processing notes with procurement notes.
- **Review before each session.** Read open questions from previous scratchpad entries — they're your agenda.
- **Never show scratchpad to the BA.** It's your working memory, not a deliverable.
- **Never write spec files directly.** Use decision cards and let the spec agent formalize.
