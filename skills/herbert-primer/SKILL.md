# Herbert Framework Primer

Herbert is a decision-first business analysis framework, named after Herbert Simon — the economist who argued that decision-making is the fundamental act of organizational behavior.

## Core idea

Every business process is a chain of decisions. Herbert models these decisions formally, so they can be visualized, validated, and eventually drive implementation.

The person using Herbert is a **business analyst** who doesn't know or care about the underlying types. They discover the domain through conversation — with clients, domain experts, or stakeholders. Your job is to listen, capture, and progressively formalize what you hear into a structured decision model.

## The decision loop

Herbert models a closed causal loop between **outcomes** and **intents**:

```
Outcomes → Intent Decisions → Intents → Outcome Decisions → Outcomes → ...
```

- **Outcomes** are things that happened (past tense, like domain events): `order_created`, `payment_captured`
- **Intents** are things someone wants to do (imperative, like commands): `create_order`, `capture_payment`
- **Intent Decisions** are made by a human or machine who observes an outcome and expresses an intent
- **Outcome Decisions** are made by a machine that receives an intent and produces an outcome

There are two types of decisions:

**Intent decisions** (human or machine reacting to the world):
- **Trigger** — a success outcome OR a rejection from another decision
- **Choices** — the intents this decision can produce
- **Rejects** — what can go wrong, each declaring the **info** it needs to detect the failure
- **Success conditions** — what must be true for each choice, each declaring the **info** it needs to evaluate
- Intent decisions express what the agent wants — they have no side effects

**Outcome decisions** (machine executing an intent):
- **Trigger** — an intent
- **Choices** — the outcomes this decision can produce
- **Rejects** — what can go wrong (these produce rejection events in the `rejected:${tag}` stream that other intent decisions can react to)
- **Success conditions** — same as above
- **Assertions** — what must be true after each successful choice (tagged post-conditions), each declaring the **info** it affects as a side effect
- Outcome decisions are the only ones that change state

Rejections are not dead ends. When an outcome decision rejects, it produces a rejection event (e.g., `rejected:payment_failed`) that flows into the rejection stream. Other intent decisions can be triggered by these rejections, creating recovery and compensation flows.

## Information context

Herbert tracks **info units** — named pieces of information that exist in the domain (e.g., `order_status`, `payment_status`, `available_products`). These are not data models or schemas; they are the bounded information context of each decision, directly inspired by Herbert Simon's bounded rationality.

Info units are declared in a single project-wide union and referenced in three places:
- **requiredInfo on rejects** — what information is needed to detect this failure
- **requiredInfo on success conditions** — what information is needed to confirm this condition
- **affectedInfo on assertions** — what information changes as a side effect (outcome decisions only)

This creates a traceable read/write model: intent decisions *read* info (requiredInfo) and outcome decisions *write* info (affectedInfo). The info flow is derived from the decision specs, never designed upfront.

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
- **Exhaustive by design.** Every reject must be described. Every choice must have conditions. Outcome decisions must have assertions. The framework enforces this through types — the agent enforces it through conversation.
- **Rejections are outcomes.** When something fails, that's an event someone might react to. Always consider whether a rejection needs a recovery flow.
