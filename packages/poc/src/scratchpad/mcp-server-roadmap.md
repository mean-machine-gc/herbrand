# MCP Server Roadmap

## Tool categories

### 1. Validation & Linting (deterministic)
- Orphan detection: outcomes/intents in unions but not used as input by any decision
- Dead ends: choices that produce outcomes/intents nothing listens to
- Empty descriptions: specs with missing or placeholder descriptions
- Empty examples: shouldFailWith or shouldSucceedWith entries without examples
- Empty assertions: choices without assertion tags
- Incomplete specs: decisions in project.decisions.ts without a corresponding spec file
- Union drift: outcomes/intents referenced in specs but missing from the unions
- Typecheck wrapper: run tsc and surface errors in domain language

### 2. Decision Graph (deterministic, highest priority derivative model)
- Build directed graph from specs: nodes = decisions, edges = input→choice relationships
- Output as structured data (adjacency list, edge list) for analytics and UI consumption
- From the graph we can derive:
  - Flow sequences (topological ordering of decision chains)
  - Entry points (decisions with no incoming edges — process starters)
  - Terminal points (decisions whose outputs go nowhere — process enders or dead ends)
  - Cycles (feedback loops, approval/rejection/retry patterns)
  - Subgraph detection (candidate boundaries at different scales)
  - Impact analysis: "if this decision changes, what downstream decisions are affected?"
  - Coverage: which parts of the graph have specs with examples vs which are bare

### 3. Documentation Generators (deterministic structure + LLM prose)

Two-phase generation for each artifact:

**Phase 1 — Structure (deterministic, MCP tool):**
The tool reads specs and produces a structured skeleton — tables, sections, fields — all derived mechanically from the spec data. No interpretation, no prose. This is the scaffold.

**Phase 2 — Prose (LLM):**
The agent takes the skeleton and enriches it with natural language — narratives, explanations, business-readable descriptions. The LLM adds the human layer on top of the deterministic structure.

#### Artifact types:

**Decision tables**
- Structure: matrix of input × rejects/choices with conditions
- Prose: contextual headers, explanatory notes

**Gherkin scenarios**
- Structure: Given (input) / When (decision) / Then (choices + assertions) / But (rejects)
- Tags from assertion tags (already snake_case for this reason)
- Prose: scenario names, step descriptions in domain language

**User stories + acceptance criteria**
- Structure: "As a [role], I want to [intent], so that [outcome]" derived from agent role + choices
- Acceptance criteria from shouldSucceedWith conditions + shouldAssert tags
- Prose: story descriptions, edge case narratives

**Process narratives**
- Structure: ordered list of decisions from graph traversal
- Prose: LLM weaves them into a readable business process document

**Impact reports**
- Structure: graph analytics showing affected decisions when something changes
- Prose: LLM explains the impact in stakeholder language

## UI vs MCP responsibility split

### Open question: who generates what?

The MCP server and the UI both produce documentation, but they serve different purposes.

**MCP tools (agent-facing):**
- Generate structured skeletons (phase 1)
- Provide data for the LLM to enrich (phase 2)
- Output is text/structured data — consumed by the agent mid-conversation
- The agent uses these to answer BA questions, produce inline summaries, write documents

**UI (stakeholder-facing):**
- Launched via `npx herbrand-ui --project ./` or similar
- Reads the same spec files and project.decisions.ts directly
- Renders visual artifacts: decision graphs, flow diagrams, decision tables
- Shows structured documentation in nice HTML layouts
- Could consume pre-generated prose from a docs/ output folder

**The split:**
- MCP tools are the *engine* — they compute structure, validate, analyze
- The UI is the *renderer* — it takes the same data and makes it visual
- Both read from the same source (spec files), so they're always in sync
- The LLM sits between them: it calls MCP tools to get structure, enriches with prose, and the results can be served by either the agent (inline) or the UI (rendered)

**Key principle:** The UI should NOT need the LLM to function. It reads specs and renders deterministic views. The LLM-enriched prose is an optional layer — the UI works without it, just less polished.

### Possible flow:
1. Agent calls MCP tool → gets decision table skeleton
2. Agent enriches with prose → produces a markdown document
3. Document is saved to a docs/ folder
4. UI reads docs/ folder and renders the enriched version
5. If no enriched version exists, UI renders the raw structure from specs

This means the docs/ folder is a cache of LLM-enriched artifacts, not the source of truth. Specs are always the source of truth.

## Next steps
- Start with validation/linting tools — simplest, most immediately useful
- Then decision graph generation — unlocks all analytics and the UI's main view
- Then documentation generators — one artifact type at a time, starting with Gherkin (most structured)
- UI last — it needs the graph and doc generators to have something to render
