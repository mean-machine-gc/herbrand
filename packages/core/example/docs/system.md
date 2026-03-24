# Library Management System — Executive Summary

## Overview

This system manages the core operations of a public library, from book lending at the front desk to automated fee collection for overdue returns. It bridges institutional decision-making (librarians serving members face-to-face) with software automation (the Library Management System and external billing).

## Actors

| Actor | Type | Role |
|-------|------|------|
| **Librarian** | Human | Evaluates lending requests at the front desk |
| **Catalog Bot** | AI Agent | Monitors returns and triggers late fee collection |
| **Lending Engine** | Machine | Processes lending transactions deterministically |
| **Fee Engine** | Machine | Applies late fees via the external billing service |

## Execution Contexts

### Library Desk (Institutional — Role Authority)
The physical front desk where librarians interact with members. Lending decisions originate here based on the librarian's judgment of member eligibility.

### Library Management System (Software — Internal)
The core platform that processes lending transactions and monitors loan status. Houses the automated late fee detection policy.

### Billing Service (Software — External)
A third-party billing platform that handles fee calculation and payment processing. An integration point that requires reliable messaging from the LMS.

## Business Processes

### 1. Book Lending
A member requests a book → the librarian evaluates eligibility → the LMS processes the loan → the book is lent. Involves 2 decisions across 2 execution contexts with 1 integration point.

### 2. Late Fee Collection
A book is returned → the system detects an overdue loan → a late fee is applied via the billing service. Fully automated, involves 2 decisions across 2 execution contexts with 1 integration point.

## Integration Points

| From | To | Via | Description |
|------|----|-----|-------------|
| Library Desk | LMS | `lend.book` intent | Librarian's lending decision crosses into the software system |
| LMS | Billing Service | `apply.late.fee` intent | Late fee policy crosses into external billing |

## Key Metrics

- **9 info points** discovered from decision procedures
- **2 integration points** between execution contexts
- **0 lint errors** — system is structurally sound
- **6 warnings** — info points without producers (seed data)
