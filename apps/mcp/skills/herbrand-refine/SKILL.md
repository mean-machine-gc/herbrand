---
name: herbrand-refine
user_invocable: true
description: >-
  Workflow for refining an existing decision spec when conversation reveals new detail. The Conversation Agent captures the refinement in the scratchpad with status "ready" referencing the existing spec file, then spawns the Spec Agent to apply the change. Covers when to refine (new failure modes, corrections, new scenarios, sharper descriptions, changed roles or triggers), what to capture in the scratchpad, and specific patterns for adding preconditions, constraints, success outcomes, scenarios, and assertions. Emphasizes one refinement at a time and checking downstream impacts.
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

Read the `.hb.yaml` file before making any changes. Understand the current state. Use `get_user_story` to see the business-friendly view.

### Step 2: Capture the refinement in scratchpad

Create a decision card in `scratchpad/` that references the existing spec file:

```markdown
### Refine: Decision Name

| Field | Value |
|-------|-------|
| Who decides? | (same as existing, or corrected role) |
| What triggers it? | (same as existing, or corrected trigger) |
| What can fail? | (existing failures + new failure modes) |
| What it produces? | (same as existing, or new outcomes) |
| Status | **ready** |
| Existing spec | `existing-spec-name.hb.yaml` |

- What changed: description of the refinement
- Domain expert quote that prompted it
- Note any downstream specs that might be affected
```

The `Existing spec` row tells the spec agent this is a refinement, not a new decision.

### Step 3: Note ripple effects

A refinement can affect other decisions:
- A new outcome might become the trigger for another decision
- A new constraint creates a rejection event — consider whether any decision should react to it
- A corrected trigger might disconnect a decision from its source

Note any potentially affected specs in the decision card's bullet points so the spec agent can check them.

### Step 4: Spawn the spec agent

Spawn the `herbrand-spec-agent` subagent. It will:
- Read the existing spec and the scratchpad refinement card
- Apply the changes
- Check ripple effects on related specs
- Validate with `get_pipeline_results`
- Update scratchpad status to `formalized`

### Step 5: Review results

After the spec agent completes, review the affected decision via `get_user_story` to confirm the refinement looks right.

## What to ask the BA

When refining, ask targeted questions:

- "You mentioned [new failure case] — does that apply to [this decision] or somewhere else?"
- "Is [new precondition] always checked, or only in certain situations?"
- "After [correction], does anything downstream change?"
- "Can you give me a concrete example of when [reject/precondition] would happen?"

## Rules

- **Always read the spec before capturing.** Understand before modifying.
- **One refinement at a time.** Don't batch unrelated changes.
- **Capture before modifying.** Write in the scratchpad first, then spawn the spec agent.
- **Note ripple effects.** A change in one spec may affect others.
- **Never edit spec files directly.** The spec agent handles formalization.

## Refinement patterns reference

These describe what the spec agent will do — use them to write accurate scratchpad cards:

**Adding a new precondition (intent decision):**
- New precondition with description, requiredInfo, and scenarios
- May need new info units in project.hb.yaml

**Adding a new constraint (outcome decision):**
- New failure mode in shouldFailWith with description, requiredInfo, scenarios
- Adds to outcomeRejects in project.hb.yaml

**Adding a new success outcome (outcome decision):**
- New outcome in shouldSucceedWith — at least one must have `condition: always`
- Assertions for the new outcome in shouldAssert
- Adds to outcomes in project.hb.yaml

**Adding scenarios:**
- Concrete real-world situations added to preconditions, constraints, or outcomes

**Correcting the decision:**
- Changed agent role, trigger, or fundamental structure
- If a refinement fundamentally changes what the decision is, it's probably a new decision — use discover instead
