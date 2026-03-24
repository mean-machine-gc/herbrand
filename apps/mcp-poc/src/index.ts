/**
 * Herbrand MCP POC — decision-first business analysis server.
 *
 * Five tools for the agent, five skills for the workflow.
 * Reads project files imperatively per tool call, no watcher.
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { HerbrandStore } from 'policies-poc/store';
import { specLintRules } from 'policies-poc/spec-linting-rules';
import { systemLintRules } from 'policies-poc/system-linting-rules';
import { graphLintRules } from 'policies-poc/graph-linting-rules';
import { graphAnalysisMap } from 'policies-poc/graph-analysis-map';
import { refreshStore } from './helpers.js';
import { installSkills } from './install-skills.js';
import { spawn } from 'child_process';

const projectDir = process.argv[2] || process.env.HERBRAND_PROJECT || process.cwd();

const server = new FastMCP({
  name: 'Herbrand',
  version: '0.1.0',
});

const store = new HerbrandStore({
  specLintRules,
  systemLintRules,
  graphLintRules,
  graphAnalysisMap,
});

// ── Tools ───────────────────────────────────────────────────

server.addTool({
  name: 'install_skills',
  description: 'Installs Herbrand skills as slash commands in the project. Call this when starting a new session so skills are available as /herbrand-primer, /herbrand-explore-process, etc. Detects the platform automatically or accepts a specific one.',
  parameters: z.object({
    platform: z.enum(['claude', 'opencode', 'github', 'cursor']).optional()
      .describe('Target platform. Omit to install for all platforms.'),
  }),
  execute: async (args) => {
    const installed = installSkills(projectDir, args.platform);
    return JSON.stringify({
      installed: installed.length,
      files: installed,
      note: 'Skills installed. They will be available as slash commands in the next session, or immediately if the agent restarts.',
    }, null, 2);
  },
});

server.addTool({
  name: 'launch_ui',
  description: 'Launches the Herbrand UI in the browser, pointed at the current project folder. Call this at the start of a session so the domain expert can see the live views.',
  parameters: z.object({}),
  execute: async () => {
    spawn('npx', ['herbrand-ui', '--folder', projectDir], {
      stdio: 'ignore',
      shell: true,
      detached: true,
    }).unref();
    return JSON.stringify({ status: 'UI launched', folder: projectDir });
  },
});

server.addTool({
  name: 'get_system_overview',
  description: 'Returns the birds-eye summary: actors with their decisions, execution contexts, processes with their business items (user stories/automations), integration points, and lint counts. Use this as an index to know what exists and scope further requests.',
  parameters: z.object({}),
  execute: async () => {
    refreshStore(store, projectDir);
    const summary = store.systemSummary;
    if (!summary) return JSON.stringify({ status: store.pipelineStatus, error: 'System not available' });
    return JSON.stringify(summary, null, 2);
  },
});

server.addTool({
  name: 'get_lint_results',
  description: 'Returns all validation results grouped by scope: validation (YAML/schema), spec (per-decision), system (cross-decision), graph (topology). Fix errors first — they block downstream pipeline stages.',
  parameters: z.object({}),
  execute: async () => {
    refreshStore(store, projectDir);
    return JSON.stringify({
      status: store.pipelineStatus,
      validation: store.validationResults,
      spec: store.specLintResults,
      system: store.systemLintResults,
      graph: store.graphLintResults,
      summary: {
        errors: store.allViolations.filter(v => v.level === 'error').length,
        warnings: store.allViolations.filter(v => v.level === 'warning').length,
        info: store.allViolations.filter(v => v.level === 'info').length,
      },
    }, null, 2);
  },
});

server.addTool({
  name: 'get_business_view',
  description: 'Returns user stories (human actor) and automations (llm/machine actor) with their formulas, acceptance criteria summary, and decision table row counts. Optionally filter by process.',
  parameters: z.object({
    process: z.string().optional().describe('Filter by process ID. Omit for all.'),
  }),
  execute: async (args) => {
    refreshStore(store, projectDir);
    let items = store.businessView;
    if (args.process) {
      items = items.filter((b: any) => b.processes.includes(args.process));
    }
    const result = items.map((b: any) => ({
      type: b.type,
      policyId: b.policyId,
      operationId: b.operationId,
      formula: b.formula,
      actorId: b.actorId,
      actorType: b.actorType,
      context: b.context,
      processes: b.processes,
      businessGoal: b.businessGoal,
      preconditionCount: b.acceptanceCriteria.given.length,
      constraintCount: b.acceptanceCriteria.shouldFailIf.length,
      outcomeCount: b.acceptanceCriteria.then.length,
      decisionTableRows: b.decisionTable.rows.length,
    }));
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'get_user_story',
  description: 'Returns a single user story or automation by policy ID with full details: acceptance criteria (Given/When/Then), decision table (all paths with preconditions, constraints, conditions, outcomes, effects), and view (info points required).',
  parameters: z.object({
    policyId: z.string().describe('The policy ID to get the story for'),
  }),
  execute: async (args) => {
    refreshStore(store, projectDir);
    const item = store.businessView.find((b: any) => b.policyId === args.policyId);
    if (!item) return JSON.stringify({ error: `No business item found for policy "${args.policyId}"` });
    return JSON.stringify(item, null, 2);
  },
});

server.addTool({
  name: 'get_graph_insights',
  description: 'Returns graph analysis results: boundary cohesion, bottleneck detection, blast radius, info point clustering, decision clustering, critical paths, dependency depth, temporal ordering. Only available when the graph has no errors.',
  parameters: z.object({}),
  execute: async () => {
    refreshStore(store, projectDir);
    const results = store.graphAnalysisResults;
    if (!results) return JSON.stringify({ status: store.pipelineStatus, error: 'Graph analysis not available' });
    return JSON.stringify(results, null, 2);
  },
});

// ── Skills ──────────────────────────────────────────────────

const skillDir = new URL('./skills', import.meta.url).pathname;

function loadSkill(filename: string) {
  const content = readFileSync(join(skillDir, filename), 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return null;

  const meta: Record<string, string> = {};
  for (const line of frontmatterMatch[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  }

  return {
    name: meta.name ?? filename.replace('.md', ''),
    description: meta.description ?? '',
    content: frontmatterMatch[2].trim(),
  };
}

const skills = [
  loadSkill('primer.md'),
  loadSkill('explore-process.md'),
  loadSkill('review-system.md'),
  loadSkill('challenge-model.md'),
  loadSkill('enrich.md'),
].filter(Boolean);

for (const skill of skills) {
  if (!skill) continue;
  server.addPrompt({
    name: skill.name,
    description: skill.description,
    arguments: [],
    load: async () => skill.content,
  });
}

// ── Start ───────────────────────────────────────────────────

server.start({
  transportType: 'stdio',
});
