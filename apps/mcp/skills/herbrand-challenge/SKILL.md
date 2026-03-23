---
name: herbrand-challenge
user_invocable: true
description: >-
  Workflow for stress-testing the current model by finding gaps, edge cases, and implicit assumptions. Ensures pending scratchpad entries are formalized first by spawning the Spec Agent, then uses behavior-lint findings from get_pipeline_results as the primary data source — translates orphan outcomes, dead ends, unhandled rejections, info never written/read, duplicate views, and aggregate issues into natural domain-language questions. Also covers patterns beyond lint: missing failure modes, single-path decisions, missing roles, implicit timing gaps, and missing reverse/compensation flows. Emphasizes framing challenges as curiosity (not criticism), pacing one or two questions at a time, and routing answers to discover, refine, or scratchpad.
---

# Challenge Model

Use this skill to stress-test the current model by finding gaps, edge cases, and implicit assumptions — then surface them as natural questions for the domain expert.

## Why challenge

A model that nobody questions is a model that nobody trusts. Challenging doesn't mean criticizing — it means making the model more robust before it drives implementation decisions.

## Before challenging

Check scratchpad files (both global `scratchpad/*.md` and context-specific `<context>/scratchpad/*.md`) for any decision cards with status `ready`. If any exist, spawn the `herbrand-spec-agent` subagent first and wait for it to complete. Challenging an incomplete model wastes effort — formalize pending entries first. Cards with status `raw` or `needs-clarification` should be noted but don't block the challenge.

## Your data source

Challenges can be **scoped by context** or **full system**:
- **Scoped:** Call `get_pipeline_results` with `context: "ordering"` to focus on one area's gaps.
- **Full:** Call without context to see the entire system, including cross-module integration gaps (streams published but not consumed across modules, or consumed but not published).

Call `get_pipeline_results` and read `behaviorLint`. These are your challenges — the system has already found them. Your job is to translate each finding into a natural question the domain expert can answer.

## Lint finding → question translation

### Orphan outcomes

**Finding:** `orphan_outcome` — "Outcome 'X' is used as a trigger but no outcome decision produces it"

**What it means:** A decision reacts to something that nobody creates. Where does this event come from?

**How to ask:** "I see that [process] starts when [X] happens, but I don't see what creates [X] in the first place. Is that coming from outside the system, or did we miss a step?"

### Dead end outcomes

**Finding:** `dead_end_outcome` — "Outcome 'X' is produced but no intent decision is triggered by it"

**What it means:** Something happens but nobody reacts. Is this a terminal state or are we missing a downstream process?

**How to ask:** "After [X] happens, is that the end of the process? Or does someone need to do something next?"

### Unhandled rejections

**Finding:** `unhandled_rejection` — "Outcome rejection 'rejected:X' has no intent decision reacting to it"

**What it means:** Something can fail but nobody handles the failure. Is there a recovery process?

**How to ask:** "What happens when [X] fails? Does someone step in, or does the process just stop?"

### Info never written

**Finding:** `info_never_written` — "Info 'X' is required by decisions but never affected by any outcome decision"

**What it means:** Decisions need information that no decision in the system produces. Where does it come from? External system? Manual entry? Pre-existing data?

**How to ask:** "Several steps need to know [X]. Where does that information come from originally? Is it entered somewhere, or does it come from another system?"

### Info never read

**Finding:** `info_never_read` — "Info 'X' is affected by outcome decisions but never required by any decision"

**What it means:** Something changes but nobody looks at it. Is it for audit purposes, or are we missing a decision that uses it?

**How to ask:** "I see that [X] gets updated at this step, but I don't see who needs that information afterwards. Is that for record-keeping, or does someone use it?"

### Duplicate views

**Finding:** `duplicate_views` — "Same info set — could be the same view"

**What it means:** Two decisions look at the same information. They might share a screen, a report, or a dashboard.

**How to ask:** "It looks like both [decision A] and [decision B] need the same information. Do they happen at the same time, or look at the same screen?"

### Aggregate no shared info

**Finding:** `aggregate_no_shared_info` — "Decisions in aggregate 'X' share no info"

**What it means:** Decisions grouped together don't seem related in terms of data. Maybe they belong in different groups.

**Don't ask about this directly.** This is an architectural hint for later. Note it in the scratchpad.

## Beyond lint findings

Also look for these patterns by reading the user stories:

### Missing failure modes
Call `get_user_stories` and look at decisions with very few preconditions or constraints. Real processes have more ways to fail.

"Could [action] also fail because of [reason], similar to what we saw with [other action]?"

### Single-path decisions
Decisions that can only produce one outcome. Is there ever an alternative path?

"Is there ever a case where [action] goes differently? For example, a partial success?"

### Missing roles
Processes where only one role appears. Usually there's oversight, approval, or notification.

"Does anyone else need to know about [action]? Who oversees this?"

### Implicit timing
Gaps between one decision's output and another's input where time passes.

"How long between [step A] and [step B]? Can anything happen in between?"

### Reverse flows
Happy paths are modeled but undo/compensation is missing.

"What if we need to undo [action]? How do we reverse [outcome]?"

## How to present challenges

Frame as curiosity, not criticism:

- "I've been thinking about what happens when..."
- "One thing I'm not sure about..."
- "This might be an edge case, but..."

**Never say:**
- "The model is missing..."
- "There's a gap in..."
- "You forgot about..."

## Pacing

- Ask **one or two questions** at a time, then listen
- Start with the highest-impact gaps (high-frequency or high-value flows)
- Some gaps are intentional — accept "that doesn't happen" as a valid answer
- Capture every answer in the scratchpad, even "that's not relevant"

## After challenging

Each answer leads somewhere:
- New decision → use discover-decision
- More detail on existing → use refine-decision
- "That's not relevant" → note in scratchpad, move on
- New process area → note in scratchpad for future discovery

## Rules

- **Challenges come from data, not imagination.** Read the lint results first.
- **Speak in domain language.** Never mention lint rules, orphans, or dead ends.
- **Don't overwhelm.** One or two questions per round.
- **Capture everything.** Write answers to the scratchpad.
- **Accept "no" gracefully.** Not every gap matters.
