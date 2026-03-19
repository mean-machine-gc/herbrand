#!/usr/bin/env node
/**
 * Render Specs View
 * Reads parsed-specs.json and spec-lint-results.json, produces HTML spec browser.
 *
 * Flow 1: specs → parse-specs → spec-lint → render-specs-view (this)
 */

const fs = require('fs');
const path = require('path');

const parsedPath = path.join(__dirname, '..', 'parsed-specs.json');
const lintPath = path.join(__dirname, '..', 'spec-lint-results.json');
const outPath = path.join(__dirname, '..', 'specs-view.html');

function badge(text, color) {
    return `<span class="badge" style="background:${color}">${text}</span>`;
}

function intentBadge(text) { return badge(text, '#4A90D9'); }
function outcomeBadge(text) { return badge(text, '#E8944A'); }
function rejectBadge(text) { return badge(text, '#D94A4A'); }
function infoBadge(text) { return badge(text, '#7CB342'); }
function tagBadge(text) { return `<span class="badge" style="background:#E0E0E0;color:#555">${text}</span>`; }
function roleBadge(text) { return `<span class="badge" style="background:#FFD600;color:#333">${text}</span>`; }

function renderSpecDetail(name, spec) {
    const isOutcome = spec.type === 'outcome';
    const typeLabel = isOutcome ? outcomeBadge('outcome decision') : intentBadge('intent decision');
    const agentLabel = spec.role ? roleBadge(spec.role) : roleBadge('machine');

    // Description
    let descHTML = '';
    if (spec.description) {
        descHTML = `<div class="spec-description">${spec.description}</div>`;
    }

    // Trigger
    let triggerHTML = '';
    if (isOutcome) {
        triggerHTML = `<div class="field"><span class="field-label">Trigger</span> ${intentBadge(spec.trigger)}</div>`;
    } else {
        triggerHTML = `<div class="field"><span class="field-label">Trigger</span> ${
            spec.triggerType === 'reject' ? rejectBadge(spec.trigger) : outcomeBadge(spec.trigger)
        } <span class="trigger-type">${spec.triggerType}</span></div>`;
    }

    // Rejects
    let rejectsHTML = '';
    for (const reject of spec.rejects) {
        const det = (spec.rejectDetails || {})[reject] || {};
        const infos = (det.requiredInfo || []).map(i => infoBadge(i)).join(' ');
        const desc = det.description ? `<div class="item-description">${det.description}</div>` : '';
        const examples = (det.scenarios || []).length > 0
            ? `<div class="item-scenarios">${det.scenarios.map(e => `<div class="scenario-item">scenario: ${e}</div>`).join('')}</div>`
            : '';
        rejectsHTML += `<div class="reject-item">
            <div class="reject-name">${rejectBadge(reject)}</div>
            ${desc}
            ${infos ? `<div class="item-infos">needs: ${infos}</div>` : ''}
            ${examples}
        </div>`;
    }

    // Choices
    let choicesHTML = '';
    for (const choice of spec.choices) {
        const det = (spec.choiceDetails || {})[choice] || {};
        const choiceBadge = isOutcome ? outcomeBadge(choice) : intentBadge(choice);
        const infos = (det.requiredInfo || []).map(i => infoBadge(i)).join(' ');
        const condition = det.condition ? `<div class="item-condition">${tagBadge('condition')} ${det.condition}</div>` : '';
        const desc = det.description ? `<div class="item-description">${det.description}</div>` : '';
        const examples = (det.scenarios || []).length > 0
            ? `<div class="item-scenarios">${det.scenarios.map(e => `<div class="scenario-item">scenario: ${e}</div>`).join('')}</div>`
            : '';
        choicesHTML += `<div class="choice-item">
            <div class="choice-name">${choiceBadge}</div>
            ${desc}
            ${condition}
            ${infos ? `<div class="item-infos">needs: ${infos}</div>` : ''}
            ${examples}
        </div>`;
    }

    // Assertions (outcome only)
    let assertionsHTML = '';
    if (isOutcome) {
        let assertItems = '';
        for (const choice of spec.choices) {
            const assertions = (spec.assertionDetails || {})[choice] || [];
            for (const a of assertions) {
                const affInfos = (a.affectedInfo || []).map(i => infoBadge(i)).join(' ');
                assertItems += `<div class="assert-item">
                    <div class="assert-tag">${tagBadge(a.tag)}</div>
                    <div class="item-description">${a.description}</div>
                    ${affInfos ? `<div class="item-infos">affects: ${affInfos}</div>` : ''}
                </div>`;
            }
        }
        if (assertItems) {
            assertionsHTML = `<div class="section">
                <div class="section-title">Assertions</div>
                ${assertItems}
            </div>`;
        }
    }

    // Context/module/aggregate
    let contextHTML = '';
    if (spec.context || spec.module || spec.aggregate) {
        contextHTML = `<div class="meta-row">`;
        if (spec.context) contextHTML += `<span class="meta-item">context: <strong>${spec.context}</strong></span>`;
        if (spec.module) contextHTML += `<span class="meta-item">module: <strong>${spec.module}</strong></span>`;
        if (spec.aggregate) contextHTML += `<span class="meta-item">aggregate: <strong>${spec.aggregate}</strong></span>`;
        contextHTML += `</div>`;
    }

    return `
        <div class="spec-header">
            <h2>${name}</h2>
            <div class="spec-type">${typeLabel} ${agentLabel}</div>
        </div>
        ${descHTML}
        ${contextHTML}
        ${triggerHTML}
        <div class="section">
            <div class="section-title">${isOutcome ? 'Should Fail With' : 'Preconditions'}</div>
            ${rejectsHTML || `<div class="empty">No ${isOutcome ? 'rejects' : 'preconditions'} defined</div>`}
        </div>
        <div class="section">
            <div class="section-title">${isOutcome ? 'Should Succeed With' : 'Produces Intent'}</div>
            ${choicesHTML || '<div class="empty">No choices defined</div>'}
        </div>
        ${assertionsHTML}
    `;
}

function buildLintPanel(results) {
    if (!results || results.length === 0) {
        return `<div class="lint-header"><h3>Spec Lint</h3><span class="lint-badge clean">✓ clean</span></div>`;
    }

    const errors = results.filter(r => r.level === 'error');
    const warnings = results.filter(r => r.level === 'warning');

    // Group by spec
    const bySpec = {};
    const global = [];
    for (const r of results) {
        if (r.spec) {
            if (!bySpec[r.spec]) bySpec[r.spec] = [];
            bySpec[r.spec].push(r);
        } else {
            global.push(r);
        }
    }

    let body = '';

    // Global issues
    if (global.length > 0) {
        body += `<div class="lint-category"><div class="lint-category-label" style="color:#666">Global</div>`;
        for (const item of global) {
            const icon = item.level === 'error' ? '✘' : '⚠';
            const color = item.level === 'error' ? '#D94A4A' : '#F9A825';
            body += `<div class="lint-item" style="border-left-color:${color}">${icon} ${item.message}</div>`;
        }
        body += `</div>`;
    }

    // Per-spec issues
    for (const [spec, items] of Object.entries(bySpec)) {
        body += `<div class="lint-category"><div class="lint-category-label" style="color:#333">${spec}</div>`;
        for (const item of items) {
            const icon = item.level === 'error' ? '✘' : '⚠';
            const color = item.level === 'error' ? '#D94A4A' : '#F9A825';
            body += `<div class="lint-item" style="border-left-color:${color}">${icon} ${item.message}</div>`;
        }
        body += `</div>`;
    }

    let badgeHTML = '';
    if (errors.length > 0) {
        badgeHTML += `<span class="lint-badge error">${errors.length} error${errors.length > 1 ? 's' : ''}</span>`;
    }
    if (warnings.length > 0) {
        badgeHTML += `<span class="lint-badge warning">${warnings.length} warning${warnings.length > 1 ? 's' : ''}</span>`;
    }

    return `<div class="lint-header"><h3>Spec Lint</h3>${badgeHTML}</div><div class="lint-body">${body}</div>`;
}

function render(parsed, lintResults) {
    const { specs } = parsed;
    const specNames = Object.keys(specs).sort();

    // Count lint issues per spec for list indicators
    const lintBySpec = {};
    for (const r of (lintResults || [])) {
        if (r.spec) {
            if (!lintBySpec[r.spec]) lintBySpec[r.spec] = { errors: 0, warnings: 0 };
            if (r.level === 'error') lintBySpec[r.spec].errors++;
            else lintBySpec[r.spec].warnings++;
        }
    }

    // Collect unique filter values
    const contexts = new Set();
    const modules = new Set();
    const aggregates = new Set();
    for (const spec of Object.values(specs)) {
        if (spec.context) contexts.add(spec.context);
        if (spec.module) modules.add(spec.module);
        if (spec.aggregate) aggregates.add(spec.aggregate);
    }

    // Build filter dropdowns
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

    // Build spec list items
    let listHTML = '';
    for (const name of specNames) {
        const spec = specs[name];
        const typeColor = spec.type === 'outcome' ? '#E8944A' : '#4A90D9';
        const lint = lintBySpec[name];
        let indicator = '';
        if (lint) {
            if (lint.errors > 0) indicator = `<span class="lint-dot error">${lint.errors}</span>`;
            else if (lint.warnings > 0) indicator = `<span class="lint-dot warning">${lint.warnings}</span>`;
        }
        listHTML += `<div class="spec-list-item" data-spec="${name}" data-context="${spec.context || ''}" data-module="${spec.module || ''}" data-aggregate="${spec.aggregate || ''}" onclick="showSpec('${name}')">
            <span class="spec-dot" style="background:${typeColor}"></span>
            <span class="spec-name">${name}</span>
            ${indicator}
        </div>`;
    }

    // Build spec detail panels
    let detailsHTML = '';
    for (const name of specNames) {
        detailsHTML += `<div class="spec-detail" id="spec-${name}" style="display:none">
            ${renderSpecDetail(name, specs[name])}
        </div>`;
    }

    const lintPanelHTML = buildLintPanel(lintResults);

    return `<!DOCTYPE html>
<html>
<head>
<title>Herbert Specs</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, Arial, sans-serif; background: #fff; color: #333; }

    .container { display: flex; height: 100vh; }

    /* List panel */
    .list-panel {
        width: 240px; border-right: 1px solid #E0E0E0; overflow-y: auto;
        background: #FAFAFA; flex-shrink: 0;
    }
    .list-header {
        padding: 16px; border-bottom: 1px solid #E0E0E0;
        font-size: 14px; font-weight: 600; color: #333;
        position: sticky; top: 0; background: #FAFAFA; z-index: 1;
    }
    .filters {
        padding: 8px 12px; border-bottom: 1px solid #E0E0E0;
        display: flex; flex-direction: column; gap: 4px;
    }
    .filter-select {
        width: 100%; padding: 4px 8px; font-size: 11px; font-family: inherit;
        border: 1px solid #DDD; border-radius: 3px; background: #fff; color: #555;
    }
    .spec-list-item {
        padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px;
        border-bottom: 1px solid #F0F0F0; font-size: 13px; color: #555;
        transition: background 0.1s;
    }
    .spec-list-item:hover { background: #EEEEEE; }
    .spec-list-item.active { background: #E3F2FD; color: #1565C0; font-weight: 500; }
    .spec-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .spec-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lint-dot {
        width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: 600;
        display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0;
    }
    .lint-dot.error { background: #D94A4A; }
    .lint-dot.warning { background: #F9A825; }

    /* Detail panel */
    .detail-panel { flex: 1; overflow-y: auto; padding: 32px 40px; }
    .detail-empty {
        display: flex; align-items: center; justify-content: center;
        height: 100%; color: #999; font-size: 14px;
    }

    .spec-header { margin-bottom: 12px; }
    .spec-header h2 { font-size: 20px; color: #212121; margin-bottom: 6px; }
    .spec-type { display: flex; gap: 6px; }
    .spec-description { font-size: 13px; color: #555; margin-bottom: 16px; line-height: 1.5; }

    .meta-row { margin-bottom: 16px; display: flex; gap: 16px; }
    .meta-item { font-size: 12px; color: #888; }
    .meta-item strong { color: #555; }

    .field { margin-bottom: 16px; }
    .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-right: 8px; }
    .trigger-type { font-size: 10px; color: #999; margin-left: 4px; }

    .section { margin-bottom: 20px; }
    .section-title {
        font-size: 12px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; color: #666; margin-bottom: 8px;
        padding-bottom: 4px; border-bottom: 1px solid #EEE;
    }

    .reject-item, .choice-item {
        padding: 8px 12px; margin-bottom: 6px;
        background: #FAFAFA; border-radius: 4px; border: 1px solid #F0F0F0;
    }
    .reject-name, .choice-name { margin-bottom: 4px; }
    .item-description { font-size: 12px; color: #555; margin: 4px 0; }
    .item-condition { font-size: 12px; color: #555; margin: 4px 0; display: flex; align-items: center; gap: 6px; }
    .item-infos { font-size: 11px; color: #888; margin-top: 4px; }
    .item-scenarios { margin-top: 4px; }
    .scenario-item { font-size: 11px; color: #999; font-style: italic; margin: 2px 0; }
    .assert-item {
        padding: 8px 12px; margin-bottom: 6px;
        background: #FAFAFA; border-radius: 4px; border: 1px solid #F0F0F0;
    }
    .assert-tag { margin-bottom: 4px; }

    .empty { font-size: 12px; color: #CCC; font-style: italic; }

    /* Badges */
    .badge {
        display: inline-block; padding: 2px 8px; border-radius: 3px;
        font-size: 11px; font-weight: 500; color: #fff; white-space: nowrap;
    }

    /* Lint panel */
    .lint-panel {
        width: 320px; border-left: 1px solid #E0E0E0; overflow-y: auto;
        background: #FAFAFA; flex-shrink: 0;
    }
    .lint-header {
        padding: 12px 16px; border-bottom: 1px solid #E0E0E0; display: flex;
        align-items: center; gap: 8px; position: sticky; top: 0; background: #FAFAFA; z-index: 1;
    }
    .lint-header h3 { margin: 0; font-size: 14px; color: #333; }
    .lint-badge {
        padding: 2px 8px; border-radius: 10px; font-size: 11px; color: #fff;
    }
    .lint-badge.clean { background: #4CAF50; }
    .lint-badge.error { background: #D94A4A; }
    .lint-badge.warning { background: #F9A825; }
    .lint-body { padding: 12px 16px; }
    .lint-category { margin-bottom: 14px; }
    .lint-category-label { font-size: 11px; font-weight: 600; margin-bottom: 4px; }
    .lint-item {
        margin-bottom: 4px; padding: 5px 10px; background: #fff;
        border-left: 3px solid #ccc; border-radius: 2px; font-size: 11px; color: #333;
    }
</style>
</head>
<body>
<div class="container">
    <div class="list-panel">
        <div class="list-header">Specs (${specNames.length})</div>
        ${filtersHTML}
        <div id="spec-list">${listHTML}</div>
    </div>
    <div class="detail-panel" id="detail-panel">
        <div class="detail-empty">Select a spec to view details</div>
        ${detailsHTML}
    </div>
    <div class="lint-panel">
        ${lintPanelHTML}
    </div>
</div>
<script>
    let activeItem = null;
    function showSpec(name) {
        document.querySelectorAll('.spec-detail').forEach(el => el.style.display = 'none');
        document.querySelector('.detail-empty')?.remove();
        const detail = document.getElementById('spec-' + name);
        if (detail) detail.style.display = 'block';
        if (activeItem) activeItem.classList.remove('active');
        activeItem = document.querySelector('[data-spec="' + name + '"]');
        if (activeItem) activeItem.classList.add('active');
    }
    const specsData = ${JSON.stringify(Object.fromEntries(specNames.map(n => [n, { context: specs[n].context || '', module: specs[n].module || '', aggregate: specs[n].aggregate || '' }])))};

    function applyFilters() {
        const ctx = document.getElementById('filter-context').value;
        const mod = document.getElementById('filter-module').value;
        const agg = document.getElementById('filter-aggregate').value;

        // Filter items
        document.querySelectorAll('.spec-list-item').forEach(el => {
            const matchCtx = !ctx || el.dataset.context === ctx;
            const matchMod = !mod || el.dataset.module === mod;
            const matchAgg = !agg || el.dataset.aggregate === agg;
            el.style.display = (matchCtx && matchMod && matchAgg) ? '' : 'none';
        });

        // Cascade: update module options based on context
        const modSelect = document.getElementById('filter-module');
        const aggSelect = document.getElementById('filter-aggregate');
        const availableModules = new Set();
        const availableAggregates = new Set();

        for (const [name, s] of Object.entries(specsData)) {
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
        if (!available.has(current)) {
            select.value = '';
        }
    }
    const firstName = '${specNames[0] || ''}';
    if (firstName) showSpec(firstName);
</script>
</body>
</html>`;
}

// Main
if (!fs.existsSync(parsedPath)) {
    console.error('No parsed-specs.json found. Run parse-specs first.');
    process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf-8'));
const lintResults = fs.existsSync(lintPath) ? JSON.parse(fs.readFileSync(lintPath, 'utf-8')) : [];

const html = render(parsed, lintResults);
fs.writeFileSync(outPath, html);
console.log(`Specs view rendered to ${outPath}`);
