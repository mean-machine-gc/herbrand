# Herbert Framework Primer

Herbert is a decision-first business analysis framework, named after Herbert Simon — the economist who argued that decision-making is the fundamental act of organizational behavior.

## Core idea

Herbert models a system as a set of **bounded decisions** — units of information processing that transform inputs into outputs through a defined procedure. Every business process is a chain of these decisions.

The person using Herbert is a **business analyst** who doesn't know or care about the underlying types. They discover the domain through conversation — with clients, domain experts, or stakeholders. Your job is to listen, capture, and progressively formalize what you hear into a structured decision model.

## The two loops

Herbert models two interconnected processing loops, each consuming one stream and producing another:

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

**The Intent Loop** consumes the outcomes stream and populates the intents stream. Intent decisions answer: **"what should happen?"**

**The Outcome Loop** consumes the intents stream and populates the outcomes stream. Outcome decisions answer: **"what has happened?"**

Additionally, the **rejection stream** (`rejected:${constraint}`) produced by outcome decisions can also trigger intent decisions, creating recovery and compensation flows.

### Streams

- **Outcomes** — things that happened (past tense, like domain events): `order_created`, `payment_captured`. Represented as a literal union type.
- **Intents** — things someone wants to do (imperative, like commands): `create_order`, `capture_payment`. Represented as a literal union type.
- **Rejections** — outcome decision failures that enter the stream as events: `rejected:payment_failed`. Other intent decisions can react to these.

## Decision procedures

Each decision type has a defined procedure — the algorithm by which information is transformed into output.

### Intent decision procedure

1. Check all **preconditions** (expressed as positive statements, e.g., `customer_info_provided`)
2. If all preconditions are satisfied → **produce the intent**
3. If any precondition fails → **skip silently** (this is a non-event, not a failure)

Intent decisions have no side effects. They express what the agent wants. The silent skip means "this decision doesn't apply right now" — nothing enters any stream.

### Outcome decision procedure

1. Check all **failure constraints** (e.g., `payment_failed`, `stock_unavailable`)
2. If any constraint fails → **produce a rejection outcome** (`rejected:${constraint}`) that enters the rejection stream
3. If all constraints pass → evaluate the **conditions** of each success outcome
4. Produce the matching success outcome

At least one success outcome must have `condition: 'always'` as the default path. If there's only one success outcome, it's implicitly always.

Outcome decisions have **side effects** — they change state. Each success outcome has assertions that describe what must be true after, and which info units are affected.

### The key distinction

- Intent precondition failure = **silent skip** (non-event, edge label in the graph)
- Outcome constraint failure = **rejection event** (enters the stream, becomes a node in the graph that other decisions can react to)

## Information context

Every decision procedure step requires information to compute. Herbert tracks **info units** — named pieces of information that exist in the domain (e.g., `order_status`, `payment_status`, `available_products`). These are not data models or schemas; they represent the **bounded information context** of each decision, directly inspired by Herbert Simon's bounded rationality.

Info units are declared in a single project-wide union — the **global information space** of the project. They are referenced at each procedure step:
- **requiredInfo on preconditions** (intent decisions) — what information is needed to evaluate this precondition
- **requiredInfo on constraints** (outcome decisions) — what information is needed to check this constraint
- **requiredInfo on conditions** (outcome decisions) — what information is needed to determine which outcome to produce
- **affectedInfo on assertions** (outcome decisions only) — what information changes as a side effect

This creates a traceable read/write model: decision procedures *read* info (requiredInfo) and outcome decisions *write* info (affectedInfo). The info flow is derived from the decision specs, never designed upfront. The info units that a decision reads compose its **view** — the information the agent needs to see to make the decision.

## The three boundaries

As decisions accumulate, boundaries emerge. Never define boundaries upfront — let them reveal themselves from the decision flow.

- **Aggregate** — transactional boundary. Data changes atomically. Named after processes, not entities: `order-processing`, not `order`. The root entity lives inside the aggregate.
- **Module** — consistency boundary. Groups aggregates that need each other to enforce invariants they can't enforce alone. Packaged as a single deliverable.
- **Context** — semantic boundary. Defines the ubiquitous language. The word "Order" in sales means something different from "Order" in procurement.

The same entity can appear in different aggregates under different contexts. This is expected and correct.

## Process first, data later

Herbert deliberately avoids modeling data upfront. The decision flow reveals what aggregates, modules, and contexts exist. Starting from entities leads to CRUD. Starting from decisions leads to behavior.

Data observations belong in the scratchpad, not in the formal model, until the process is well understood.

## File structure

```
src/
  framework.ts              # Type system (read-only)
  project.decisions.ts      # Domain unions, decision helpers, boundary definitions
  specs/
    {decision-name}.spec.ts # One file per decision: type + spec
  scratchpad/
    {topic-or-session}.md   # Freeform notes, observations, open questions
```

## The two validation loops

Herbert uses two intertwined feedback loops. Each loop validates at a different level and feeds corrections back to the specs.

### Loop 1: Spec validation (per-decision completeness)

```
conversation → scratchpad → spec → npm run specs → spec-lint → fix spec → repeat
```

After creating or modifying a spec, run `npm run specs`. This:
1. Typechecks all specs (`tsc`)
2. Parses specs into a structured format
3. Runs spec-lint — checks individual spec completeness (missing descriptions, missing scenarios, missing info, missing context/module/aggregate)
4. Renders the specs view with lint results

**Stay in this loop until spec-lint reports zero errors.** Warnings are acceptable — they indicate areas to revisit but don't block progress. Errors must be fixed before proceeding.

### Loop 2: Behavioral validation (system-level coherence)

```
specs (clean) → npm run graph → behavior-lint → adjust specs → back to Loop 1
```

Once specs are clean, run `npm run graph`. This:
1. Builds the decision graph from all specs combined
2. Runs behavior-lint — detects orphans, dead ends, info flow gaps, unhandled rejections, boundary issues
3. Renders the graph view with lint results

Behavior-lint findings are addressed by **modifying specs** — adding missing decisions, connecting orphaned outcomes, filling info gaps. Every spec change sends you back to Loop 1 (spec validation) before re-running Loop 2.

### The full cycle

```
                    ┌─────────────────────────────┐
                    │                             │
conversation → spec ──→ Loop 1 (spec-lint) ──→ clean? ──→ Loop 2 (behavior-lint)
                ↑         │ no                              │
                │         └── fix spec ─────────────────────┘
                │                                           │
                └── address behavior findings ──────────────┘
```

The pipeline command `npm run herbert` runs both loops in sequence. Use `npm run specs` to iterate on Loop 1 alone, `npm run graph` to run Loop 2 once specs are clean.

## The session rhythm

Within the validation loops, the BA work follows a natural rhythm:

1. **Discover** — listen to the conversation, capture observations in the scratchpad, formalize decisions when ready, run Loop 1 to validate
2. **Refine** — deepen existing decisions as new detail emerges, run Loop 1 after each change
3. **Review** — run Loop 2 to see the full picture, present the graph view to stakeholders in plain language, listen for corrections
4. **Challenge** — use behavior-lint findings to stress-test the model, surface "what if" questions based on orphans, dead ends, and info gaps

Then repeat. The model grows iteratively, never in one pass.

## Available skills

- **discover-decision** — listen, capture, formalize new decisions
- **refine-decision** — deepen existing decisions with new information
- **review-model** — present the model in plain language for stakeholder feedback
- **challenge-model** — find gaps and surface "what if" questions

## Pipeline commands

- `npm run specs` — Loop 1: typecheck → parse → spec-lint → specs view
- `npm run graph` — Loop 2: build graph → behavior-lint → graph view (blocked by spec-lint errors)
- `npm run herbert` — both loops in sequence

## Golden rules

- **Never expose the framework to the business analyst.** No TypeScript, no types, no file names, no pipeline commands. Speak in the domain language.
- **Scratchpad before specs.** Capture freeform first, formalize only when ready.
- **Loop 1 before Loop 2.** Always validate specs before building the graph.
- **Process first, data later.** Decisions reveal structure. Entities don't.
- **One decision, one file.** Always.
- **Exhaustive by design.** Every precondition, constraint, and condition must be described. Outcome decisions must have assertions. If multiple success outcomes, one must have `condition: 'always'`.
- **Rejections are events, skips are not.** When an outcome decision fails, it produces a rejection event that enters the stream. When an intent decision skips, nothing happens. Always consider whether a rejection needs a recovery flow.
- **Preconditions are positive.** Intent decision preconditions are expressed as positive statements (`customer_info_provided`, not `missing_customer_info`). They describe what must be true, not what can go wrong.
