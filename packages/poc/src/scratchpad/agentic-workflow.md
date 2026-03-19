# Agentic Workflow Design

## Status: Draft — pending UI advancement to finalize available data structures

## Two modes: conversational and operational

- **Conversational**: agent talks to BA, captures knowledge, writes spec files (skills)
- **Operational**: agent reads MCP tools to understand model state, validate, inform next steps

## Workflow

### 1. ORIENT
- `get_pipeline_results` → understand current state
- Empty project → start discover-decision
- Existing project → review, decide what to do

### 2. DISCOVER (conversational)
- BA describes process, agent captures in scratchpad
- Agent writes .spec.ts + updates project.decisions.ts (skill)
- Watcher detects → store recomputes
- `get_spec_lint` → validate, fix if needed

### 3. REFINE (conversational)
- `get_spec` → read current state
- Agent edits .spec.ts (skill)
- `get_spec_lint` → validate

### 4. REVIEW (operational → conversational)
- `get_graph` → full system view
- `get_behavior_lint` → system-level issues
- Agent translates to plain language for BA

### 5. CHALLENGE (operational → conversational)
- `get_behavior_lint` → use findings as conversation prompts
- orphan_outcome → "Where does this come from?"
- dead_end_outcome → "What happens after this?"
- unhandled_rejection → "What if this fails?"
- info_never_written → "Where does this info come from?"

### 6. VALIDATE (continuous)
- After every spec write: `get_spec_lint` (Loop 1) then `get_behavior_lint` (Loop 2)
- Spec-lint must be clean before moving on
- Behavior-lint warnings inform next conversation topic

## Principle
MCP tools = agent's eyes (read state). Skills = agent's hands (write code). Reactive store ensures agent always sees latest state.

## Pending
- UI advancement may reveal additional derivative data structures (business view data, user stories, etc.)
- These may become available through the signal store, giving the agent access to more business-friendly information
- Primer skill will be written after UI work stabilizes the data structures
