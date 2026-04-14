---
name: herbrand-review-system
user_invocable: true
description: >-
  Birds-eye review of the system after processes are defined. Presents graph
  analysis insights: boundary alignment, bottlenecks, clustering, integration
  points, and flow analysis.
---

# Review System

## Purpose

You've defined several processes. Now step back and look at the whole system. Use graph analysis to surface architectural insights the domain expert should consider.

## How to run this skill

### 1. Get the overview

Call `get_system_overview` to see the full system: all actors, contexts, processes, integration points, and business items.

Present a summary to the domain expert: "Here's what we've built so far — N processes, M decisions, K integration points."

### 2. Check lint health

Call `get_lint_results`. At this stage there should be zero errors (or you wouldn't have a graph). Focus on warnings and info:

- **Warnings** are things to discuss: "These info points have no producer — are they seed data that exists before the system starts?"
- **Info** are observations: "This outcome has no downstream policy — is it terminal, or should something react to it?"

### 3. Get graph insights

Call `get_graph_insights`. Present findings by category:

**Boundaries:**
- "Context X has N% cohesion — most of its edges cross boundaries. Are the context boundaries right?"
- "Context Y is fully isolated — nothing crosses in or out. Is that intentional?"

**Impact:**
- "Decision X is a bottleneck — all paths flow through it. If this breaks, Y% of the system is affected."
- "Signal X triggers N decisions — it's a high-impact event."

**Clustering:**
- "These info points cluster together: [list]. They might form a natural aggregate — a cohesive unit of data."
- "These decisions cluster together but span different contexts — the graph suggests they belong together."

**Flow:**
- "The critical path from X to Y is N hops."
- "The suggested implementation order is: [list] — build leaf operations first."

### 4. Discuss with the domain expert

For each insight, ask:
- "Does this match your understanding?"
- "Should we adjust the boundaries?"
- "Is this bottleneck intentional or a sign of missing decomposition?"

### Example findings (library domain)

**From the graph analysis of the library system:**

- "The lending-engine is a bottleneck — it handles lend-operation, return-operation, and reservation-operation. 75% of the system flows through it. Should we split it into separate services?"
- "Info points cluster into natural groups: [book.exists, member.exists] (identity), [book.available, member.active.loans, member.max.loans, member.suspended] (lending state), [loan.due.date, loan.returned.date] (loan lifecycle). These suggest three aggregates."
- "The late-fee-policy and late-fee-operation cluster together but span lms and billing-service — the graph suggests they belong in the same context, but billing is external. This is a real integration boundary."
- "The critical path from book.requested to book.lent is 4 hops. But the path from book.returned through reservation fulfillment to reservation.fulfilled is 8 hops — that's a long cascade. Is it acceptable?"
- "daily.check.triggered is an external signal with no producer. This needs to be documented — what generates it? A cron job? A scheduler service?"

### 5. Act on feedback

If boundaries need adjustment:
- Move decisions between contexts (update the `context` field in their YAML)
- Split or merge contexts in `system.hb.yaml`

If missing decisions are identified:
- Use `/explore-process` to add them

If the model is validated:
- Move to `/enrich` for documentation

## Documentation Reference

- [Overview](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/overview/)
- [Getting Started](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/getting-started/)
- [Skills](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/skills/)
- [MCP Tools](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/mcp-tools/)
- [Workbench](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/workbench/)
- [Validation Rules](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/validation/)
- [Graph Analysis](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/analysis/)
