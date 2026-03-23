---
name: herbrand-refine
user_invocable: true
description: >-
  Workflow for refining an existing decision spec when conversation reveals new
  detail. Covers when to refine (new failure modes, corrections, new scenarios,
  sharper descriptions, changed roles or triggers), the step-by-step process
  (read existing spec, capture in scratchpad, apply the change, check ripple
  effects on related specs, validate with get_pipeline_results), and specific
  patterns for adding preconditions, constraints, success outcomes, scenarios,
  and assertions. Emphasizes one refinement at a time and checking downstream
  impacts.
---

# Refine Decision

Use this skill when the conversation reveals new detail about a decision that already has a spec.

## When to refine

- A new way things can go wrong: "oh, and what if the supplier is blacklisted?"
- A correction: "actually, only managers can do that, not any employee"
- New scenarios that illustrate edge cases
- A more precise description of an existing precondition or constraint
- New assertions that must hold after a successful outcome
- A change in who makes the decision or what triggers it
- Discovery that a rejection should trigger a recovery flow

## Workflow

### Step 1: Read the existing spec

Read the `.hb.yaml` file before making any changes. Understand the current state.

### Step 2: Capture in scratchpad first

Before modifying the spec, note the new information in `src/scratchpad/` with context — what was said, by whom, and why it matters. This creates a trail of how the model evolved.

### Step 3: Apply the refinement

**Adding a new precondition (intent decision):**
- Add the new precondition tag to the spec's rejects/preconditions
- Add the entry in `preconditions` with description, `requiredInfo`, and scenarios
- Use a positive statement for the tag
- Add new info units to the info list in `project.hb.yaml` if needed

**Adding a new constraint (outcome decision):**
- Add the new constraint to the spec's rejects/preconditions
- Add the entry in `shouldFailWith` with description, `requiredInfo`, and scenarios
- Add the constraint to the outcomeRejects list in `project.hb.yaml`

**Adding a new success outcome (outcome decision):**
- Add the new outcome to the spec's choices
- Add entry in `shouldSucceedWith` — remember, at least one must have `condition: 'always'`
- Add entry in `shouldAssert` with assertion tags and `affectedInfo`
- Add the outcome to the outcomes list in `project.hb.yaml`

**Adding scenarios:**
- Add concrete scenarios to `preconditions[x].scenarios`, `shouldFailWith[x].scenarios`, or `shouldSucceedWith[x].scenarios`
- Scenarios are real-world situations: "Credit card is declined", "Customer has no shipping address"

**Enriching descriptions:**
- Sharpen descriptions to be more precise
- Add new assertion tags to `shouldAssert` with `affectedInfo`
- Add or refine `requiredInfo` on preconditions and constraints

**Correcting the decision:**
- Change the agent role if the wrong person was identified
- Change the trigger if it was misidentified
- Verify `requiredInfo` and `affectedInfo` still make sense after the correction
- If a refinement fundamentally changes what the decision is, it's probably a new decision — use discover-decision instead

### Step 4: Check ripple effects

A refinement can affect other decisions:
- A new outcome might become the trigger for another decision
- A new constraint on an outcome decision creates a rejection event (`rejected:${tag}`) — consider whether any intent decision should react to it
- A corrected trigger might disconnect a decision from its source

Read related specs and update them if needed.

### Step 5: Validate

Call `get_pipeline_results`. Check both loops:
- **Spec-lint errors** → fix the spec, call again
- **Spec-lint warnings** → address if relevant
- **Behavior-lint warnings** → the refinement may have introduced new orphans, dead ends, or unhandled rejections

A refinement is complete when spec-lint has no errors.

### Step 6: Update the scratchpad

Mark the refinement as applied. Note any remaining open questions.

## What to ask the BA

When refining, ask targeted questions:

- "You mentioned [new failure case] — does that apply to [this decision] or somewhere else?"
- "Is [new precondition] always checked, or only in certain situations?"
- "After [correction], does anything downstream change?"
- "Can you give me a concrete example of when [reject/precondition] would happen?"

## Rules

- **Always read the spec before editing.** Understand before modifying.
- **One refinement at a time.** Don't batch unrelated changes.
- **Capture before modifying.** Write in the scratchpad first.
- **Check ripple effects.** A change in one spec may affect others.
- **Validate after every change.** Call `get_pipeline_results`.
