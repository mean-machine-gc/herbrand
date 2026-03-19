#!/usr/bin/env node
/**
 * Stage 4: Graph + Lint → HTML
 * Renders the decision graph and lint panel as a single HTML page.
 * Pure presentation — no analysis, no spec parsing.
 *
 * Pipeline: specs → tsc → build-graph → lint → render (this)
 */

const fs = require('fs');
const path = require('path');

const graphPath = path.join(__dirname, '..', 'decision-graph.json');
const lintPath = path.join(__dirname, '..', 'lint-results.json');
const outPath = path.join(__dirname, '..', 'decision-graph.html');

function buildLintPanel(results) {
    if (!results || results.length === 0) {
        return `<div class="lint-header"><h3>Lint</h3><span class="lint-badge" style="background:#4CAF50">✓ clean</span></div>`;
    }

    const categoryMap = {
        orphan_outcome: 'Orphans', unconsumed_intent: 'Orphans', unhandled_rejection: 'Orphans',
        dead_end_outcome: 'Dead Ends',
        info_never_written: 'Info Flow', info_never_read: 'Info Flow', info_declared_unused: 'Info Flow',
        missing_required_info: 'Completeness', missing_affected_info: 'Completeness', missing_examples: 'Completeness',
        competing_outcome_decisions: 'Structural', duplicate_intent_decision: 'Structural', duplicate_views: 'Structural',
        aggregate_no_shared_info: 'Boundaries',
    };
    const categoryColors = {
        'Orphans': '#E65100', 'Dead Ends': '#BF360C', 'Info Flow': '#1565C0',
        'Completeness': '#F9A825', 'Structural': '#6A1B9A', 'Boundaries': '#2E7D32',
    };

    const categories = {};
    for (const r of results) {
        const cat = categoryMap[r.rule] || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(r);
    }

    let body = '';
    for (const [cat, items] of Object.entries(categories)) {
        const color = categoryColors[cat] || '#333';
        body += `<div class="lint-category">`;
        body += `<div class="lint-category-label" style="color:${color}">${cat} (${items.length})</div>`;
        for (const item of items) {
            const specTag = item.spec ? ` <span class="spec-tag">— ${item.spec}</span>` : '';
            body += `<div class="lint-item" style="border-left-color:${color}">⚠ ${item.message}${specTag}</div>`;
        }
        body += `</div>`;
    }

    const badge = `<span class="lint-badge" style="background:#FF9800">${results.length} warning${results.length > 1 ? 's' : ''}</span>`;
    return `<div class="lint-header"><h3>Lint</h3>${badge}</div><div class="lint-body">${body}</div>`;
}

function render(graph, lintResults) {
    const { nodes, edges } = graph;

    // Collect roles for swimlanes
    const roles = new Set();
    for (const n of nodes) {
        if (n.role && n.type !== 'view') roles.add(n.role);
    }
    const roleList = [...roles];

    // Assign lanes: views = -1, roles = 0, 1, 2...
    const laneOf = (node) => {
        if (node.type === 'view') return -1;
        const idx = roleList.indexOf(node.role);
        return idx >= 0 ? idx : 0;
    };

    // Assign columns via BFS
    const nodeMap = {};
    for (const n of nodes) {
        n.lane = laneOf(n);
        n.col = 0;
        nodeMap[n.id] = n;
    }

    const inDegree = {};
    for (const n of nodes) inDegree[n.id] = 0;
    for (const e of edges) {
        if (nodeMap[e.to]) inDegree[e.to] = (inDegree[e.to] || 0) + 1;
    }

    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const visited = new Set();
    let maxIter = nodes.length * 3;

    while (queue.length > 0 && maxIter-- > 0) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        const node = nodeMap[id];
        if (!node) continue;
        for (const e of edges) {
            if (e.from === id && nodeMap[e.to]) {
                nodeMap[e.to].col = Math.max(nodeMap[e.to].col, node.col + 1);
                queue.push(e.to);
            }
        }
    }

    // Layout
    const LABEL_W = 60;
    const COL_W = 200;
    const ROW_H = 80;
    const PAD = 30;
    const NODE_W = 140;
    const NODE_H = 40;

    const maxCol = Math.max(...nodes.map(n => n.col), 0);
    const allLanes = [-1, ...roleList.map((_, i) => i)];

    // Nodes per lane per column
    const laneSlots = {};
    for (const lane of allLanes) {
        laneSlots[lane] = {};
        for (let c = 0; c <= maxCol; c++) laneSlots[lane][c] = [];
    }
    for (const n of nodes) {
        if (!laneSlots[n.lane]) laneSlots[n.lane] = {};
        if (!laneSlots[n.lane][n.col]) laneSlots[n.lane][n.col] = [];
        laneSlots[n.lane][n.col].push(n);
    }

    // Lane heights
    const laneH = {};
    for (const lane of allLanes) {
        let max = 1;
        for (let c = 0; c <= maxCol; c++) {
            max = Math.max(max, (laneSlots[lane][c] || []).length);
        }
        laneH[lane] = max * ROW_H + PAD * 2;
    }

    // Lane Y positions
    const laneY = {};
    let curY = 0;
    for (const lane of allLanes) {
        laneY[lane] = curY;
        curY += laneH[lane];
    }

    const totalH = curY;
    const totalW = LABEL_W + (maxCol + 1) * COL_W + 60;

    // Position nodes
    for (const n of nodes) {
        const slot = laneSlots[n.lane][n.col] || [];
        const idx = slot.indexOf(n);
        const h = laneH[n.lane];
        const spacing = h / (slot.length + 1);
        n.x = LABEL_W + n.col * COL_W + COL_W / 2;
        n.y = laneY[n.lane] + spacing * (idx + 1);
    }

    const colors = {
        intent: '#4A90D9', outcome: '#E8944A',
        outcome_reject: '#D94A4A', view: '#7CB342',
    };

    // SVG
    let svg = '';

    // Lanes
    for (const lane of allLanes) {
        const y = laneY[lane];
        const h = laneH[lane];
        const label = lane === -1 ? 'Views' : roleList[lane];
        svg += `<rect x="0" y="${y}" width="${totalW}" height="${h}" fill="#FAFAFA" stroke="#BDBDBD" stroke-width="1"/>\n`;
        svg += `<line x1="${LABEL_W}" y1="${y}" x2="${LABEL_W}" y2="${y + h}" stroke="#BDBDBD" stroke-width="1"/>\n`;
        svg += `<text x="14" y="${y + h / 2}" font-family="Helvetica,Arial,sans-serif" font-size="13" fill="#37474F" transform="rotate(-90,14,${y + h / 2})" text-anchor="middle" dominant-baseline="middle">${label}</text>\n`;
    }

    // Edges
    for (const e of edges) {
        const from = nodeMap[e.from];
        const to = nodeMap[e.to];
        if (!from || !to) continue;

        let stroke = '#666', dash = '', sw = 1.5, markerSuffix = '';
        if (e.type === 'reject_flow') { stroke = '#D94A4A'; dash = 'stroke-dasharray="6,3"'; markerSuffix = 'Red'; }
        if (e.type === 'info_flow') { stroke = '#7CB342'; dash = 'stroke-dasharray="4,3"'; sw = 1; markerSuffix = 'Green'; }
        if (e.type === 'view_to_intent') { stroke = '#7CB342'; sw = 1.2; markerSuffix = 'Green'; }

        const x1 = from.x + NODE_W / 2, y1 = from.y;
        const x2 = to.x - NODE_W / 2, y2 = to.y;
        const mx = (x1 + x2) / 2;

        svg += `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${sw}" ${dash} marker-end="url(#arrow${markerSuffix})"/>\n`;

        if (e.type === 'intent_flow' && e.intentRejects && e.intentRejects.length > 0) {
            const lx = mx, ly = Math.min(y1, y2) - 5;
            svg += `<text x="${lx}" y="${ly}" font-family="Helvetica,Arial,sans-serif" font-size="8" fill="#D94A4A" text-anchor="middle">${e.intentRejects.join(', ')}</text>\n`;
        }
    }

    // Nodes
    for (const n of nodes) {
        const fill = colors[n.type] || '#999';
        const x = n.x - NODE_W / 2, y = n.y - NODE_H / 2;
        const rx = n.type === 'view' ? 2 : 6;
        const label = n.infos ? n.infos.join('\n') : n.id;

        svg += `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${rx}" fill="${fill}" stroke="none"/>\n`;

        const lines = label.split('\n');
        const lh = 12;
        const sy = n.y - ((lines.length - 1) * lh) / 2;
        for (let i = 0; i < lines.length; i++) {
            svg += `<text x="${n.x}" y="${sy + i * lh}" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#fff" text-anchor="middle" dominant-baseline="middle">${lines[i]}</text>\n`;
        }
    }

    // Lint panel
    const lintHTML = buildLintPanel(lintResults);

    return `<!DOCTYPE html>
<html>
<head>
<title>Herbert Decision Graph</title>
<style>
  body { margin:0; padding:0; background:#fff; font-family:Helvetica,Arial,sans-serif; }
  .container { display:flex; height:100vh; }
  .graph-panel { flex:1; overflow:auto; padding:20px; }
  .lint-panel { width:360px; border-left:1px solid #E0E0E0; overflow-y:auto; background:#FAFAFA; flex-shrink:0; }
  .lint-header { padding:12px 16px; border-bottom:1px solid #E0E0E0; display:flex; align-items:center; gap:8px; position:sticky; top:0; background:#FAFAFA; z-index:1; }
  .lint-header h3 { margin:0; font-size:14px; color:#333; }
  .lint-badge { padding:2px 8px; border-radius:10px; font-size:11px; color:#fff; }
  .lint-body { padding:12px 16px; }
  .lint-category { margin-bottom:14px; }
  .lint-category-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
  .lint-item { margin-bottom:6px; padding:6px 10px; background:#fff; border-left:3px solid #ccc; border-radius:2px; font-size:11px; color:#333; }
  .lint-item .spec-tag { color:#999; font-size:10px; }
</style>
</head>
<body>
<div class="container">
  <div class="graph-panel">
    <svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M 0 0 L 8 3 L 0 6 Z" fill="#666"/></marker>
        <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M 0 0 L 8 3 L 0 6 Z" fill="#D94A4A"/></marker>
        <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M 0 0 L 8 3 L 0 6 Z" fill="#7CB342"/></marker>
      </defs>
      ${svg}
    </svg>
  </div>
  <div class="lint-panel">
    ${lintHTML}
  </div>
</div>
</body>
</html>`;
}

// Main
if (!fs.existsSync(graphPath)) {
    console.error('No decision-graph.json found. Run build-graph.js first.');
    process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
const lintResults = fs.existsSync(lintPath) ? JSON.parse(fs.readFileSync(lintPath, 'utf-8')) : [];

const html = render(graph, lintResults);
fs.writeFileSync(outPath, html);
console.log(`Rendered to ${outPath}`);
