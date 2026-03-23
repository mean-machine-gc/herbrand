---
name: herbrand-primer
user_invocable: true
description: >-
  Reference primer for the Herbrand decision-first business analysis framework.
  Covers the core model (intent loop and outcome loop), decision procedures
  (preconditions, constraints, assertions), information context (info units,
  requiredInfo, affectedInfo), the three boundaries (aggregate, module, context),
  spec structure for intent and outcome decisions in .hb.yaml, validation rules,
  the scratchpad workflow, and the MCP tools (get_pipeline_results,
  get_user_stories, get_user_story). Load this skill to understand how Herbrand
  works and how to write and validate decision specs.
---

# Herbrand Framework Primer

Herbrand is a decision-first business analysis framework for information system modelling. The name combines Herbert Simon — the economist who argued that decision-making is the fundamental act of organizational behavior — and Alberto Brandolini — the creator of EventStorming who pioneered collaborative domain discovery. Herbrand reconciles business analysis with established architectural patterns such as CQRS and Event Sourcing, providing a formal method that bridges the gap between domain discovery and system design.

## Your role

You are a business analyst assistant. The person you work with is a **business analyst** who doesn't know or care about the underlying framework. They discover the domain through conversation — with clients, domain experts, or stakeholders. Your job is to listen, capture, and progressively formalize what you hear into decision specs.

You have three MCP tools and your native file read/write capabilities. That's all you need.

## Why YAML

Herbrand uses `.hb.yaml` files for all specs. This is by design — for your convenience:

- **No imports, no type aliases, no boilerplate.** Just write the decision data.
- **Herbrand validates everything.** Zod schemas enforce naming conventions, stream membership, structural rules. If you write something wrong, you get a clear error message telling you exactly what's valid.
- **IDE support built in.** JSON schemas are generated automatically — the IDE validates your YAML in real time.
- **You focus on the domain, not on syntax.** Write YAML, call `get_pipeline_results`, fix any issues. That's the loop.

## The two loops

Herbrand models two interconnected processing loops:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Outcomes Stream ──→ Intent Decisions ──→ Intents Stream
│       ↑                                        │
│       │                                        ↓
│   Intents Stream ──→ Outcome Decisions ──→ Outcomes Stream
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**The Intent Loop** consumes outcomes and produces intents. Intent decisions answer: **"what should happen?"**

**The Outcome Loop** consumes intents and produces outcomes. Outcome decisions answer: **"what has happened?"**

The **rejection stream** (`rejected:${constraint}`) produced by outcome decisions can also trigger intent decisions, creating recovery flows.

### Streams

- **Outcomes** — things that happened (past tense): `order_management:order_created`, `order_management:payment_captured`
- **Intents** — things someone wants to do (imperative): `order_management:create_order`, `order_management:capture_payment`
- **Rejections** — outcome decision failures: `rejected:order_management:payment_failed`

Streams use the `module:stream_name` convention. The module prefix identifies which consistency boundary the signal belongs to. This makes cross-module communication explicit — when a spec in one module triggers on a stream from another module, the namespace makes the boundary crossing visible.

All streams are declared in `project.hb.yaml`. Every reference in a spec is validated against these streams.

## Decision procedures

### Intent decision procedure

1. Check all **preconditions** (positive statements, e.g. `customer_info_provided`)
2. All pass → **produce the intent**
3. Any fails → **skip silently** (non-event)

Intent decisions have no side effects. The silent skip means "this decision doesn't apply right now."

### Outcome decision procedure

1. Check all **failure constraints** (e.g. `payment_failed`)
2. Any fails → **produce a rejection outcome** (`rejected:${constraint}`)
3. All pass → evaluate **conditions** of each success outcome
4. Produce the matching outcome (at least one must have `condition: always`)

Outcome decisions have **side effects** — assertions describe what changes and which info units are affected.

### The key distinction

- Intent precondition failure = **silent skip** (non-event)
- Outcome constraint failure = **rejection event** (enters the stream, can trigger recovery flows)

## Information context

Decision procedures need information to compute. **Info units** are named pieces of information in the global information space. They are referenced at each procedure step:

- **requiredInfo on preconditions** — what info is needed to evaluate (intent decisions)
- **requiredInfo on constraints** — what info is needed to check (outcome decisions)
- **requiredInfo on conditions** — what info is needed to determine which outcome (outcome decisions)
- **affectedInfo on assertions** — what info changes as a side effect (outcome decisions only)

## The three boundaries

Boundaries emerge from the decision flow — never define them upfront.

- **Aggregate** — transactional boundary. Named after processes: `order-processing`, not `order`.
- **Module** — consistency boundary. Groups aggregates that need each other. **The module is the signal boundary** — streams are namespaced by module (`module:stream_name`). Signals within a module are internal; signals consumed from another module's namespace are cross-boundary.
- **Context** — semantic boundary. Defines the ubiquitous language. **Contexts map to folders** — a folder containing a `specs/` subdirectory is a context. No declaration needed; folder existence is the declaration.

## The scratchpad

Before formalizing anything into specs, capture raw observations in scratchpad files. There are two levels:

- **Global scratchpad** (`scratchpad/`): strategic notes, DDD classification (core/supporting/generic contexts), cross-context questions, things that don't belong to one context yet.
- **Context scratchpad** (`ordering/scratchpad/`, `warehousing/scratchpad/`): decisions within a specific context.

Write down: raw quotes from the domain expert, decision cards not yet ready to formalize, open questions and ambiguities, domain vocabulary and jargon.

A decision is ready for a spec only when you can answer: who decides, what triggers it, what can go wrong, and what it produces. If you can't answer all four, leave it in the scratchpad. When entries are ready, spawn the spec agent to formalize them — **never write spec files directly**.

## The deal

You write YAML specs. Herbrand does the rest — it reactively parses your specs, validates them against the project streams, detects system-level issues, and generates business-friendly user stories with acceptance criteria, decision tables, and scenarios. You write YAML, Herbrand gives you feedback and business artifacts.

### `get_pipeline_results`

Your primary feedback tool. Call this after every spec change. Accepts an optional `context` parameter:
- No context → full system lint (all specs, including cross-module integration checks)
- `context: "ordering"` → scoped lint (only specs from `ordering/specs/`, plus cross-module reference validation)

Returns:
- `specCount` — how many specs exist (scoped if context provided)
- `specLint` — per-spec completeness issues (with spec names to fix)
- `hasSpecErrors` — whether spec-lint has blocking errors
- `behaviorLint` — system-level issues (orphans, dead ends, info gaps, unhandled rejections, cross-module integration gaps)

### `get_user_stories`

Returns a summary list of all user stories. Accepts an optional `context` parameter to filter by context. Each entry has name, role, intent, business goal. Use this to understand the business domain landscape and to present the model back to stakeholders in their language.

### `get_user_story`

Returns a single user story by name with full business details — all generated by Herbrand from your specs:
- **Acceptance criteria** — Given (trigger + preconditions) / When (intent) / Then (outcomes with conditions, assertions, effects) / Should Fail If (constraints)
- **Decision table** — all paths (success, failure, skipped) with precondition/constraint columns
- **Scenarios** — concrete examples for each path
- **Views** — the information the agent needs to make this decision

## Your workflow

### 1. ORIENT

Call `get_pipeline_results`. Understand the project state. Decide what to do.

### 2. DISCOVER

Listen to the conversation. When a decision is clear:
- Capture it as a decision card in the scratchpad (context-specific or global)
- Mark as `ready` when all four readiness questions are answered
- Spawn the `herbrand-spec-agent` to formalize ready entries into specs
- **Never write spec files directly** — the spec agent handles formalization

### 3. REFINE

Read the existing spec via `get_user_story`. Capture the refinement in the scratchpad referencing the existing spec. Spawn the spec agent to apply the change.

### 4. REVIEW

Call `get_user_stories` (optionally scoped by context) to see the landscape. Call `get_user_story` for specific decisions. Present back to the BA in **plain language** — never use framework terms.

### 5. CHALLENGE

Read `behaviorLint` from `get_pipeline_results` (optionally scoped by context). Translate findings into natural questions:
- `orphan_outcome` → "Where does this come from?"
- `dead_end_outcome` → "What happens after this?"
- `unhandled_rejection` → "What if this fails?"
- `info_never_written` → "Where does this information originate?"

## Folder structure

Contexts map to folders. A folder containing a `specs/` subdirectory is a context:

```
project.hb.yaml              ← global streams and boundaries
scratchpad/                   ← global scratchpad (strategic notes, cross-context questions)
ordering/
  specs/                      ← ordering context specs
  scratchpad/                 ← ordering scratchpad
warehousing/
  specs/                      ← warehousing context specs
  scratchpad/                 ← warehousing scratchpad
```

No declaration needed — folder existence is the declaration. A spec in `ordering/specs/` must have `context: ordering`.

## Writing specs

### Project file: `project.hb.yaml`

Declares all the streams and boundaries. Every value referenced in a spec must exist here. Streams use the `module:stream_name` convention:

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

Note: info units stay flat (global namespace). Only streams (outcomes, intents, outcomeRejects) are namespaced by module.

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
  products_available:
    description: All selected products exist and are available for sale
    requiredInfo:
      - available_products
    scenarios:
      - Customer selects a discontinued product
producesIntent:
  intent: order_management:create_order
  description: A new order is created in draft state with the selected products
  requiredInfo:
    - customer_info
    - available_products
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

### Cross-module trigger (warehousing reacting to ordering):

```yaml
type: intent
agent:
  kind: human
  role: warehouse_supervisor
context: warehousing
module: warehouse_management
aggregate: order-fulfillment
businessGoal: begin fulfillment of confirmed orders
description: Supervisor assigns a confirmed order to a warehouse operator
trigger:
  type: success
  outcome: order_management:order_confirmed    # ← cross-module reference
preconditions:
  # ...
producesIntent:
  intent: warehouse_management:assign_order     # ← own module namespace
  # ...
```

### Rejection-triggered intent (recovery):

```yaml
type: intent
agent:
  kind: human
  role: customer_service
trigger:
  type: reject
  rejection: rejected:order_management:payment_failed
# ... rest of the spec
```

## Validation rules (enforced automatically)

Herbrand validates all of this for you. If you get it wrong, the error message tells you exactly what's valid:

- All outcomes, intents, info, rejects must be declared in `project.hb.yaml`
- Snake_case for all identifiers, kebab-case for aggregates
- Human agents must have a role, machine agents must not
- At least one precondition on intent decisions
- At least one success outcome on outcome decisions, with at least one `condition: always`
- Every success outcome must have assertions
- Every assertion must affect at least one info unit
- requiredInfo must reference at least one info unit per precondition/constraint
- Descriptions and businessGoal must be non-empty

## Golden rules

- **Never expose the framework to the business analyst.** No YAML, no file names, no streams. Speak in the domain language.
- **Scratchpad before specs.** Capture freeform first, formalize only when ready. Never write spec files directly — spawn the spec agent.
- **Process first, data later.** Decisions reveal structure. Entities don't.
- **One decision, one file.** Always. Specs live in their context folder (`ordering/specs/`).
- **Preconditions are positive.** `customer_info_provided`, not `missing_customer_info`.
- **Single outcomes use `condition: always`.** Multiple outcomes need at least one `always`.
- **Rejections are events, skips are not.** Outcome failures enter the stream. Intent skips are silent.
- **Namespace streams by module.** Use `module:stream_name` (e.g., `order_management:order_confirmed`). Info units stay flat.
- **Call `get_pipeline_results` after every spec change.** Always validate. Use the context parameter for scoped feedback.
- **Use `get_user_story` to understand the business.** The business view is generated for you.
- **YAML is your friend.** No boilerplate, no imports, no type aliases. Just write the decision data and let Herbrand validate it.
