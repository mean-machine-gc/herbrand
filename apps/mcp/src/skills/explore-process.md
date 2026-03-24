---
name: herbrand-explore-process
user_invocable: true
description: >-
  Deep dive into a business process with the domain expert. Walk the narrative
  from trigger to outcome, discover policies and operations, write YAML specs,
  validate via lint loop, and present the business view for confirmation.
---

# Explore Process

## Purpose

You are walking through a specific business process with the domain expert. Your goal is to discover every decision in the chain — from the initial trigger to the final outcomes — and formalize each as a YAML spec.

## How to run this skill

### 1. Pick the process

Ask the domain expert which process to explore, or suggest one from the system overview. Call `get_system_overview` to see what processes are defined and which ones don't have decisions yet.

### 2. Walk the narrative

Follow the chain with questions:

- **"What triggers this process?"** → This gives you the external signal (the `activatedBy` outcome)
- **"Who reacts to this? What do they decide?"** → This gives you the first policy
- **"What do they need to know to make this decision?"** → This gives you preconditions and info point reads
- **"What can go wrong?"** → For policies: what preconditions might not be met (silent drop). For operations: what constraints could fail (explicit failure).
- **"What happens on success?"** → This gives you the operation's outcomes and their effects
- **"Are there conditional outcomes? Does something extra happen under certain conditions?"** → Conditional outcomes with their conditions
- **"Then what happens next?"** → Follow the chain — does any outcome trigger another policy?

### 3. Write YAML as you go

After discovering each decision, write the YAML file immediately:
- Policies go in `processes/{process-name}/{policy-name}.yaml`
- Operations go in `processes/{process-name}/{operation-name}.yaml`

Use the `type: policy` or `type: operation` discriminator. Always include:
- `id`, `description`, `context`, `actor`, `activatedBy`, `processes`
- For policies: `preconditions` (with reads), `emits`, optionally `businessGoal`
- For operations: `constraints` (with reads), `unconditionalOutcome` (with effects), `conditionalOutcomes`

### 4. Lint loop

After writing each YAML file, call `get_lint_results`.

**Errors must be fixed immediately.** Common errors:
- Missing required fields (spec lint)
- Unknown context or actor (system lint)
- Context-actor incompatibility (system lint)

**Warnings are discussion points.** Present them to the domain expert:
- "This info point isn't produced by any operation — where does this data come from?"
- "This intent has no consumer — should we add an operation?"

### 5. Validate the business view

When the process chain is complete, call `get_business_view` with the process filter.

Present each item to the domain expert:
- For user stories: "Here's what we've captured: *As a [role], I want to [intent] so that [goal]*. Does this look right?"
- For automations: "This automation fires when [trigger] — the [actor] at [context] [action]. Is this accurate?"

If the domain expert says no, adjust the YAML and re-validate.

### 6. Deep dive with get_user_story

For each business item, call `get_user_story` with the policy ID to get the full details:
- Acceptance criteria (Given/When/Then)
- Decision table (all paths)
- Scenarios (success/failure/skipped)
- View (info requirements)

Present the decision table to the domain expert: "Here are all the possible paths through this decision. Are we missing any?"

## Example conversation flow (member registration process)

Here's how a process exploration might go:

**Agent:** "Let's walk through the member registration process. What triggers it?"
**Expert:** "Someone comes to the front desk and asks to join the library."
**Agent:** → external signal: `membership.requested`

**Agent:** "Who decides whether they can join? What do they check?"
**Expert:** "The librarian. They need to see an ID, check the person lives in our area, and make sure they're not already a member."
**Agent:** → writes `registration-policy.yaml`:
- actor: librarian, context: library-desk
- preconditions: `applicant.id.verified`, `applicant.residency.status`, `applicant.existing.membership`
- emits: `register.member`

**Agent:** "What happens when the registration goes through?"
**Expert:** "We create their account — they start with zero loans, a limit of 5, and they're not suspended obviously."
**Agent:** → writes `registration-operation.yaml`:
- unconditionalOutcome: `member.registered` with effects on `member.exists`, `member.active.loans`, `member.max.loans`, `member.suspended`

**Agent:** "Are there any special cases?"
**Expert:** "Oh yes — if they're under 16, it's a junior membership. They can only borrow 3 books at a time, and we need parental consent."
**Agent:** → adds conditionalOutcome: `junior.member.registered` when `applicant.age` < 16, with effect on `member.max.loans`

**Agent:** "What could prevent the registration from completing?"
**Expert:** "If someone already has an account with that email."
**Agent:** → adds constraint: `email-unique` reading `applicant.email`, `member.emails`

**Agent:** *calls get_lint_results* → 0 errors. *calls get_user_story for registration-policy* → presents the decision table:
- 1 success path (registration), 1 conditional success (junior), 1 failure (duplicate email), 3 skipped (one per precondition)
- "Here are 6 paths through this decision. Are we missing any?"

## Tips

- **Follow the narrative, don't jump ahead.** Each "then what happens?" reveals the next decision naturally.
- **Name decisions by what they decide, not by implementation.** `lending-policy` not `check-and-lend`.
- **Info points use dot notation.** `member.active.loans` not `memberActiveLoans`.
- **One policy always pairs with one operation** via an intent. The policy decides "should this happen?", the operation executes "make it happen."
- **Conditional outcomes are bonus events**, not alternative paths. The unconditional outcome always happens on success. Conditional outcomes happen *in addition* when their condition is met.
- **Cross-process signals are powerful.** The return-operation produces `reserved.book.available` which triggers the reservation fulfillment process — this is how processes interact without being coupled.
- **A decision can belong to multiple processes.** The late-fee-policy participates in both `book-return` and `late-fee-collection` — it's triggered by `book.returned` which is the entry signal for both.

## Documentation Reference

- [Overview](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/overview/)
- [Getting Started](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/getting-started/)
- [Skills](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/skills/)
- [MCP Tools](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/mcp-tools/)
- [Workbench](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/workbench/)
- [Validation Rules](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/validation/)
- [Graph Analysis](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/analysis/)
