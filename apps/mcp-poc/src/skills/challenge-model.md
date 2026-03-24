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

## Common patterns to probe

- **Silent drops without logging** — policies that fail silently might need an audit trail
- **Operations without failure paths** — no constraints means always succeeds, is that realistic?
- **Terminal outcomes with no reaction** — is this truly the end, or is there a downstream process?
- **Cross-context data coupling** — outcomes that update views in other contexts create hidden dependencies
- **Single points of failure** — bottleneck decisions that everything flows through
- **Circular side effects** — an outcome updates a view that informs the operation that produced it
