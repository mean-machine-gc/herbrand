#!/bin/bash
# Gather model state for review generation

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

echo "=== Decision Flows ==="
echo ""

for f in "$PROJECT_ROOT/src/specs/"*.spec.ts; do
    name=$(basename "$f" .spec.ts)
    # Extract description
    desc=$(grep "description:" "$f" | head -1 | sed "s/.*description: '//" | sed "s/',.*//")
    # Extract agent role
    role=$(grep "role:" "$f" | sed "s/.*role: '//" | sed "s/',*//" | head -1)
    kind=$(grep "kind:" "$f" | head -1 | sed "s/.*kind: '//" | sed "s/',.*//")
    # Extract type
    type=$(grep "type:" "$f" | head -1 | sed "s/.*type: '//" | sed "s/',.*//")

    if [ -n "$role" ]; then
        agent="$role ($kind)"
    else
        agent="$kind"
    fi

    echo "[$name] ($type by $agent)"
    echo "  $desc"
    echo ""
done

echo "=== Open Scratchpad Items ==="
echo ""

if ls "$PROJECT_ROOT/src/scratchpad/"*.md 1>/dev/null 2>&1; then
    for f in "$PROJECT_ROOT/src/scratchpad/"*.md; do
        echo "--- $(basename "$f") ---"
        cat "$f"
        echo ""
    done
else
    echo "(no scratchpad entries)"
fi
