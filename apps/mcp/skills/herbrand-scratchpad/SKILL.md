---
name: herbrand-scratchpad
user_invocable: true
description: >-
  Workflow for using the scratchpad as working memory for domain knowledge.
  Covers what to write (process descriptions, business rules, roles, failure scenarios,
  vocabulary, open questions), how to organize it (one topic per file, context-specific
  or global), and when to spawn the spec agent to formalize. The scratchpad captures
  rich domain understanding in plain business language — it is NOT a staging area
  for decision cards or templates.
---

# Scratchpad

The scratchpad is your working memory — a place to capture rich domain understanding in plain business language as you learn it from conversation.

## When to write

- When the domain expert describes a process, a rule, or a role
- When you hear about something that can go wrong
- When you learn new vocabulary or disambiguate terms
- When you have questions you want to follow up on later
- When you discover contradictions or ambiguities
- When you understand how two parts of the business connect

## What to write

Write in the domain expert's language. No framework terminology. No decision cards or templates.

### Process descriptions

Describe what happens, who does it, and in what order:

```markdown
## Order fulfillment process

After an order is paid, it appears on the warehouse dashboard. A warehouse
operator picks it up — goes through the shelves, collects items, checks each
one against the order, and packs them. Then they call the courier for pickup.
The courier assigns a tracking number. We track delivery through their API.
```

### Business rules

```markdown
## Stock management rules

- Items can only go in the basket if they're in stock
- We check stock again at payment — things sell out
- If stock runs out at payment, the payment fails
- Inventory is automated — no manual stock counts
```

### Roles and what they care about

```markdown
## Warehouse operators

- See confirmed orders on a dashboard
- Responsible for picking, packing, and courier handoff
- Don't deal with payment or customer issues
- If an item is damaged or missing, they raise an internal issue
```

### What can go wrong

```markdown
## Payment failures

- Card declined — customer can retry with a different card
- Stock gone at payment time — customer told which items unavailable
- No limit on retries currently
```

### Vocabulary

```markdown
## Terms

- "basket" not "cart" — client's word
- "dispatch" = courier picks up from warehouse
- "confirmed order" = payment has been captured
```

### Open questions

```markdown
## Open questions

- What if the courier can't deliver?
- Can orders be partially shipped?
- Is there a timeout on unpaid baskets?
```

## Where to write

- **Global scratchpad** (`scratchpad/`): notes that cross contexts, strategic observations, DDD classification notes
- **Context scratchpad** (`ordering/scratchpad/`, `fulfillment/scratchpad/`): notes specific to one context

One topic per file. Use descriptive filenames: `scratchpad/order-fulfillment.md`, `ordering/scratchpad/payment-rules.md`.

## When to spawn the spec agent

Your notes are ready for formalization when they're rich enough that someone reading them could answer:
- What people and systems are involved
- What processes exist and what triggers them
- What can go wrong and what happens when it does
- What information flows through the system

You don't need to answer these explicitly — the spec agent will extract them. Your job is to provide enough domain richness.

Spawn the `herbrand-spec-agent` subagent and point it to the relevant scratchpad files.

## After formalization

The spec agent will update the scratchpad to note what was formalized and may leave questions in an `## Agent Questions` section. Check these and follow up with the domain expert.

## Rules

- **Plain language only.** No streams, intents, outcomes, or any framework terms.
- **No templates.** No "Who decides / What triggers / What can fail" cards. Write prose.
- **Use domain words.** If they say "dispatch," you say "dispatch."
- **Write more, not less.** You can always trim later.
- **Review before each session.** Open questions are your agenda.
- **Don't show to the domain expert.** The scratchpad is your working memory.
