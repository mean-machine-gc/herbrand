# Herbrand

**Decision-first business analysis for information systems.**

[Docs: ](https://mean-machine-gc.github.io/ubi-framework/toolkit/herbrand/overview/)

Herbrand models business processes as chains of bounded decisions — typed, validated, and connected into a decision graph that generates user stories, acceptance criteria, decision tables, and scenarios automatically.

Named after [Herbert Simon](https://en.wikipedia.org/wiki/Herbert_Simon) (bounded rationality in decision-making) and [Alberto Brandolini](https://www.eventstorming.com/) (collaborative domain discovery). Reconciles business analysis with CQRS and Event Sourcing.

## The idea

Every business system is two loops:

```
Outcomes → Intent Decisions → Intents → Outcome Decisions → Outcomes → ...
```

**Intent decisions** answer *"what should happen?"* — a human or machine observes an outcome and expresses an intent. **Outcome decisions** answer *"what has happened?"* — the system processes an intent and produces an outcome. Rejections flow back as events that trigger recovery.

Decisions are specified as `.hb.yaml` files. Herbrand validates them against project-defined streams, builds a decision graph, and derives business artifacts — no manual documentation needed.

## Quick start

```
my-project/
  system.hb.yaml           ← streams: outcomes, intents, info, rejects, boundaries
  specs/
    create-order.hb.yaml   ← one decision per file
  scratchpad/
    notes.md               ← freeform observations
```

## Architecture

```
packages/
  core       — parse, validate (zod), lint, graph, user stories
  signals    — reactive store (preact/signals-core)
apps/
  mcp        — MCP server (3 tools + skills + auto-launches UI)
  ui         — React + Mantine + React Flow
```

## MCP tools

| Tool | Purpose |
|---|---|
| `get_pipeline_results` | Spec count, spec-lint, behavior-lint |
| `get_user_stories` | Business domain landscape |
| `get_user_story` | Full user story with acceptance criteria, decision table, scenarios |

## How it works

1. Write `system.hb.yaml` — declare your streams
2. Write decision specs as `.hb.yaml` — Herbrand validates against streams via dynamic zod schemas
3. The reactive pipeline runs automatically: parse → spec-lint → graph → behavior-lint → user stories
4. The UI shows three views: **Specs** (per-decision detail), **Decision Graph** (BPMN swimlanes), **Business** (user stories with tabs)
5. The MCP agent writes specs, reads lint feedback, and presents user stories in business language

## License

MIT
