#!/bin/bash
# Analyze model for potential gaps

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DECISIONS_FILE="$PROJECT_ROOT/src/project.decisions.ts"

echo "=== Gap Analysis ==="
echo ""

# Collect all outcomes and intents from the unions
outcomes=$(grep "^type Outcomes" "$DECISIONS_FILE" | grep -oE "'[a-z_]+'" | tr -d "'")
intents=$(grep "^type Intents" "$DECISIONS_FILE" | grep -oE "'[a-z_]+'" | tr -d "'")

# Check which outcomes are used as inputs in specs
echo "--- Outcomes not used as input by any decision ---"
for outcome in $outcomes; do
    if ! grep -rq "'$outcome'" "$PROJECT_ROOT/src/specs/"*.spec.ts 2>/dev/null | grep -q "Input\|input"; then
        # Simpler check: see if this outcome appears as the first type arg in any decision type
        if ! grep -rlq "'$outcome'" "$PROJECT_ROOT/src/specs/"*.spec.ts 2>/dev/null; then
            echo "  $outcome (dead end?)"
        fi
    fi
done
echo ""

# Count rejects per decision
echo "--- Reject count per decision ---"
for f in "$PROJECT_ROOT/src/specs/"*.spec.ts; do
    name=$(basename "$f" .spec.ts)
    rejects=$(grep -c "description:" "$f" 2>/dev/null || echo 0)
    echo "  $name: $rejects description entries"
done
echo ""

# Check for single-choice decisions
echo "--- Decisions with single success path ---"
for f in "$PROJECT_ROOT/src/specs/"*.spec.ts; do
    name=$(basename "$f" .spec.ts)
    choices=$(grep -c "condition:" "$f" 2>/dev/null || echo 0)
    if [ "$choices" -le 1 ]; then
        echo "  $name (only $choices success path)"
    fi
done
echo ""

echo "=== Spec Count ==="
echo "Total decisions: $(ls "$PROJECT_ROOT/src/specs/"*.spec.ts | wc -l | tr -d ' ')"
echo "Scratchpad entries: $(ls "$PROJECT_ROOT/src/scratchpad/"*.md 2>/dev/null | wc -l | tr -d ' ')"
