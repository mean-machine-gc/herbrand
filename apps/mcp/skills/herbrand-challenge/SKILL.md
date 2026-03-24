---
name: herbrand-challenge
user_invocable: true
description: >-
  Workflow for stress-testing the current decision model by finding gaps, edge cases,
  and implicit assumptions. Uses behavior-lint findings from get_pipeline_results as
  the primary data source, translates them into natural domain-language questions, and
  covers patterns beyond lint: missing failure modes, single-path decisions, missing roles,
  implicit timing gaps, and missing reverse/compensation flows.
---

# Challenge

Stress-test the model by finding what's missing, what's assumed, and what could break.

## Before challenging

1. Check scratchpad for unformalized notes. If there's rich domain knowledge waiting, spawn the spec agent first — challenge a complete model, not a partial one.
2. Call `get_pipeline_results` — the `behaviorLint` findings are your primary data source.

## Translating lint findings into domain questions

The behavior lint tells you about structural issues in the decision network. Your job is to translate these into natural questions the domain expert can answer.

| Lint finding | Question pattern |
|---|---|
| `orphan_outcome` | "Where does [X] come from? Who or what causes it?" |
| `dead_end_outcome` | "After [X] happens, is the process done? Or does something else need to happen?" |
| `unhandled_rejection` | "If [X] fails, what happens? Does someone step in? Is it just ignored?" |
| `info_never_written` | "You need [X] to make this decision, but where does it come from originally?" |
| `info_never_read` | "The system records [X], but who uses that information? Does it matter downstream?" |
| `duplicate_views` | "These two decisions need the same information — are they actually the same decision?" |
| `aggregate_no_shared_info` | "These two processes are grouped together but don't share any information — are they really related?" |
| `no_rejects` | "Nothing can go wrong here? Not even rarely?" |

## Patterns beyond lint

Also look for:

- **Missing failure modes** — "What if the courier loses the package? What if the warehouse is flooded?"
- **Single-path decisions** — outcome decisions with only one success path. "Is this always the same outcome, or could it go differently depending on circumstances?"
- **Missing roles** — "Who oversees this process? Is there a manager or supervisor involved?"
- **Timing gaps** — "How long between [X] and [Y]? Is there a deadline? What if it takes too long?"
- **Missing reverse flows** — "Can this be undone? What about cancellations, returns, refunds?"
- **Implicit handoffs** — "How does [role A] know that [role B] is done? Is there a notification?"

## How to challenge

- **One or two questions at a time.** Don't overwhelm.
- **Frame as curiosity, not criticism.** "I'm wondering about..." not "You're missing..."
- **Start with lint findings.** They're concrete and specific.
- **Follow the domain expert's energy.** If they light up about a topic, dig deeper there.

## Routing answers

When the domain expert answers:
- **New process or decision discovered** → capture in scratchpad (discover workflow)
- **Refinement to existing decision** → capture in scratchpad (refine workflow)
- **Explicitly out of scope** → note in scratchpad with rationale
- **"I don't know"** → note as open question in scratchpad

## Rules

- **Domain language only.** Never say "orphan outcome" or "unhandled rejection" — translate.
- **Don't challenge what's explicitly out of scope.** Respect scope decisions.
- **Curiosity, not criticism.** The model isn't wrong — it's incomplete. That's expected.
