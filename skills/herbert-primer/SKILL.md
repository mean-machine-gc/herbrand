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

Every decision has:
- **An agent** — who decides (human with a role, or machine)
- **A trigger** — what starts it (an outcome or an intent)
- **Choices** — what it produces when it succeeds (an intent or an outcome)
- **Rejects** — what can go wrong, each declaring the **info** it needs to detect the failure
- **Success conditions** — what must be true for each choice, each declaring the **info** it needs to evaluate
- **Assertions** — what must be true after each successful choice (tagged, testable post-conditions), each declaring the **info** it affects as a side effect

## Information context

Herbert tracks **info units** — named pieces of information that exist in the domain (e.g., `order_status`, `payment_status`, `available_products`). These are not data models or schemas; they are the bounded information context of each decision, directly inspired by Herbert Simon's bounded rationality.

Info units are declared in a single project-wide union and referenced in three places:
- **requiredInfo on rejects** — what information is needed to detect this failure
- **requiredInfo on success conditions** — what information is needed to confirm this condition
- **affectedInfo on assertions** — what information changes as a side effect of this choice

This creates a traceable read/write model: each decision *reads* info (requiredInfo) and *writes* info (affectedInfo). The info flow is derived from the decision specs, never designed upfront.

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

## The session cycle

Herbert work follows a natural rhythm:

1. **Discover** — listen to the conversation, capture observations in the scratchpad, formalize decisions when they're ready
2. **Refine** — deepen existing decisions as new detail emerges (new rejects, better descriptions, more examples)
3. **Review** — present the current understanding back to stakeholders in plain language, listen for corrections
4. **Challenge** — stress-test the model by finding gaps, dead ends, missing failure modes, and implicit assumptions

Then repeat. The model grows iteratively, never in one pass.

## Available skills

- **discover-decision** — listen, capture, formalize new decisions
- **refine-decision** — deepen existing decisions with new information
- **review-model** — present the model in plain language for stakeholder feedback
- **challenge-model** — find gaps and surface "what if" questions

## Golden rules

- **Never expose the framework to the business analyst.** No TypeScript, no types, no file names, no "specs" or "aggregates." Speak in the domain language.
- **Scratchpad before specs.** Capture freeform first, formalize only when ready.
- **Process first, data later.** Decisions reveal structure. Entities don't.
- **One decision, one file.** Always.
- **Exhaustive by design.** Every reject must be described. Every choice must have conditions and assertions. The framework enforces this through types — the agent enforces it through conversation.
