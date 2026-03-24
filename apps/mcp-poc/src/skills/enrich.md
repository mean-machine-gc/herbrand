---
name: herbrand-enrich
user_invocable: true
description: >-
  Generate prose documentation from the structured business view. Produces
  a system overview document and per-process narrative documents as Markdown.
---

# Enrich Documentation

## Purpose

The specs are stable. Now generate human-readable documentation that stakeholders can review. The structured business view provides the scaffold — you add the prose.

## How to run this skill

### 1. Generate system document

Call `get_system_overview` to get the full picture.

Write `docs/system.md` with:
- **Executive summary** — one paragraph describing what the system does
- **Actors table** — who's involved, what type, what they do
- **Execution contexts** — what systems exist, internal vs external
- **Business processes** — one paragraph per process summarizing the narrative
- **Integration points** — where systems connect, what crosses boundaries
- **Key metrics** — counts from the overview (decisions, info points, etc.)

### 2. Generate process documents

For each process, call `get_business_view` filtered to that process. Then for each business item, call `get_user_story` with the policy ID.

Write `docs/processes/{process-name}.md` with:

**For each user story:**
- The formula as a section heading
- A prose narrative of the acceptance criteria — not Given/When/Then bullets, but flowing text that reads naturally: "When a library member approaches the front desk..."
- The failure scenarios described as a "What can go wrong" section with realistic context
- The information requirements described as "What the [actor] needs to see" — framed as a UI/screen requirement for humans, or context requirement for agents

**For each automation:**
- The formula as a section heading
- "How it works" — the reactive trigger, what's evaluated, what happens
- Integration considerations if the automation crosses contexts

**Keep the decision table as-is** — tables don't need prose, they need clarity. Include them as Markdown tables.

### 3. Review with domain expert

Present the documents. Ask:
- "Does this accurately describe the process?"
- "Would a new team member understand this?"
- "Is the language right for your organization?"

### 4. Iterate

Adjust prose based on feedback. The structural data doesn't change — only the narrative layer.

## Writing guidelines

- **Write for the domain expert, not for developers.** Use business language.
- **Be specific.** "The librarian checks the catalog" not "the system validates the entity."
- **Name actors by role.** "The Librarian evaluates..." not "The human actor processes..."
- **Describe failures as real scenarios.** "If the member's account is suspended — perhaps due to unpaid fines — the lending request cannot proceed" not "constraint member-not-suspended fails."
- **Use info point names in backticks** when referencing specific data: "The system checks `book.available` to ensure..."
- **Keep one document per process.** Don't merge processes into a single document.
