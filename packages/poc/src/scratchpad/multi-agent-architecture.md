# Multi-Agent Architecture

## The feedback loop changes everything

The MCP tools aren't just utilities — they're guardrails that close a feedback loop. The agent proposes a decision, the validation tool immediately catches errors (orphaned intents, missing descriptions, type mismatches), and the agent self-corrects. This transforms LLM reliability from "hope it gets it right" to "it converges on correct through iteration."

## Agent roles

### BA Agent (primary)
- Runs the discovery session, holds the conversation with the real stakeholder
- Uses the skills: discover, refine, review, challenge
- Reads/writes specs and scratchpad through MCP tools
- Gets immediate validation feedback on every model change

### Domain Expert Agent (simulation)
- LLM role-playing as the client/stakeholder
- Use cases:
  - Simulate discovery sessions for testing and training the framework
  - Play devil's advocate during challenge-model — answers in character, with ambiguity and contradictions like a real expert
  - Fill gaps between real sessions — BA agent spots open questions, domain expert agent gives plausible answers seeded from previous real conversations
  - Answers flagged as "to verify with real stakeholder" — never treated as ground truth
- Can be seeded with domain context: industry, company size, process complexity, persona traits

### Reviewer Agent (structural challenge)
- Reads the current model and challenges it from a structural/architectural angle
- Thinks differently from the BA: "these decisions look like they belong in different contexts", "this reject implies a compensation flow that doesn't exist"
- Calls validation and graph analytics tools, not conversation skills
- Natural tension with the BA agent: BA wants to capture and formalize, reviewer wants to poke holes
- This tension, mediated by MCP tools, produces a better model than either agent alone

## Flow

```
Real stakeholder ←→ BA Agent ←→ MCP Tools (feedback loop)
                                    ↕
                              Domain Expert Agent (simulation / gap-filling)
                                    ↕
                              Reviewer Agent (structural challenge)
```

All agents read/write the same specs, all get the same validation feedback from MCP tools. The tools enforce consistency across agents — no agent can produce an invalid spec.

## Simulation for framework testing

The domain expert agent unlocks automated testing of the entire system:
- Generate diverse domain scenarios (healthcare, logistics, finance, etc.)
- Run hundreds of simulated discovery sessions
- Stress-test the skills, MCP tools, and framework against messy, ambiguous, contradictory input
- Measure: how many iterations to converge on a valid model? where does the BA agent struggle?
- No real client needed — iterate fast on framework design

## Open questions
- How much context does the domain expert agent need to be useful? Full transcript of past sessions? Just the current model + scratchpad?
- Should the reviewer agent run continuously (after every model change) or on-demand (when the BA agent requests it)?
- Can the BA agent and reviewer agent run concurrently, or do they need turn-taking to avoid conflicting spec edits?
- Should there be a "facilitator" agent that orchestrates the session — deciding when to switch from discovery to review to challenge?
