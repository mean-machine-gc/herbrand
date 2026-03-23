---
name: herbrand-formalize
user_invocable: false
description: >-
  Skill for the Spec Agent to formalize scratchpad entries into Herbrand decision specs. Covers reading scratchpad decision cards, mapping domain language to spec YAML, the validation loop (get_pipeline_results → fix → re-validate), handling ambiguity (needs-clarification), and naming conventions. This skill is preloaded into the herbrand-spec-agent subagent.
---

# Formalize Decisions

This skill guides the formalization of scratchpad entries into `.hb.yaml` decision specs. It is used by the Spec Agent, not invoked directly.

## Reading the scratchpad

Scratchpad files live at `scratchpad/*.md` (global) or `<context>/scratchpad/*.md` (per-context). Look for decision cards:

```markdown
### Pick List Creation

| Field | Value |
|-------|-------|
| Who decides? | Warehouse staff |
| What triggers it? | Order received |
| What can fail? | Items not found |
| What it produces? | Pick list created |
| Status | **ready** |

- Operator looks up warehouse locations for items
- Items must be in stock at the warehouse
```

Only process cards with status `ready`. Ignore `raw`, `formalized`, and `needs-clarification`.

## Mapping scratchpad to spec

### Step 1: Determine decision type

Read the **Who decides?** and **What it produces?** fields:

- **Who decides?** is a human role + **What it produces?** sounds like a command → **intent decision**
  - Example: "customer" + "submit order" → intent
- **Who decides?** is "system" or "machine" + **What it produces?** sounds like an event → **outcome decision**
  - Example: "system" + "order confirmed" → outcome
- **Who decides?** is "system" + **What it produces?** sounds like a command → **machine intent decision**
  - Example: "system" + "start fulfillment" → intent with `agent: { kind: machine }`

### Step 2: Map the trigger

Read the **What triggers it?** field:

- If it sounds like an event (past tense, something that happened) → `trigger: { type: success, outcome: <snake_case> }`
- If it references a failure → `trigger: { type: reject, rejection: rejected:<snake_case> }`
- If it sounds like a command (imperative) → this is an outcome decision, `trigger: <snake_case>`

### Step 3: Identify streams

From the trigger, produces, and failure fields:
- **What triggers it?** (event) → add to `outcomes` in project.hb.yaml if not present
- **What triggers it?** (command) → should already be in `intents`
- **What it produces?** (command) → add to `intents` if not present
- **What it produces?** (event) → add to `outcomes` if not present
- **What can fail?** → add to `outcomeRejects` if not present

### Step 4: Infer info units

From the decision context, infer what information is needed:
- Each precondition/constraint needs `requiredInfo` — at least one info unit
- Each assertion needs `affectedInfo` — at least one info unit
- Info unit names are descriptive nouns in snake_case: `order_status`, `payment_details`
- Add new info units to the `info` list in project.hb.yaml

### Step 5: Infer boundaries

If existing specs define the context, module, and aggregate, reuse them when the new decision belongs to the same domain area. If you're starting fresh or entering a new area:
- **Context** — the ubiquitous language boundary (e.g., `ordering`, `fulfillment`)
- **Module** — groups related aggregates (e.g., `order_management`)
- **Aggregate** — the process boundary, kebab-case (e.g., `order-processing`)

### Step 6: Write the spec file

Create the spec in the context's specs directory: `<context>/specs/<decision-name>.hb.yaml`. Use kebab-case for the filename. The spec's `context` field must match the folder name.

For **intent decisions**, ensure:
- `type: intent`
- `agent` with kind and role (for humans)
- `businessGoal` — a brief statement of why this decision matters
- `description` — what happens in this decision
- `trigger` — the outcome or rejection that triggers this
- `preconditions` — at least one, with description, `requiredInfo`, and scenarios
- `producesIntent` — the intent produced, with description and requiredInfo

For **outcome decisions**, ensure:
- `type: outcome`
- `agent: { kind: machine }`
- `description` — what the system does
- `trigger` — the intent that triggers this
- `shouldFailWith` — constraints that can fail, each with description, `requiredInfo`, scenarios
- `shouldSucceedWith` — success outcomes, at least one with `condition: always`
- `shouldAssert` — assertions for each success outcome, with tag, description, affectedInfo

### Step 7: Update project.hb.yaml

Add any new outcomes, intents, info units, outcomeRejects, contexts, modules, or aggregates.

### Step 8: Validate

Call `get_pipeline_results` with the context parameter for scoped validation (e.g., `context: "ordering"`). Read the response:
- `hasSpecErrors: true` → read `specLint` for error details, fix the spec, call again
- `hasSpecErrors: false` → spec is valid
- `behaviorLint` → note warnings but don't block on them

Repeat until `hasSpecErrors` is false.

### Step 9: Update scratchpad

Update the decision card — change status and add spec file references:

```markdown
### Pick List Creation

| Field | Value |
|-------|-------|
| Who decides? | Warehouse staff |
| What triggers it? | Order received |
| What can fail? | Items not found |
| What it produces? | Pick list created |
| Status | **formalized** |
| Spec files | `create-pick-list.hb.yaml`, `process-pick-list-creation.hb.yaml` |

- Operator looks up warehouse locations for items
- Items must be in stock at the warehouse
```

## Handling ambiguity

If you **cannot determine** any of these from the decision card:
- Whether it's human or machine (the **Who decides?** is vague)
- What the trigger is (the **What triggers it?** is vague or missing)
- What the decision produces (the **What it produces?** is vague)

Then:
1. Mark the card as `needs-clarification`
2. Write a specific question to the `## Agent Questions` section of the same scratchpad file:

```markdown
## Agent Questions

- [ ] **RE: warehouse staff / order received**: Is "order received" the same outcome as "order_submitted", or is it a separate event from an external system? (spec-agent)
```

3. Move on to the next card — never block.

## Handling refinements

When a decision card references an existing spec file (indicating a refinement rather than new discovery):

1. Read the existing spec file first
2. Apply the changes described in the card's bullet points
3. Validate as usual
4. Update the card status to `formalized`

## What you CAN assume

- Naming conventions: snake_case for identifiers, kebab-case for files and aggregates
- Info unit names from domain context (e.g., if the precondition is about stock, the info is `product_availability`)
- Standard patterns: a human intent decision reacting to an outcome usually needs the related status info
- If an outcome decision can fail, it needs assertions only on success outcomes
- Single success outcomes get `condition: always`

## What you CANNOT assume

- Who makes a decision if the scratchpad doesn't say
- Failure modes not mentioned in the scratchpad
- Business rules or policies not captured
- Whether something is a new process area or belongs to an existing one (when unclear)

## Naming conventions reference

- **Outcomes** — module-namespaced past tense: `order_management:order_created`, `order_management:payment_captured`
- **Intents** — module-namespaced imperative: `order_management:create_order`, `order_management:capture_payment`
- **Rejections** — `rejected:module:constraint`: `rejected:order_management:payment_failed`
- **Preconditions** — positive: `customer_info_provided`, not `missing_customer_info`
- **Constraints** — describe the failure: `payment_failed`, `stock_unavailable`
- **Info units** — descriptive nouns (flat, no namespace): `order_status`, `payment_status`
- **Assertion tags** — snake_case: `order_status_confirmed`
- **Spec files** — kebab-case in context folder: `ordering/specs/create-order.hb.yaml`
- **Aggregates** — process names: `order-processing`, not `order`

Streams (outcomes, intents, rejections) are namespaced by module. Info units stay flat. Produced streams must use the spec's own module prefix. Cross-module triggers (consuming from another module) are valid.
