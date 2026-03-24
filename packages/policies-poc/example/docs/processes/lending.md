# Book Lending Process

## Overview

The lending process begins when a library member approaches the front desk and requests to borrow a book. The librarian evaluates whether the request can proceed, and if so, the Library Management System executes the lending transaction.

## User Story: Book Lending

**As a Librarian, I want to lend a book so that members can borrow books from the library.**

### Acceptance Criteria

**Given** the requested book exists in the catalog and the requesting member has an active account:

**When** the librarian initiates the lending process:

**Then** the book is marked as lent to the member, the member's active loan count increases by one, and a due date is set for 14 days from now.

**Additionally**, if the member has reached their maximum loan limit after this loan, a notification is generated to inform them they cannot borrow additional books until a return is processed.

### Failure Scenarios

The lending operation will fail if any of the following constraints are not met:

- **Book unavailable**: The requested book is currently lent to another member. The librarian should suggest placing a hold or recommend an alternative title.
- **Member suspended**: The member's account has been suspended, typically due to overdue books or unpaid fees. The librarian should direct the member to resolve outstanding issues first.
- **Loan limit exceeded**: The member has already reached their maximum number of concurrent loans. The librarian should advise returning a book before borrowing a new one.

### Information Requirements

To make this decision, the librarian needs to see:
- Whether the book exists in the catalog (`book.exists`)
- Whether the member exists and is active (`member.exists`)

The lending system additionally requires:
- Current availability of the book (`book.available`)
- Member suspension status (`member.suspended`)
- Current active loan count and maximum allowed (`member.active.loans`, `member.max.loans`)

---

## Automation: Late Fee Collection

**When a book is returned late, the Catalog Bot at the Library Management System applies a late fee so that overdue accounts are charged appropriately.**

### How It Works

The late fee policy is triggered automatically whenever a book return is processed. The system evaluates whether the return date exceeds the loan's due date. If the loan is overdue, a late fee intent is generated and routed to the external billing service for processing.

### Information Requirements

The automation needs access to:
- The loan's due date (`loan.due.date`)
- The actual return date (`loan.returned.date`)

### Integration Note

This process crosses an execution context boundary: the late fee policy runs in the LMS (internal software), but the fee application is handled by the external billing service. This is an integration point that requires a reliable messaging mechanism between the two systems.
