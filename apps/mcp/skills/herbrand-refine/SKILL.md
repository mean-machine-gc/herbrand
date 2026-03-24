---
name: herbrand-refine
user_invocable: true
description: >-
  Workflow for refining existing decisions when conversation reveals new detail.
  The conversation agent captures refinements in the scratchpad in plain language,
  then spawns the spec agent to apply changes. Covers when to refine, what to
  capture, and checking downstream impacts.
---

# Refine

When conversation reveals new detail about an existing decision — a failure mode you didn't know about, a business rule that's more nuanced than you thought, a role correction — capture it and let the spec agent apply the change.

## When to refine

- **New failure mode**: "Oh, and the payment can also fail if the billing address doesn't match the card."
- **Corrected role**: "Actually, it's the team lead who approves that, not the operator."
- **New business rule**: "We also check that the order total is above the minimum — we don't ship orders under $10."
- **Sharper description**: "It's not just 'checking stock' — we check both warehouse stock and supplier availability."
- **Changed trigger**: "That actually happens after the packing, not after the payment."
- **New outcome path**: "If the address is international, we handle it differently — different courier, different timeline."

## How to capture

Write the refinement in the scratchpad in plain language. Reference what's being refined so the spec agent can find it.

```markdown
## Payment refinement — 2026-03-24

The domain expert mentioned that payment can also fail if the billing address
doesn't match the card's registered address. This is separate from a card
decline — the card might be valid but the address check fails.

This applies to the payment processing step — both first attempt and retries.
```

Don't structure this as a decision card or template. Write what you learned, in the domain expert's words.

## Spawning the spec agent

After capturing the refinement, spawn the `herbrand-spec-agent` subagent. In the prompt:
- Point to the scratchpad file with the refinement
- Mention which existing decision area is affected (in domain terms)
- The spec agent will identify the right spec to modify

## After refinement

Call `get_pipeline_results` to check for downstream impacts:
- Did adding a new failure mode create an unhandled rejection?
- Did changing information requirements break an info flow?
- Did the refinement reveal a gap in a related decision?

If so, discuss with the domain expert — new refinements may be needed.

## Rules

- **One refinement at a time.** Don't batch multiple changes. Each refinement should be a clean, traceable update.
- **Write what changed, not framework details.** The spec agent handles the mapping.
- **Check downstream.** Refinements can cascade — a new failure mode might need a recovery flow.
- **Never modify spec files directly.** Always go through the spec agent.
