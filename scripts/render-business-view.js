#!/usr/bin/env node
/**
 * Render Business View
 * Reads decision-graph.json and produces business artifacts:
 * user stories with tabs for acceptance criteria, decision tables, scenarios.
 *
 * Flow 2: build-decision-graph → render-business-view (this)
 */

const fs = require('fs');
const path = require('path');

const graphPath = path.join(__dirname, '..', 'decision-graph.json');
const outPath = path.join(__dirname, '..', 'business-view.html');

function extractUserStories(graph) {
    const { specs } = graph;
    const stories = [];

    for (const [name, spec] of Object.entries(specs)) {
        if (spec.type !== 'intent') continue;

        const role = spec.role || 'user';
        const intent = spec.choices[0] || name;
        const goal = spec.businessGoal || '';
        const intentLabel = intent.replace(/_/g, ' ');

        // Given: intent decision's shouldFailWith (preconditions/guards)
        const given = [];
        for (const [reject, det] of Object.entries(spec.rejectDetails || {})) {
            given.push({
                tag: reject,
                description: det.description || reject.replace(/_/g, ' '),
                requiredInfo: det.requiredInfo || [],
                examples: det.scenarios || [],
            });
        }

        // Find linked outcome decision (consumes this intent)
        const outcomeEntry = Object.entries(specs).find(([_, s]) => s.type === 'outcome' && s.trigger === intent);

        // Then: outcome, condition, assertions, affected info
        const then = [];
        if (outcomeEntry) {
            const [outcName, outcSpec] = outcomeEntry;
            for (const [choice, det] of Object.entries(outcSpec.choiceDetails || {})) {
                const assertions = (outcSpec.assertionDetails || {})[choice] || [];
                then.push({
                    outcome: choice,
                    condition: det.condition || null,
                    description: det.description || null,
                    examples: det.scenarios || [],
                    assertions: assertions.map(a => ({
                        tag: a.tag,
                        description: a.description,
                        affectedInfo: a.affectedInfo || [],
                    })),
                });
            }
        }

        // Should Fail If: outcome decision's shouldFailWith
        const shouldFailIf = [];
        if (outcomeEntry) {
            const [_, outcSpec] = outcomeEntry;
            for (const [reject, det] of Object.entries(outcSpec.rejectDetails || {})) {
                shouldFailIf.push({
                    tag: reject,
                    description: det.description || reject.replace(/_/g, ' '),
                    examples: det.scenarios || [],
                });
            }
        }

        stories.push({
            name,
            role,
            intent,
            intentLabel,
            goal,
            context: spec.context || '',
            module: spec.module || '',
            aggregate: spec.aggregate || '',
            given,
            then,
            shouldFailIf,
            hasOutcome: !!outcomeEntry,
        });
    }

    return stories;
}

function renderAcceptanceCriteria(story) {
    let html = '';

    // Given
    if (story.given.length > 0) {
        html += `<div class="ac-section">`;
        html += `<span class="ac-keyword">Given</span>`;
        for (const g of story.given) {
            html += `<div class="ac-line"><span class="ac-tag">${g.tag}</span> ${g.description}</div>`;
        }
        html += `</div>`;
    }

    // When
    html += `<div class="ac-section">`;
    html += `<span class="ac-keyword">When</span>`;
    html += `<div class="ac-line"><span class="ac-badge-intent">${story.intentLabel}</span></div>`;
    html += `</div>`;

    // Then
    if (story.then.length > 0) {
        for (const t of story.then) {
            html += `<div class="ac-section">`;
            html += `<span class="ac-keyword">Then</span>`;
            html += `<div class="ac-line"><span class="ac-badge-outcome">${t.outcome}</span> ${t.description || ''}</div>`;

            if (t.condition) {
                html += `<div class="ac-nested">`;
                html += `<span class="ac-keyword-secondary">If</span>`;
                html += `<div class="ac-line">${t.condition}</div>`;
                html += `</div>`;
            }

            if (t.assertions.length > 0) {
                html += `<div class="ac-nested">`;
                html += `<span class="ac-keyword-secondary">Assertions</span>`;
                for (const a of t.assertions) {
                    html += `<div class="ac-assertion">`;
                    html += `<div class="ac-line"><span class="ac-tag">${a.tag}</span> ${a.description}</div>`;
                    if (a.affectedInfo.length > 0) {
                        html += `<div class="ac-effects">${a.affectedInfo.map(i => `<span class="ac-effect-tag">${i}</span>`).join(' ')}</div>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        }
    } else {
        html += `<div class="ac-section ac-missing">`;
        html += `<span class="ac-keyword">Then</span>`;
        html += `<div class="ac-line ac-empty-line">No outcome decision linked — acceptance criteria incomplete</div>`;
        html += `</div>`;
    }

    // Should Fail If
    if (story.shouldFailIf.length > 0) {
        html += `<div class="ac-section">`;
        html += `<span class="ac-keyword ac-keyword-fail">Should Fail If</span>`;
        for (const f of story.shouldFailIf) {
            html += `<div class="ac-line"><span class="ac-tag ac-tag-fail">${f.tag}</span> ${f.description}</div>`;
        }
        html += `</div>`;
    }

    return html;
}

function renderScenarios(story) {
    const scenarios = [];

    // Success scenarios (from linked outcome decision's shouldSucceedWith)
    for (const t of story.then) {
        scenarios.push({
            type: 'success',
            tag: t.outcome,
            description: t.condition || t.description || '',
            scenarios: t.scenarios || [],
        });
    }

    // Failure scenarios (from linked outcome decision's shouldFailWith)
    for (const f of story.shouldFailIf) {
        scenarios.push({
            type: 'failure',
            tag: f.tag,
            description: f.description,
            scenarios: f.scenarios || [],
        });
    }

    // Skipped scenarios (from intent decision's shouldFailWith)
    for (const g of story.given) {
        scenarios.push({
            type: 'skipped',
            tag: g.tag,
            description: g.description,
            scenarios: g.scenarios || [],
        });
    }

    if (scenarios.length === 0) {
        return `<div class="tab-empty">No scenarios to display.</div>`;
    }

    let html = '';
    for (const s of scenarios) {
        const typeClass = `sc-type-${s.type}`;
        const typeLabel = s.type;
        const scenariosHTML = s.scenarios.length > 0
            ? `<div class="sc-scenarios">
                <div class="sc-scenarios-label">Scenarios</div>
                ${s.scenarios.map(e => `<div class="sc-example">${e}</div>`).join('')}
               </div>`
            : `<div class="sc-no-scenarios">No scenarios yet</div>`;

        html += `<div class="sc-card">
            <div class="sc-header">
                <span class="sc-type ${typeClass}">${typeLabel}</span>
                <span class="sc-tag">${s.tag}</span>
            </div>
            <div class="sc-description">${s.description}</div>
            ${scenariosHTML}
        </div>`;
    }

    return html;
}

function renderDecisionTable(story) {
    const preconditions = story.given; // intent decision rejects
    const constraints = story.shouldFailIf; // outcome decision rejects
    const outcomes = story.then;

    if (preconditions.length === 0 && constraints.length === 0 && outcomes.length === 0) {
        return `<div class="tab-empty">Not enough data to generate a decision table.</div>`;
    }

    const hasOutcome = outcomes.length > 0;

    const hasPreconditions = preconditions.length > 0;
    const hasConstraints = constraints.length > 0;
    const hasOutcomes = outcomes.length > 0;

    // Collect all assertions and effects from outcomes
    const allAssertions = [];
    const allEffects = new Set();
    for (const t of outcomes) {
        for (const a of t.assertions) {
            allAssertions.push(a);
            for (const info of a.affectedInfo) allEffects.add(info);
        }
    }

    // Build header
    let header = '<tr>';
    header += '<th class="dt-scenario">Scenario</th>';
    header += '<th class="dt-type">Type</th>';
    if (hasPreconditions) {
        for (const p of preconditions) {
            header += `<th class="dt-precon" title="${p.description}">${p.tag}</th>`;
        }
    }
    if (hasConstraints) {
        for (const c of constraints) {
            header += `<th class="dt-constraint" title="${c.description}">${c.tag}</th>`;
        }
    }
    if (hasOutcome) {
        header += '<th class="dt-outcome">Outcome</th>';
        if (allAssertions.length > 0) header += '<th class="dt-assertions">Assertions</th>';
        if (allEffects.size > 0) header += '<th class="dt-effects">Effects</th>';
    }
    header += '</tr>';

    // Build column group header
    let colGroupHeader = '<tr class="dt-group-row">';
    colGroupHeader += '<th></th><th></th>';
    if (hasPreconditions) colGroupHeader += `<th colspan="${preconditions.length}" class="dt-group-label">Preconditions</th>`;
    if (hasConstraints) colGroupHeader += `<th colspan="${constraints.length}" class="dt-group-label">Constraints</th>`;
    if (hasOutcome) {
        colGroupHeader += '<th></th>';
        if (allAssertions.length > 0) colGroupHeader += '<th></th>';
        if (allEffects.size > 0) colGroupHeader += '<th></th>';
    }
    colGroupHeader += '</tr>';

    let rows = '';

    // === SUCCESS SCENARIOS ===
    for (const t of outcomes) {
        const conditionTags = t.condition
            ? `<span class="dt-condition-tag">${t.condition}</span>`
            : '';
        const assertionTags = t.assertions.map(a => `<span class="ac-tag">${a.tag}</span>`).join(' ');
        const effectTags = t.assertions
            .flatMap(a => a.affectedInfo)
            .map(i => `<span class="ac-effect-tag">${i}</span>`).join(' ');

        rows += '<tr class="dt-row-success">';
        rows += `<td class="dt-scenario-cell">${conditionTags}</td>`;
        rows += '<td class="dt-type-cell"><span class="dt-type-success">success</span></td>';
        for (const p of preconditions) rows += '<td class="dt-check">✓</td>';
        for (const c of constraints) rows += '<td class="dt-check">✓</td>';
        rows += `<td class="dt-outcome-cell"><span class="ac-badge-outcome">${t.outcome}</span></td>`;
        if (allAssertions.length > 0) rows += `<td class="dt-assertions-cell">${assertionTags}</td>`;
        if (allEffects.size > 0) rows += `<td class="dt-effects-cell">${effectTags}</td>`;
        rows += '</tr>';
    }

    // === FAILED SCENARIOS (one constraint fails at a time) ===
    for (let i = 0; i < constraints.length; i++) {
        rows += '<tr class="dt-row-failure">';
        rows += `<td class="dt-scenario-cell"><span class="dt-scenario-name">${constraints[i].description}</span></td>`;
        rows += '<td class="dt-type-cell"><span class="dt-type-failure">failure</span></td>';
        for (const p of preconditions) rows += '<td class="dt-check">✓</td>';
        for (let j = 0; j < constraints.length; j++) {
            if (j === i) {
                rows += '<td class="dt-fail">✗</td>';
            } else {
                rows += '<td class="dt-check">✓</td>';
            }
        }
        rows += `<td class="dt-outcome-cell"><span class="ac-tag ac-tag-fail">rejected:${constraints[i].tag}</span></td>`;
        if (allAssertions.length > 0) rows += '<td class="dt-empty-cell"></td>';
        if (allEffects.size > 0) rows += '<td class="dt-empty-cell"></td>';
        rows += '</tr>';
    }

    // === SKIPPED SCENARIOS (one precondition fails at a time) ===
    for (let i = 0; i < preconditions.length; i++) {
        rows += '<tr class="dt-row-skipped">';
        rows += `<td class="dt-scenario-cell"><span class="dt-scenario-name">${preconditions[i].description}</span></td>`;
        rows += '<td class="dt-type-cell"><span class="dt-type-skipped">skipped</span></td>';
        for (let j = 0; j < preconditions.length; j++) {
            if (j === i) {
                rows += '<td class="dt-fail">✗</td>';
            } else {
                rows += '<td class="dt-check">✓</td>';
            }
        }
        if (hasConstraints) {
            for (const c of constraints) rows += '<td class="dt-na">—</td>';
        }
        if (hasOutcome) {
            rows += '<td class="dt-empty-cell"></td>';
            if (allAssertions.length > 0) rows += '<td class="dt-empty-cell"></td>';
            if (allEffects.size > 0) rows += '<td class="dt-empty-cell"></td>';
        }
        rows += '</tr>';
    }

    return `<div class="dt-wrapper"><table class="dt-table">
        <thead>${colGroupHeader}${header}</thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function render(stories) {
    // Collect unique filter values
    const contexts = new Set();
    const modules = new Set();
    const aggregates = new Set();
    for (const story of stories) {
        if (story.context) contexts.add(story.context);
        if (story.module) modules.add(story.module);
        if (story.aggregate) aggregates.add(story.aggregate);
    }

    const filterOptions = (label, id, values) => {
        let opts = `<option value="">All ${label}</option>`;
        for (const v of [...values].sort()) opts += `<option value="${v}">${v}</option>`;
        return `<select id="${id}" class="filter-select" onchange="applyFilters()">${opts}</select>`;
    };
    const filtersHTML = `<div class="filters">
        ${filterOptions('contexts', 'filter-context', contexts)}
        ${filterOptions('modules', 'filter-module', modules)}
        ${filterOptions('aggregates', 'filter-aggregate', aggregates)}
    </div>`;

    let cardsHTML = '';
    for (const story of stories) {
        const id = story.name;
        const acHTML = renderAcceptanceCriteria(story);
        const dtHTML = renderDecisionTable(story);
        cardsHTML += `
        <div class="story-card" data-context="${story.context}" data-module="${story.module}" data-aggregate="${story.aggregate}">
            <div class="user-story">
                As a <strong>${story.role}</strong>,
                I want to <strong>${story.intentLabel}</strong>
                so to <strong>${story.goal}</strong>
            </div>
            <div class="tabs" id="tabs-${id}">
                <button class="tab active" onclick="switchTab('${id}', 'ac')">Acceptance Criteria</button>
                <button class="tab" onclick="switchTab('${id}', 'dt')">Decision Table</button>
                <button class="tab" onclick="switchTab('${id}', 'sc')">Scenarios</button>
            </div>
            <div class="tab-content" id="tab-${id}-ac">
                ${acHTML}
            </div>
            <div class="tab-content" id="tab-${id}-dt" style="display:none">
                ${dtHTML}
            </div>
            <div class="tab-content" id="tab-${id}-sc" style="display:none">
                ${renderScenarios(story)}
            </div>
        </div>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
<title>Herbert Business View</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: Helvetica, Arial, sans-serif; background: #F5F5F5;
        color: #333; padding: 32px; max-width: 900px; margin: 0 auto;
    }

    h1 { font-size: 18px; color: #333; margin-bottom: 16px; }

    .filters {
        display: flex; gap: 8px; margin-bottom: 20px;
    }
    .filter-select {
        padding: 5px 10px; font-size: 12px; font-family: inherit;
        border: 1px solid #DDD; border-radius: 4px; background: #fff; color: #555;
    }

    .story-card {
        background: #fff; border-radius: 6px; padding: 24px;
        margin-bottom: 20px; border: 1px solid #E0E0E0;
    }

    .user-story {
        font-size: 15px; line-height: 1.7; color: #333; margin-bottom: 16px;
    }
    .user-story strong { color: #111; }

    .tabs {
        display: flex; gap: 0; border-bottom: 1px solid #E0E0E0; margin-bottom: 16px;
    }
    .tab {
        padding: 8px 16px; font-size: 12px; color: #888; background: none;
        border: none; border-bottom: 2px solid transparent;
        cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .tab:hover { color: #555; }
    .tab.active { color: #333; border-bottom-color: #4A90D9; font-weight: 500; }

    .tab-content { min-height: 40px; }
    .tab-empty { font-size: 13px; color: #BBB; font-style: italic; padding: 8px 0; }

    .ac-section { margin-bottom: 12px; }
    .ac-keyword {
        display: inline-block; font-size: 11px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: #4A90D9; margin-bottom: 4px;
    }
    .ac-keyword-secondary {
        display: inline-block; font-size: 11px; font-weight: 500;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: #999; margin-bottom: 4px; margin-left: 12px;
    }
    .ac-keyword-fail { color: #D94A4A; }
    .ac-line {
        font-size: 13px; color: #333; padding: 4px 0 4px 16px;
        line-height: 1.5;
    }
    .ac-tag {
        display: inline-block; font-size: 10px; color: #888;
        background: #ECEFF1; padding: 1px 6px; border-radius: 3px;
        margin-right: 4px;
    }
    .ac-tag-fail {
        color: #D94A4A; background: #FFEBEE;
    }
    .ac-nested {
        margin-left: 16px; padding-left: 12px;
        border-left: 2px solid #E8ECF0; margin-top: 4px;
    }
    .ac-assertion {
        padding: 4px 0;
    }
    .ac-effects {
        padding: 2px 0 2px 16px;
    }
    .ac-effect-tag {
        display: inline-block; font-size: 10px; color: #7CB342;
        background: #E8F5E9; padding: 1px 6px; border-radius: 3px; margin-right: 4px;
    }
    .ac-badge-intent {
        display: inline-block; font-size: 11px; font-weight: 500;
        color: #fff; background: #4A90D9; padding: 2px 8px; border-radius: 3px;
    }
    .ac-badge-outcome {
        display: inline-block; font-size: 11px; font-weight: 500;
        color: #fff; background: #E8944A; padding: 2px 8px; border-radius: 3px;
        margin-right: 4px;
    }
    .ac-empty-line { color: #CCC; font-style: italic; }
    .ac-missing { opacity: 0.6; }

    /* Decision Table */
    .dt-wrapper { overflow-x: auto; }
    .dt-table {
        width: 100%; border-collapse: collapse; font-size: 12px;
    }
    .dt-table th, .dt-table td {
        padding: 6px 10px; border: 1px solid #E8ECF0; text-align: center;
        vertical-align: middle;
    }
    .dt-table thead th {
        background: #F5F7FA; color: #555; font-weight: 500; font-size: 11px;
        white-space: nowrap;
    }
    .dt-group-row th {
        background: #ECEFF1; color: #888; font-size: 10px;
        text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px;
    }
    .dt-group-label { border-bottom: 2px solid #CFD8DC; }
    .dt-scenario { text-align: left; min-width: 120px; }
    .dt-scenario-cell { text-align: left; }
    .dt-type { width: 70px; }
    .dt-type-cell { width: 70px; }
    .dt-type-success {
        font-size: 10px; color: #4CAF50; font-weight: 500;
        text-transform: uppercase;
    }
    .dt-type-failure {
        font-size: 10px; color: #D94A4A; font-weight: 500;
        text-transform: uppercase;
    }
    .dt-type-skipped {
        font-size: 10px; color: #999; font-weight: 500;
        text-transform: uppercase;
    }
    .dt-check { color: #4CAF50; font-size: 14px; }
    .dt-fail { color: #D94A4A; font-size: 14px; font-weight: 600; }
    .dt-na { color: #CCC; }
    .dt-precon { background: #F9FBE7 !important; }
    .dt-constraint { background: #FFF3E0 !important; }
    .dt-outcome-cell { white-space: nowrap; }
    .dt-assertions-cell { text-align: left; }
    .dt-effects-cell { text-align: left; }
    .dt-empty-cell { }
    .dt-condition-tag {
        display: inline-block; font-size: 10px; color: #666;
        background: #F5F5F5; padding: 2px 6px; border-radius: 3px;
        margin: 1px 0; line-height: 1.6;
    }
    .dt-row-success { background: #FAFFFE; }
    .dt-row-failure { background: #FFFAFA; }
    .dt-row-skipped { background: #FAFAFA; }
    .dt-scenario-name { font-size: 11px; color: #666; }

    /* Scenarios */
    .sc-card {
        padding: 12px 16px; margin-bottom: 10px;
        background: #FAFAFA; border-radius: 4px; border: 1px solid #F0F0F0;
    }
    .sc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .sc-type {
        font-size: 10px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; padding: 2px 8px; border-radius: 3px;
    }
    .sc-type-success { color: #4CAF50; background: #E8F5E9; }
    .sc-type-failure { color: #D94A4A; background: #FFEBEE; }
    .sc-type-skipped { color: #888; background: #ECEFF1; }
    .sc-tag {
        font-size: 12px; color: #555; font-weight: 500;
    }
    .sc-description { font-size: 13px; color: #666; margin-bottom: 8px; }
    .sc-scenarios-label {
        font-size: 10px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; color: #999; margin-bottom: 4px;
    }
    .sc-example {
        font-size: 12px; color: #555; padding: 3px 0 3px 12px;
        border-left: 2px solid #E0E0E0; margin-bottom: 3px;
    }
    .sc-no-scenarios { font-size: 11px; color: #CCC; font-style: italic; }
</style>
</head>
<body>
<h1>User Stories (${stories.length})</h1>
${filtersHTML}
${cardsHTML}
<script>
const storiesData = ${JSON.stringify(stories.map(s => ({ context: s.context, module: s.module, aggregate: s.aggregate })))};

function applyFilters() {
    const ctx = document.getElementById('filter-context').value;
    const mod = document.getElementById('filter-module').value;
    const agg = document.getElementById('filter-aggregate').value;

    document.querySelectorAll('.story-card').forEach(el => {
        const matchCtx = !ctx || el.dataset.context === ctx;
        const matchMod = !mod || el.dataset.module === mod;
        const matchAgg = !agg || el.dataset.aggregate === agg;
        el.style.display = (matchCtx && matchMod && matchAgg) ? '' : 'none';
    });

    const modSelect = document.getElementById('filter-module');
    const aggSelect = document.getElementById('filter-aggregate');
    const availableModules = new Set();
    const availableAggregates = new Set();

    for (const s of storiesData) {
        const matchCtx = !ctx || s.context === ctx;
        const matchMod = !mod || s.module === mod;
        if (matchCtx && s.module) availableModules.add(s.module);
        if (matchCtx && matchMod && s.aggregate) availableAggregates.add(s.aggregate);
    }

    updateOptions(modSelect, availableModules, 'modules');
    updateOptions(aggSelect, availableAggregates, 'aggregates');
}

function updateOptions(select, available, label) {
    const current = select.value;
    const opts = ['<option value="">All ' + label + '</option>'];
    for (const v of [...available].sort()) {
        const sel = v === current ? ' selected' : '';
        opts.push('<option value="' + v + '"' + sel + '>' + v + '</option>');
    }
    select.innerHTML = opts.join('');
    if (!available.has(current)) select.value = '';
}
function switchTab(id, tab) {
    // Hide all tab contents for this story
    ['ac', 'dt', 'sc'].forEach(t => {
        const el = document.getElementById('tab-' + id + '-' + t);
        if (el) el.style.display = 'none';
    });
    // Show selected
    const selected = document.getElementById('tab-' + id + '-' + tab);
    if (selected) selected.style.display = 'block';
    // Update active tab
    const tabs = document.getElementById('tabs-' + id);
    tabs.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}
</script>
</body>
</html>`;
}

// Main
if (!fs.existsSync(graphPath)) {
    console.error('No decision-graph.json found. Run build-decision-graph first.');
    process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
const stories = extractUserStories(graph);
const html = render(stories);
fs.writeFileSync(outPath, html);
console.log(`Business view rendered to ${outPath} (${stories.length} user stories)`);
