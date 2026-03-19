#!/usr/bin/env node
/**
 * Spec Lint
 * Reads parsed-specs.json and checks individual spec completeness.
 * These are per-spec checks, not behavioral/graph-level checks.
 *
 * Flow 1: specs → parse-specs → spec-lint (this) → render-specs-view
 */

const fs = require('fs');
const path = require('path');

const parsedPath = path.join(__dirname, '..', 'parsed-specs.json');
const outPath = path.join(__dirname, '..', 'spec-lint-results.json');

function lint(parsed) {
    const results = [];
    const { specs, declaredInfos } = parsed;

    function warn(rule, message, spec) {
        results.push({ level: 'warning', rule, message, spec: spec || null });
    }

    function error(rule, message, spec) {
        results.push({ level: 'error', rule, message, spec: spec || null });
    }

    for (const [name, spec] of Object.entries(specs)) {

        // Missing trigger
        if (!spec.trigger) {
            error('missing_trigger', `Decision has no trigger defined`, name);
        }

        // No choices
        if (spec.choices.length === 0) {
            error('missing_choices', `Decision has no success choices defined`, name);
        }

        // No rejects
        if (spec.rejects.length === 0) {
            warn('no_rejects', `Decision has no rejection paths — is nothing able to go wrong?`, name);
        }

        // Missing description
        if (!spec.description) {
            warn('missing_description', `Decision has no description`, name);
        }

        // Missing context
        if (!spec.context) {
            warn('missing_context', `Decision has no context assigned`, name);
        }

        // Missing module
        if (!spec.module) {
            warn('missing_module', `Decision has no module assigned`, name);
        }

        // Missing aggregate
        if (!spec.aggregate) {
            warn('missing_aggregate', `Decision has no aggregate assigned`, name);
        }

        // Missing role on intent decisions
        if (spec.type === 'intent' && !spec.role) {
            warn('missing_role', `Intent decision has no agent role — who decides?`, name);
        }

        // Missing businessGoal on intent decisions
        if (spec.type === 'intent' && !spec.businessGoal) {
            warn('missing_business_goal', `Intent decision has no business goal — why does the actor want this?`, name);
        }

        // Intent decisions without requiredInfo
        if (spec.type === 'intent' && spec.requiredInfo.length === 0) {
            warn('missing_required_info', `Intent decision has no requiredInfo — how is it deciding?`, name);
        }

        // Outcome decisions without affectedInfo
        if (spec.type === 'outcome' && spec.affectedInfo.length === 0) {
            warn('missing_affected_info', `Outcome decision has no affectedInfo — what state does it change?`, name);
        }

        // Rejects without examples
        for (const reject of (spec.rejectsWithoutScenarios || [])) {
            warn('missing_scenarios', `Reject '${reject}' has no scenarios`, name);
        }
    }

    // Declared info never used in any spec
    const allUsedInfo = new Set();
    for (const spec of Object.values(specs)) {
        for (const i of spec.requiredInfo) allUsedInfo.add(i);
        for (const i of spec.affectedInfo) allUsedInfo.add(i);
    }
    for (const info of declaredInfos) {
        if (!allUsedInfo.has(info)) {
            warn('info_declared_unused', `Info '${info}' is declared in the Info union but never referenced by any spec`);
        }
    }

    return results;
}

// Main
if (!fs.existsSync(parsedPath)) {
    console.error('No parsed-specs.json found. Run parse-specs first.');
    process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf-8'));
const results = lint(parsed);

fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

const errors = results.filter(r => r.level === 'error');
const warnings = results.filter(r => r.level === 'warning');

console.log(`=== Spec Lint ===`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)\n`);

const grouped = {};
for (const r of results) {
    if (!grouped[r.rule]) grouped[r.rule] = [];
    grouped[r.rule].push(r);
}
for (const [rule, items] of Object.entries(grouped)) {
    console.log(`[${rule}] (${items.length})`);
    for (const item of items) {
        const icon = item.level === 'error' ? '✘' : '⚠';
        const tag = item.spec ? ` (${item.spec})` : '';
        console.log(`  ${icon} ${item.message}${tag}`);
    }
    console.log();
}

console.log(`Spec lint results written to ${outPath}`);

// Exit with error code if there are errors (blocks graph build)
if (errors.length > 0) {
    process.exit(1);
}
