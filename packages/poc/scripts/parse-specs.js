#!/usr/bin/env node
/**
 * Parse Specs
 * Reads all spec files and project.decisions.ts, produces parsed-specs.json.
 * This is the canonical parsed representation of the raw specs.
 *
 * Flow 1: specs → parse-specs (this) → spec-lint → render-specs-view
 */

const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '..', 'src', 'specs');
const decisionsFile = path.join(__dirname, '..', 'src', 'project.decisions.ts');
const outPath = path.join(__dirname, '..', 'parsed-specs.json');

function parseSpec(content) {
    const spec = {};

    spec.isOutcome = /OutcomeDecisionSpec/.test(content);
    spec.isIntent = /IntentDecisionSpec/.test(content);

    if (spec.isIntent) {
        const triggerMatch = content.match(/trigger:\s*\{\s*type:\s*'(success|reject)',\s*(?:outcome|rejection):\s*'([^']+)'/);
        if (triggerMatch) {
            spec.triggerType = triggerMatch[1];
            spec.trigger = triggerMatch[2];
        }
    } else {
        const triggerMatch = content.match(/trigger:\s*'([^']+)'/);
        if (triggerMatch) {
            spec.trigger = triggerMatch[1];
            spec.triggerType = 'intent';
        }
    }

    // Parse preconditions (intent specs) or shouldFailWith (outcome specs)
    spec.rejectDetails = {};
    spec.rejects = [];
    const failBlock = content.match(/(?:preconditions|shouldFailWith):\s*\{([\s\S]*?)\n    \}/);
    if (failBlock) {
        for (const m of failBlock[1].matchAll(/^\s{8}(\w+):\s*\{([\s\S]*?)^\s{8}\}/gm)) {
            const key = m[1];
            const body = m[2];
            spec.rejects.push(key);

            const descMatch = body.match(/description:\s*'([^']+)'/);
            const reqInfoMatch = body.match(/requiredInfo:\s*\[([^\]]*)\]/);
            const reqInfos = reqInfoMatch ? [...reqInfoMatch[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
            const scenarios = [...body.matchAll(/\{\s*description:\s*'([^']+)'\s*\}/g)].map(x => x[1]);
            const scenarioDescriptions = scenarios.filter(e => e !== (descMatch ? descMatch[1] : ''));

            spec.rejectDetails[key] = {
                description: descMatch ? descMatch[1] : null,
                requiredInfo: reqInfos,
                scenarios: scenarioDescriptions,
            };
        }
    }

    // Parse producesIntent (intent specs) or shouldSucceedWith (outcome specs)
    spec.choiceDetails = {};
    spec.choices = [];

    if (spec.isIntent) {
        // Intent specs: producesIntent is a single object with an intent field
        const producesBlock = content.match(/producesIntent:\s*\{([\s\S]*?)\n    \}/);
        if (producesBlock) {
            const body = producesBlock[1];
            const intentMatch = body.match(/intent:\s*'([^']+)'/);
            const descMatch = body.match(/description:\s*'([^']+)'/);
            const reqInfoMatch = body.match(/requiredInfo:\s*\[([^\]]*)\]/);
            const reqInfos = reqInfoMatch ? [...reqInfoMatch[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
            const scenarios = [...body.matchAll(/\{\s*description:\s*'([^']+)'\s*\}/g)].map(x => x[1]);
            const scenarioDescriptions = scenarios.filter(e => e !== (descMatch ? descMatch[1] : ''));

            const key = intentMatch ? intentMatch[1] : 'unknown';
            spec.choices.push(key);
            spec.choiceDetails[key] = {
                condition: null,
                description: descMatch ? descMatch[1] : null,
                requiredInfo: reqInfos,
                scenarios: scenarioDescriptions,
            };
        }
    } else {
        // Outcome specs: shouldSucceedWith is a Record
        const succeedBlock = content.match(/shouldSucceedWith:\s*\{([\s\S]*?)\n    \}/);
        if (succeedBlock) {
            for (const m of succeedBlock[1].matchAll(/^\s{8}(\w+):\s*\{([\s\S]*?)^\s{8}\}/gm)) {
                const key = m[1];
                const body = m[2];
                spec.choices.push(key);

                const condMatch = body.match(/condition:\s*'([^']+)'/);
                const descMatch = body.match(/description:\s*'([^']+)'/);
                const reqInfoMatch = body.match(/requiredInfo:\s*\[([^\]]*)\]/);
                const reqInfos = reqInfoMatch ? [...reqInfoMatch[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
                const scenarios = [...body.matchAll(/\{\s*description:\s*'([^']+)'\s*\}/g)].map(x => x[1]);
                const scenarioDescriptions = scenarios.filter(e => e !== (descMatch ? descMatch[1] : '') && e !== (condMatch ? condMatch[1] : ''));

                spec.choiceDetails[key] = {
                    condition: condMatch ? condMatch[1] : null,
                    description: descMatch ? descMatch[1] : null,
                    requiredInfo: reqInfos,
                    scenarios: scenarioDescriptions,
                };
            }
        }
    }

    // Parse shouldAssert entries with full detail (outcome only)
    spec.assertionDetails = {};
    spec.affectedInfo = [];
    if (spec.isOutcome) {
        const affSet = new Set();
        const assertBlock = content.match(/shouldAssert:\s*\{([\s\S]*)\}\s*\}/);
        if (assertBlock) {
            // Match each choice key and its array of assertions
            for (const choiceMatch of assertBlock[1].matchAll(/^\s{8}(\w+):\s*\[([\s\S]*?)\s{8}\]/gm)) {
                const choiceKey = choiceMatch[1];
                const arrayBody = choiceMatch[2];
                const assertions = [];

                for (const assertMatch of arrayBody.matchAll(/\{\s*tag:\s*'([^']+)',\s*description:\s*'([^']+)',\s*affectedInfo:\s*\[([^\]]*)\]\s*\}/g)) {
                    const affInfos = [...assertMatch[3].matchAll(/'([^']+)'/g)].map(x => x[1]);
                    for (const i of affInfos) affSet.add(i);
                    assertions.push({
                        tag: assertMatch[1],
                        description: assertMatch[2],
                        affectedInfo: affInfos,
                    });
                }
                spec.assertionDetails[choiceKey] = assertions;
            }
        }
        spec.affectedInfo = [...affSet];
    }

    // Aggregate requiredInfo across all rejects and choices
    const allReqInfo = new Set();
    for (const det of Object.values(spec.rejectDetails)) {
        for (const i of det.requiredInfo) allReqInfo.add(i);
    }
    for (const det of Object.values(spec.choiceDetails)) {
        for (const i of det.requiredInfo) allReqInfo.add(i);
    }
    spec.requiredInfo = [...allReqInfo];

    // Rejects without scenarios
    spec.rejectsWithoutScenarios = [];
    for (const [key, det] of Object.entries(spec.rejectDetails)) {
        if (det.scenarios.length === 0) spec.rejectsWithoutScenarios.push(key);
    }

    const roleMatch = content.match(/role:\s*'([^']+)'/);
    if (roleMatch) spec.role = roleMatch[1];

    const kindMatch = content.match(/kind:\s*'([^']+)'/);
    if (kindMatch) spec.agentKind = kindMatch[1];

    const contextMatch = content.match(/context:\s*'([^']+)'/);
    if (contextMatch) spec.context = contextMatch[1];

    const moduleMatch = content.match(/module:\s*'([^']+)'/);
    if (moduleMatch) spec.module = moduleMatch[1];

    const aggregateMatch = content.match(/aggregate:\s*'([^']+)'/);
    if (aggregateMatch) spec.aggregate = aggregateMatch[1];

    const descMatch = content.match(/description:\s*'([^']+)'/);
    if (descMatch) spec.description = descMatch[1];

    const goalMatch = content.match(/businessGoal:\s*'([^']+)'/);
    if (goalMatch) spec.businessGoal = goalMatch[1];

    return {
        type: spec.isOutcome ? 'outcome' : 'intent',
        description: spec.description || null,
        businessGoal: spec.businessGoal || null,
        trigger: spec.trigger,
        triggerType: spec.triggerType,
        choices: spec.choices,
        choiceDetails: spec.choiceDetails,
        rejects: spec.rejects,
        rejectDetails: spec.rejectDetails,
        assertionDetails: spec.assertionDetails || {},
        requiredInfo: spec.requiredInfo,
        affectedInfo: spec.affectedInfo,
        rejectsWithoutScenarios: spec.rejectsWithoutScenarios,
        role: spec.role || spec.agentKind || null,
        context: spec.context || null,
        module: spec.module || null,
        aggregate: spec.aggregate || null,
    };
}

function parseInfoUnion(content) {
    const infos = [];
    const infoMatch = content.match(/type Info\s*=([\s\S]*?)(?=\n\n|\/\/\/)/);
    if (infoMatch) {
        for (const m of infoMatch[1].matchAll(/'([^']+)'/g)) infos.push(m[1]);
    }
    return infos;
}

// Main
const specFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.spec.ts'));
const specs = {};
for (const file of specFiles) {
    const content = fs.readFileSync(path.join(specsDir, file), 'utf-8');
    specs[file.replace('.spec.ts', '')] = parseSpec(content);
}

const decisionsContent = fs.readFileSync(decisionsFile, 'utf-8');
const declaredInfos = parseInfoUnion(decisionsContent);

const output = { specs, declaredInfos };
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`Parsed ${Object.keys(specs).length} specs → ${outPath}`);
