#!/bin/bash
# Validate the current model typechecks and report orphans

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

echo "=== Typechecking ==="
npx tsc --noEmit --strict \
    "$PROJECT_ROOT/src/framework.ts" \
    "$PROJECT_ROOT/src/project.decisions.ts" \
    "$PROJECT_ROOT/src/specs/"*.spec.ts

echo "✓ All types check out"

echo ""
echo "=== Model Summary ==="

# Count specs
SPEC_COUNT=$(ls "$PROJECT_ROOT/src/specs/"*.spec.ts 2>/dev/null | wc -l | tr -d ' ')
echo "Decisions: $SPEC_COUNT"

# Count scratchpad entries
PAD_COUNT=$(ls "$PROJECT_ROOT/src/scratchpad/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "Scratchpad entries: $PAD_COUNT"

# List outcomes and intents from project.decisions.ts
echo ""
echo "=== Outcomes ==="
grep -oE "'[a-z_]+'" "$PROJECT_ROOT/src/project.decisions.ts" | head -20 || echo "(none)"

echo ""
echo "=== Spec Files ==="
for f in "$PROJECT_ROOT/src/specs/"*.spec.ts; do
    basename "$f" .spec.ts
done
