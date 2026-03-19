# Agentic Workflow — Final Design

## Tools

| Tool | Purpose |
|---|---|
| `get_pipeline_results` | Project state + validation feedback (drives the loops) |
| `get_user_stories` | Business domain landscape (summary list) |
| `get_user_story` | Deep dive into one decision in business terms |

Plus the agent's native capabilities: read files, write files, conversation.

## Workflow

### 1. ORIENT

Agent calls `get_pipeline_results`.

- `specCount: 0` → empty project, start discovering
- `hasSpecErrors: true` → specs are broken, fix them first
- `specLint` has warnings → note them, not blocking
- `behaviorLint` has warnings → note them for challenge phase
- All clean → ready for review or new discovery

### 2. DISCOVER (conversation → write)

BA describes a process. Agent listens. When a decision is clear:

- Agent writes `.spec.ts` file (native file write)
- Agent updates `project.decisions.ts` unions if needed
- Watcher detects → store recomputes
- Agent calls `get_pipeline_results` → checks spec-lint
- If errors → agent reads the file, fixes, repeats
- If clean → continues conversation

### 3. REFINE (conversation → write)

BA adds detail to existing decisions.

- Agent reads the `.spec.ts` file (native file read)
- Agent edits the file (native file write)
- Agent calls `get_pipeline_results` → validates
- If errors → fix, repeat

### 4. REVIEW (read → conversation)

- Agent calls `get_user_stories` → sees the business landscape
- Agent calls `get_user_story` for key decisions → gets acceptance criteria, decision tables, scenarios in business language
- Agent presents to the BA in plain language — no framework terms
- Listens for corrections → back to DISCOVER or REFINE

### 5. CHALLENGE (read → conversation)

- Agent calls `get_pipeline_results` → reads behaviorLint findings
- Translates each finding into a natural question:
  - `orphan_outcome` → "Where does this come from?"
  - `dead_end_outcome` → "What happens after this?"
  - `unhandled_rejection` → "What if this fails?"
  - `info_never_written` → "Where does this information originate?"
- BA answers → back to DISCOVER or REFINE

## The loops

```
          ┌──────── write spec ─────────┐
          │                             ↓
   conversation ←── DISCOVER/REFINE ──→ get_pipeline_results
          ↑                             │
          │         spec-lint errors? ──┘ fix and retry
          │
          │         all clean? ──→ get_user_stories / get_user_story
          │                             │
          └──── REVIEW/CHALLENGE ───────┘
                         │
                    behavior-lint warnings?
                         │
                    translate to questions ──→ conversation
```

## Key principle

The agent never sees the graph directly. It sees **lint results** (what's wrong) and **user stories** (what's right, in business terms). It writes TypeScript. The reactive store does the rest.

## What the agent writes

- `.spec.ts` files in `src/specs/` — one per decision
- `project.decisions.ts` — domain unions (Outcomes, Intents, Info, OutcomeRejects, Contexts, Modules, Aggregates)
- `src/scratchpad/*.md` — freeform notes, observations, open questions
