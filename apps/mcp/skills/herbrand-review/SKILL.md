---
name: herbrand-review
user_invocable: true
description: >-
  Workflow for presenting the current decision model back to stakeholders as a review
  checkpoint. Reads the full picture via get_user_stories and get_pipeline_results,
  organizes decisions into process flows, produces a plain-language narrative for each
  flow, surfaces open scratchpad items and behavior-lint findings, and listens for
  corrections or new discoveries.
---

# Review

Present the current model back to the domain expert in **plain business language**. This is a checkpoint — you're asking "does this match how your business works?"

## Before reviewing

1. Check scratchpad for unfomalized notes. If there's rich domain knowledge that hasn't been formalized yet, spawn the spec agent first.
2. Call `get_pipeline_results` to understand the current system state.
3. Call `get_user_stories` to get the full list of decisions.
4. Call `get_user_story` for individual decisions you want to present in detail.

## How to present

Organize decisions into **process flows** — sequences of related decisions that tell a story. Present each flow as a narrative:

**Example:**

> **Placing an order**: A customer browses the catalog and adds products to their basket. The system checks stock — if an item is out of stock, it can't be added. The customer can adjust quantities or remove items. When ready, they confirm the basket and provide their shipping address and payment details. The system calculates the total and processes the payment. If the card is declined, the customer can retry with a different card. Once payment goes through, the order is confirmed and the stock is reserved.

For each flow, cover:
- **Who does it** — the roles involved
- **What triggers it** — how it starts
- **What information is needed** — what the decision-maker needs to see
- **What can go wrong** — failure cases and recovery
- **What happens on success** — what changes, who is notified

## Surfacing gaps

After presenting the flows, raise any findings from `behaviorLint`:

- **Orphan outcomes** → "This event happens but I don't see what triggers it. Is it external?"
- **Dead end outcomes** → "After this happens, nothing else reacts. Is the process done here?"
- **Unhandled rejections** → "If this fails, what happens? Does someone step in?"
- **Info never written** → "This information is needed but I don't see where it comes from."
- **Info never read** → "This information is recorded but nobody seems to use it."

Frame these as curiosity, not criticism. The domain expert knows their business — you're checking your understanding.

## After the review

Listen for corrections and new discoveries. Route them:
- **Correction to existing decision** → capture refinement in scratchpad, spawn spec agent (use the refine workflow)
- **New process or decision** → capture in scratchpad (use the discover workflow)
- **Out of scope for now** → note in scratchpad with rationale

## Rules

- **Never use framework terminology.** No "intent decisions," "outcome streams," "assertions," "preconditions." Use domain language: "the customer decides," "the system checks," "if this fails," "what changes."
- **Present flows, not individual specs.** The domain expert thinks in processes, not isolated decisions.
- **One or two flows at a time.** Don't dump everything at once.
- **Listen more than talk.** The review is for catching what you got wrong, not showing off what you got right.
