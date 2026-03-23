---
name: herbrand-discover
user_invocable: true
description: >-
  Workflow for discovering and formalizing new decisions from conversation.
  Guides recognition of decision signals (human intents, machine outcomes,
  recovery flows), the four-question readiness test (who decides, what triggers,
  what can fail, what it produces), step-by-step formalization (determine type,
  identify streams, identify info units, write the spec files, validate with
  get_pipeline_results), and domain-language questions to ask the business
  analyst. Includes patterns for human/machine intent decisions, outcome
  decisions with single or multiple outcomes, and naming conventions.
---

# Discover Decision

Use this skill when the conversation reveals a new decision that doesn't exist as a spec yet.

## How to recognize a decision

Listen for signals in the conversation:

- **"Someone does X"** → a human intent decision (who? what triggers them? what do they produce?)
- **"The system checks/processes/validates X"** → a machine outcome decision (what intent triggers it? what can fail? what outcome does it produce?)
- **"When X happens, Y reacts"** → a machine intent decision triggered by an outcome
- **"If X fails, then Z happens"** → a recovery flow triggered by a rejection
- **"Before doing X, we need to check Y"** → a precondition on an intent decision

## The readiness test

A decision is ready to formalize when you can answer all four:

1. **Who decides?** Human (with a role) or machine?
2. **What triggers it?** An outcome, a rejection, or an intent?
3. **What can go wrong?** At least one precondition (intent) or constraint (outcome).
4. **What does it produce?** An intent (if triggered by outcome/rejection) or an outcome (if triggered by intent).

If you can't answer all four → write to the scratchpad, keep probing.

## How to formalize

### Step 1: Determine the decision type

- Human or machine reacting to an outcome or rejection → **intent decision**
- Machine processing an intent → **outcome decision**

### Step 2: Identify the streams

For an intent decision:
- What outcome or rejection triggers it? → add to outcomes list in `project.hb.yaml` if new
- What intent does it produce? → add to intents list in `project.hb.yaml` if new

For an outcome decision:
- What intent triggers it? → should already exist in `Intents`
- What outcome does it produce? → add to outcomes list in `project.hb.yaml` if new
- What constraints can fail? → add to outcomeRejects list in `project.hb.yaml` if new

### Step 3: Identify info units

For each precondition/constraint: what info is needed to evaluate it? Add to info list in `project.hb.yaml` if new.
For each assertion (outcome only): what info changes? Add to info list in `project.hb.yaml` if new.

Remember: info units are inferred from the spec content:
- A precondition `customer_info_provided` implies required info `customer_info`
- An assertion `order_status_confirmed` implies affected info `order_status`

### Step 4: Write the files

1. Update `project.hb.yaml` — add new entries to the streams
2. Create `specs/{decision-name}.hb.yaml` — the decision spec in YAML format

### Step 5: Validate

Call `get_pipeline_results`. Check spec-lint:
- **Errors** → fix the spec, call again
- **Warnings** → note them, address later
- **Clean** → continue conversation

### Step 6: Update the scratchpad

Mark the entry as formalized. Note remaining open questions.

## What to ask the BA

When you need more detail to formalize, ask in **domain language**:

- "What happens when [outcome]? Does anyone need to act on that?"
- "Who is responsible for [action]? Is that the customer or someone internal?"
- "Can [action] fail? What would cause that?"
- "After [outcome], what changes? What do we know for sure?"
- "Does [role] need to see anything before deciding?"

Never ask about types, triggers, specs, or framework concepts.

## Intent decision patterns

### Human reacting to an outcome
"The customer sees that the order was created and decides to submit it."
→ `type: intent`, `agent: { kind: human, role: customer }`
→ `trigger: { type: success, outcome: order_created }`

### Machine reacting to an outcome (automation)
"After the order is submitted, the system automatically starts confirmation."
→ `type: intent`, `agent: { kind: machine }`
→ `trigger: { type: success, outcome: order_submitted }`

### Reacting to a rejection (recovery)
"When payment fails, customer service reviews the order."
→ `type: intent`, `agent: { kind: human, role: customer_service }`
→ `trigger: { type: reject, rejection: rejected:payment_failed }`

## Outcome decision patterns

### Single outcome (most common)
"The system processes the order creation."
→ `type: outcome`, `trigger: create_order`
→ single outcome with `condition: always`

### Multiple outcomes with conditions
"The system routes the order — express if they paid for it, standard otherwise."
→ `type: outcome`, `trigger: route_order`
→ express has a specific condition, standard has `condition: always`

### Multiple unconditional outcomes
"The system sends an email and logs the audit trail."
→ Both outcomes have `condition: always`

## Naming conventions

- **Outcomes** — past tense: `order_created`, `payment_captured`
- **Intents** — imperative: `create_order`, `capture_payment`
- **Preconditions** — positive statements: `customer_info_provided`, not `missing_customer_info`
- **Constraints** — describe the failure: `payment_failed`, `stock_unavailable`
- **Info units** — descriptive nouns: `order_status`, `payment_status`
- **Assertion tags** — snake_case descriptive: `order_status_confirmed`, `payment_captured`
- **Spec files** — kebab-case: `create-order.hb.yaml`, `process-create-order.hb.yaml`
- **Aggregates** — process names: `order-processing`, not `order`
