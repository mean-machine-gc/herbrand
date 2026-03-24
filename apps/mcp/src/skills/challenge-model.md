---
name: herbrand-challenge
user_invocable: true
description: >-
  Devil's advocate mode. Probe the model for edge cases, missing failure paths,
  unhandled scenarios, and implicit assumptions. Push the model toward completeness.
---

# Challenge Model

## Purpose

Play devil's advocate. The model so far represents the happy understanding between you and the domain expert. Now stress-test it by asking the hard questions.

## How to run this skill

### 1. Review current state

Call `get_system_overview` and `get_lint_results` to understand what exists.

### 2. Challenge each process

For each process, call `get_business_view` filtered to that process. For each user story or automation:

**Challenge preconditions:**
- "What if [precondition] is NOT met? The policy silently drops — is that the right behavior, or should something else happen?"
- "Is there a way to bypass this precondition? What if someone has authority to override?"
- "What if this precondition is intermittently true — the data is stale or eventually consistent?"

**Challenge constraints:**
- "What happens when the operation fails because [constraint] isn't met? Who gets notified? What's the recovery path?"
- "Can multiple constraints fail simultaneously? Is the failure handling different?"
- "Is there a timeout? What if the operation takes too long?"

**Challenge outcomes:**
- "What if the outcome is produced but the side effects fail partially? Is the system consistent?"
- "Who needs to know about [outcome]? Should another policy react to it?"
- "What if this outcome happens twice? Is the operation idempotent?"

**Challenge integration points:**
- "This intent crosses from [context A] to [context B]. What if the message is lost? What if it's delivered twice?"
- "What's the latency expectation? Is this synchronous or asynchronous?"
- "What if [external system] is down? Is there a fallback?"

**Challenge the model itself:**
- "Are there any decisions that happen in reality but aren't captured here?"
- "Are there any actors who participate but aren't listed?"
- "What happens outside business hours? Are there time-based policies?"

### 3. Capture discoveries

When a challenge reveals a gap:
- Add a new policy if a missing reactive path is identified
- Add constraints if failure modes are discovered
- Add conditional outcomes if additional behaviors emerge
- Add preconditions if bypass scenarios need guarding

Write the YAML updates and run `get_lint_results` to validate.

### 4. Re-present

After addressing challenges, call `get_business_view` again and present the updated decision table: "We added N failure paths and M new preconditions. The decision table now covers K scenarios. Are we more confident?"

## Example challenges (library domain)

**Challenging the return process:**
- "What if the member doesn't have the physical book? They lost it. Is there a 'lost book' path?"
- "The return-operation checks `loan-not-already-returned` — but what if a staff member accidentally processes the same return twice in quick succession? Is the constraint sufficient?"
- "When `reserved.book.available` fires, the fulfillment-operation holds the book for 48 hours. What happens if the member doesn't pick it up? Is there a timeout process?"

**Challenging the lending process:**
- "The lending-policy silently drops if the book doesn't exist. But the member is standing at the desk — shouldn't the librarian get feedback about *why* it dropped? Maybe this should be an operation with explicit failure instead."
- "What if the member is at exactly their loan limit? The conditional outcome `member.loan.limit.reached` fires — but who does something with it? It's terminal. Should there be a notification?"

**Challenging the overdue notification:**
- "The overdue-check-policy is triggered by `daily.check.triggered` — where does that come from? It's external. What system produces it? Is it a cron job?"
- "What if the notification-service is down? The overdue-notification-operation fails — but there's no retry. The member never gets notified. Should there be a retry policy?"
- "The suspension warning fires for 14+ days overdue — but nothing actually suspends the member. Is there a missing `suspend-member` process?"

## Common patterns to probe

- **Silent drops without logging** — policies that fail silently might need an audit trail. The lending-policy drops silently if the book doesn't exist, but the librarian needs to tell the member why.
- **Operations without failure paths** — the late-fee-operation has no constraints. It always succeeds. Is that realistic? What if the billing service rejects the charge?
- **Terminal outcomes with no reaction** — `member.loan.limit.reached` and `overdue.suspension.warning.sent` are terminal. Should something react to them?
- **Cross-context data coupling** — `book.lent` updates `book.available` which the reservation-policy reads. If the lend happens in LMS but the reservation check also runs in LMS, that's fine — but what if they were in different contexts?
- **Missing timeout/retry patterns** — reservations are held for 48 hours with no expiry process. Notifications have no retry if the service is down.
- **Circular side effects** — `book.lent` updates `book.available` and `member.active.loans`, both of which are in `view:lend-operation`. The lint catches this as a warning.

## Documentation Reference

- [Overview](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/overview/)
- [Getting Started](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/getting-started/)
- [Skills](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/skills/)
- [MCP Tools](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/mcp-tools/)
- [Workbench](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/workbench/)
- [Validation Rules](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/validation/)
- [Graph Analysis](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/analysis/)
