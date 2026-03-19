#!/usr/bin/env node
/**
 * Stage: Build Decision Graph
 * Reads parsed-specs.json and builds the decision graph as JSON.
 * Refuses to build if spec-lint has errors.
 *
 * Flow 2: parse-specs → spec-lint → build-decision-graph (this) → behavior-lint → render-graph-view
 */

const fs = require('fs');
const path = require('path');

const parsedPath = path.join(__dirname, '..', 'parsed-specs.json');
const specLintPath = path.join(__dirname, '..', 'spec-lint-results.json');
const outPath = path.join(__dirname, '..', 'decision-graph.json');

function buildGraph(parsed) {
    const { specs, declaredInfos } = parsed;
    const nodes = [];
    const edges = [];
    const views = [];

    const intentSet = new Set();
    const outcomeSet = new Set();
    const outcomeRejectSet = new Set();

    for (const [name, spec] of Object.entries(specs)) {
        if (spec.triggerType === 'success') outcomeSet.add(spec.trigger);
        else if (spec.triggerType === 'reject') outcomeRejectSet.add(spec.trigger);
        else if (spec.triggerType === 'intent') intentSet.add(spec.trigger);

        for (const choice of spec.choices) {
            if (spec.type === 'outcome') outcomeSet.add(choice);
            else intentSet.add(choice);
        }
        if (spec.type === 'outcome') {
            for (const reject of spec.rejects) outcomeRejectSet.add(`rejected:${reject}`);
        }
    }

    const intentToRole = {};
    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type === 'intent') {
            for (const choice of spec.choices) intentToRole[choice] = spec.role || 'unknown';
        }
    }

    const outcomeToRole = {};
    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type === 'outcome') {
            const role = intentToRole[spec.trigger] || 'unknown';
            for (const choice of spec.choices) outcomeToRole[choice] = role;
            for (const reject of spec.rejects) outcomeToRole[`rejected:${reject}`] = role;
        }
    }

    for (const id of intentSet) nodes.push({ id, type: 'intent', role: intentToRole[id] || null });
    for (const id of outcomeSet) nodes.push({ id, type: 'outcome', role: outcomeToRole[id] || null });
    for (const id of outcomeRejectSet) nodes.push({ id, type: 'outcome_reject', role: outcomeToRole[id] || null });

    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type !== 'intent' || spec.requiredInfo.length === 0) continue;
        for (const choice of spec.choices) {
            const viewId = `view_${name}_${choice}`;
            views.push({ id: viewId, infos: spec.requiredInfo, targetIntent: choice, role: spec.role });
            nodes.push({ id: viewId, type: 'view', role: spec.role, infos: spec.requiredInfo });
        }
    }

    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type === 'intent') {
            for (const choice of spec.choices) {
                edges.push({ from: spec.trigger, to: choice, type: 'intent_flow', intentRejects: spec.rejects, spec: name });
            }
        } else {
            for (const choice of spec.choices) {
                edges.push({ from: spec.trigger, to: choice, type: 'outcome_flow', spec: name });
            }
            for (const reject of spec.rejects) {
                edges.push({ from: spec.trigger, to: `rejected:${reject}`, type: 'reject_flow', spec: name });
            }
        }
    }

    for (const view of views) {
        edges.push({ from: view.id, to: view.targetIntent, type: 'view_to_intent' });
    }

    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type !== 'outcome' || spec.affectedInfo.length === 0) continue;
        for (const choice of spec.choices) {
            for (const view of views) {
                const overlap = view.infos.filter(i => spec.affectedInfo.includes(i));
                if (overlap.length > 0) {
                    edges.push({ from: choice, to: view.id, type: 'info_flow', infos: overlap });
                }
            }
        }
    }

    return { nodes, edges, specs, declaredInfos };
}

// Main
if (!fs.existsSync(parsedPath)) {
    console.error('No parsed-specs.json found. Run parse-specs first.');
    process.exit(1);
}

// Check spec-lint for errors
if (fs.existsSync(specLintPath)) {
    const specLintResults = JSON.parse(fs.readFileSync(specLintPath, 'utf-8'));
    const errors = specLintResults.filter(r => r.level === 'error');
    if (errors.length > 0) {
        console.error(`Cannot build decision graph: ${errors.length} spec-lint error(s) must be fixed first.`);
        for (const e of errors) {
            const tag = e.spec ? ` (${e.spec})` : '';
            console.error(`  ✘ ${e.message}${tag}`);
        }
        process.exit(1);
    }
}

const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf-8'));
const graph = buildGraph(parsed);
fs.writeFileSync(outPath, JSON.stringify(graph, null, 2));

console.log(`Graph written to ${outPath}`);
console.log(`  ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${Object.keys(graph.specs).length} specs`);
