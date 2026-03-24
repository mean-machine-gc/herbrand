---
name: herbrand-primer
user_invocable: true
description: >-
  Reference primer for the Herbrand decision-first business analysis framework.
  Covers the intellectual foundations (Herbert Simon's decision theory, CQRS/Event Sourcing),
  the decision system architecture (intent stream and outcome stream, two reactive loops),
  decision procedures, information context, boundaries, spec structure,
  validation rules, role separation (conversation agent vs spec agent),
  and the MCP tools. Load this skill to understand how Herbrand works.
---

# Herbrand Framework Primer

## Intellectual foundations

Herbert Simon, the Nobel laureate economist, argued that **decision-making is the fundamental act of organizational behavior**. An organization is not a collection of data or processes — it is a network of decisions. Every business activity, from a customer placing an order to a warehouse worker picking items, is an act of deciding.

Alberto Brandolini, the creator of EventStorming, pioneered **collaborative domain discovery** — the idea that you understand a business by exploring what happens in it, together with the people who do the work.

Herbrand brings these two ideas together. It takes Simon's insight that organizations are decision systems, and Brandolini's method of discovering what happens through conversation — and bridges them to modern software architecture patterns like CQRS (Command Query Responsibility Segregation) and Event Sourcing.

The bridge is this: **intent decisions produce commands, outcome decisions produce events.** Two types of decision, two streams, two reactive loops. A decision network that is simultaneously a business analysis artifact and an architectural blueprint.

## The decision system

An information system is a decision system. It has two streams and two types of decision:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   Outcome Stream ──→ Intent Decisions ──→ Intent Stream  │
│        ↑                                       │         │
│        │                                       ↓         │
│   Intent Stream ──→ Outcome Decisions ──→ Outcome Stream │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Intent decisions** react to what has happened (outcomes) and decide **what should happen next** (intents). They consume from the outcome stream and deposit into the intent stream. These are made by humans ("the customer decides to place an order") or by machines acting on behalf of humans ("the system automatically initiates payment").

**Outcome decisions** react to what someone wants to happen (intents) and decide **what has actually happened** (outcomes). They consume from the intent stream and deposit into the outcome stream. These are always made by machines — the system processes the intent, checks constraints, and records what happened.

This creates two reactive loops:
- **The intent loop**: outcomes trigger intent decisions, which produce intents. "Something happened, so someone decides what to do next."
- **The outcome loop**: intents trigger outcome decisions, which produce outcomes. "Someone wanted something to happen, so the system processes it and records what actually happened."

The outcome stream also carries **rejections** — when an outcome decision fails a constraint, it produces a rejection event (`rejected:payment_failed`). Rejections can trigger intent decisions, creating **recovery flows**: "payment failed, so the customer decides to retry with a different card."

### Why two types of decision

This distinction is not arbitrary — it mirrors a deep truth about information systems:

- **Intent decisions are about judgment.** A human (or a machine acting on policy) evaluates the situation and decides what should happen. These decisions have no side effects — they produce a signal of intent, nothing more. If preconditions aren't met, the decision simply doesn't apply (silent skip).

- **Outcome decisions are about processing.** The system takes an intent, checks constraints, and determines what actually happened. These decisions have side effects — they change the state of the world. If constraints fail, the failure itself is an event (rejection) that enters the stream.

This maps directly to CQRS: intent decisions produce commands, outcome decisions produce events. And to Event Sourcing: the outcome stream is the event log, the intent stream is the command log. But these architectural patterns emerge from the decision structure — they are not imposed.

### Streams

- **Outcomes** — things that happened (past tense): `order_management:order_created`, `order_management:payment_captured`
- **Intents** — things someone wants to do (imperative): `order_management:create_order`, `order_management:capture_payment`
- **Rejections** — outcome decision failures: `rejected:order_management:payment_failed`

Streams use the `module:stream_name` convention. The module prefix identifies which consistency boundary the signal belongs to. Cross-module signals are explicit — when a spec in one module triggers on a stream from another module, the namespace makes the boundary crossing visible.

All streams are declared in `project.hb.yaml`. Every reference in a spec is validated against these streams.

## Decision procedures

### Intent decision procedure

1. Check all **preconditions** (positive statements, e.g. `customer_info_provided`)
2. All pass → **produce the intent** (deposit into the intent stream)
3. Any fails → **skip silently** (non-event — this decision doesn't apply right now)

Intent decisions have no side effects. The silent skip means "the conditions for this decision aren't met."

### Outcome decision procedure

1. Check all **failure constraints** (e.g. `payment_failed`)
2. Any fails → **produce a rejection** (`rejected:${constraint}`) into the outcome stream
3. All pass → evaluate **conditions** of each success outcome
4. Produce the matching outcome (at least one must have `condition: always`)
5. Execute **assertions** — record what changed

Outcome decisions have side effects — assertions describe what changes and which information is affected.

### The key distinction

- Intent precondition failure = **silent skip** (non-event, nothing enters any stream)
- Outcome constraint failure = **rejection event** (enters the outcome stream, can trigger recovery)

## Information context

Decision procedures need information to compute. **Info units** are named pieces of information in the global information space:

- **requiredInfo on preconditions** — what info is needed to evaluate (intent decisions)
- **requiredInfo on constraints** — what info is needed to check (outcome decisions)
- **requiredInfo on conditions** — what info determines which outcome (outcome decisions)
- **affectedInfo on assertions** — what info changes as a side effect (outcome decisions only)

## The three boundaries

Boundaries emerge from the decision network — never define them upfront.

- **Aggregate** — transactional boundary. Named after processes: `order-processing`, not `order`.
- **Module** — consistency boundary. Groups aggregates that need each other. **The module is the signal boundary** — streams are namespaced by module (`module:stream_name`).
- **Context** — semantic boundary. Defines the ubiquitous language. **Contexts map to folders** — a folder containing a `specs/` subdirectory is a context.

## Two roles, one framework

Herbrand separates the work into two complementary roles:

### The Conversation Agent (you, during discovery)

You are a **business analyst**. You listen to domain experts, ask questions, and capture a rich understanding of the domain in plain language. You write to the scratchpad — process descriptions, business rules, roles and responsibilities, failure scenarios, domain vocabulary. You don't think in decisions, streams, or specs. You think in the domain expert's language.

### The Spec Agent (the herbrand-spec-agent subagent)

The spec agent is a **decision theorist**. It reads your rich domain notes and interprets everything through Herbert Simon's lens. Every business action is a decision. Every decision produces either an intent or an outcome. The decisions connect into a network through streams. The spec agent writes the YAML specs, validates them, and maintains the decision system.

**The conversation agent captures domain richness. The spec agent formalizes the decisions. Never cross the boundary.**

## The scratchpad

The scratchpad is your working memory — rich domain notes in plain business language. Write down what you hear, what you understand, what you're unsure about. Process descriptions, business rules, roles, edge cases, domain vocabulary, open questions.

- **Global scratchpad** (`scratchpad/`): strategic notes, cross-context questions, things that don't belong to one context yet.
- **Context scratchpad** (`ordering/scratchpad/`): domain notes within a specific context.

The scratchpad is NOT a staging area for decision cards or templates. It's your domain knowledge base. When it has enough richness, spawn the spec agent to interpret it.

## The deal

You write YAML specs (via the spec agent). Herbrand does the rest — it reactively parses your specs, validates them against the project streams, detects system-level issues, and generates business-friendly user stories with acceptance criteria, decision tables, and scenarios.

### `get_pipeline_results`

Your primary feedback tool. Call this after every spec change. Accepts an optional `context` parameter:
- No context → full system lint (all specs, including cross-module integration checks)
- `context: "ordering"` → scoped lint (only specs from `ordering/specs/`)

Returns:
- `specCount` — how many specs exist
- `specLint` — per-spec completeness issues
- `hasSpecErrors` — whether spec-lint has blocking errors
- `behaviorLint` — system-level issues (orphans, dead ends, info gaps, unhandled rejections)

### `get_user_stories`

Returns a summary of all user stories derived from specs. Each entry has name, role, intent, business goal. Use this to see the business landscape.

### `get_user_story`

Returns a single user story with full business details:
- **Acceptance criteria** — Given/When/Then/Should Fail If
- **Decision table** — all paths with precondition/constraint columns
- **Scenarios** — concrete examples for each path
- **Views** — the information the decision-maker needs

## Your workflow

### 1. ORIENT — Call `get_pipeline_results`. Understand the project state.

### 2. DISCOVER — Listen to the conversation. Capture rich domain notes in the scratchpad. When you have enough understanding, spawn the spec agent.

### 3. REFINE — When new detail emerges about an existing decision, capture the refinement in the scratchpad and spawn the spec agent.

### 4. REVIEW — Call `get_user_stories` and `get_user_story`. Present the model in plain language. Listen for corrections.

### 5. CHALLENGE — Read `behaviorLint`. Translate findings into natural domain questions.

## Folder structure

```
project.hb.yaml              ← global streams and boundaries
scratchpad/                   ← global scratchpad
ordering/
  specs/                      ← ordering context specs
  scratchpad/                 ← ordering scratchpad
fulfillment/
  specs/
  scratchpad/
```

## Writing specs

### Project file: `project.hb.yaml`

```yaml
outcomes:
  - order_management:order_created
  - order_management:order_confirmed

intents:
  - order_management:create_order
  - order_management:confirm_order

info:
  - customer_info
  - order_status
  - payment_status

outcomeRejects:
  - order_management:payment_failed

contexts:
  - ordering

modules:
  - order_management

aggregates:
  - order-processing
```

### Intent decision: `ordering/specs/create-order.hb.yaml`

```yaml
type: intent
agent:
  kind: human
  role: customer
context: ordering
module: order_management
aggregate: order-processing
businessGoal: purchase desired products
description: A customer creates a new order by selecting products
trigger:
  type: success
  outcome: order_management:order_created
preconditions:
  customer_info_provided:
    description: The customer has provided required contact and shipping information
    requiredInfo:
      - customer_info
    scenarios:
      - Customer submits order without a shipping address
producesIntent:
  intent: order_management:create_order
  description: A new order is created with the selected products
  requiredInfo:
    - customer_info
```

### Outcome decision: `ordering/specs/confirm-order.hb.yaml`

```yaml
type: outcome
agent:
  kind: machine
context: ordering
module: order_management
aggregate: order-processing
description: The system confirms a submitted order after verifying payment and stock
trigger: order_management:confirm_order
shouldFailWith:
  order_management:payment_failed:
    description: Payment could not be processed
    requiredInfo:
      - payment_status
    scenarios:
      - Credit card is declined
shouldSucceedWith:
  order_management:order_confirmed:
    condition: always
    description: The order is confirmed and ready for fulfillment
    requiredInfo:
      - payment_status
shouldAssert:
  order_management:order_confirmed:
    - tag: order_status_confirmed
      description: The order status transitions to confirmed
      affectedInfo:
        - order_status
    - tag: payment_captured
      description: Payment has been charged to the customer
      affectedInfo:
        - payment_status
```

### Cross-module trigger:

```yaml
trigger:
  type: success
  outcome: order_management:order_confirmed    # ← consuming from another module's stream
producesIntent:
  intent: warehouse_management:assign_order     # ← producing to own module's stream
```

### Rejection-triggered recovery:

```yaml
trigger:
  type: reject
  rejection: rejected:order_management:payment_failed
```

## Validation rules (enforced automatically)

- All outcomes, intents, info, rejects must be declared in `project.hb.yaml`
- Snake_case for identifiers, kebab-case for aggregates
- Human agents must have a role, machine agents must not
- At least one precondition on intent decisions
- At least one success outcome with `condition: always` on outcome decisions
- Every success outcome must have assertions with affectedInfo
- requiredInfo must reference at least one info unit per precondition/constraint
- Descriptions and businessGoal must be non-empty

## Golden rules

- **The conversation agent captures domain richness. The spec agent formalizes decisions.** Never cross the boundary.
- **Process first, data later.** Decisions reveal structure. Entities don't.
- **One decision, one file.** Each spec is a meaningful business decision — one that a domain expert would recognize.
- **Decisions form a network, not a state machine.** Don't enumerate every possible state transition. Each decision appears once, with its most natural trigger.
- **Rejections are events, skips are not.** Outcome failures enter the stream. Intent skips are silent.
- **Namespace streams by module.** Use `module:stream_name`. Info units stay flat.
- **Never expose the framework to the business analyst.** Speak in the domain language.
- **Call `get_pipeline_results` after every spec change.**
