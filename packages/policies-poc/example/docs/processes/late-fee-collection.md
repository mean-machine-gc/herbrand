# Late Fee Collection Process

## Overview

The late fee collection process is a fully automated workflow that monitors book returns and applies fees for overdue loans. It operates across two execution contexts: the Library Management System detects the overdue condition, and the external Billing Service processes the fee.

## Automation: Late Fee Application

**When a book is returned late, the Catalog Bot at the Library Management System applies a late fee so that overdue accounts are charged appropriately.**

### How It Works

When the system registers a book return event, the Catalog Bot evaluates whether the return is overdue by comparing the loan's due date against the actual return date. If the loan is past due, the bot emits an intent to apply a late fee, which is then processed by the Fee Engine in the external Billing Service.

### Precondition

The automation only fires if the loan is genuinely overdue:
- The loan's return date (`loan.returned.date`) must be after its due date (`loan.due.date`)

If the book is returned on time, the policy silently drops — no fee intent is generated, no further action is taken. This is the standard silent-fail behavior of policies.

### Outcome

On success, the fee is applied:
- The member's balance (`member.balance`) is debited by the fee amount

### Integration Consideration

This process crosses an execution context boundary. The late fee policy runs in the LMS, but fee application happens in the external Billing Service. This integration point requires:
- Reliable message delivery (the fee intent must not be lost)
- Idempotency (the same return should not generate duplicate fees)
- Error handling (what happens if the billing service is unavailable?)

### Information Requirements

| Info Point | Used By | Purpose |
|-----------|---------|---------|
| `loan.due.date` | Late Fee Policy | Determine if the loan is overdue |
| `loan.returned.date` | Late Fee Policy | Compare against due date |
| `member.balance` | Fee Engine | Apply the fee debit |
