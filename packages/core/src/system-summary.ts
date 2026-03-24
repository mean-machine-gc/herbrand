/**
 * System summary — birds-eye index for scoped requests.
 *
 * Designed for the MCP agent: provides just enough structure to know
 * what exists and how to ask for details.
 */

import type { System } from './index.js';
import type { BusinessViewItem } from './business-view.js';
import type { LintViolation } from './lint-types.js';

export type SystemSummary = {
  readonly status: string;
  readonly counts: {
    readonly contexts: number;
    readonly actors: number;
    readonly policies: number;
    readonly operations: number;
    readonly processes: number;
    readonly infoPoints: number;
    readonly integrationPoints: number;
  };
  readonly lint: {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
  };
  readonly actors: {
    readonly id: string;
    readonly type: string;
    readonly label: string;
    readonly decisions: { id: string; type: 'policy' | 'operation' }[];
  }[];
  readonly contexts: {
    readonly id: string;
    readonly type: string;
    readonly description: string;
    readonly decisions: string[];
  }[];
  readonly processes: {
    readonly id: string;
    readonly description: string;
    readonly startsWith: string[];
    readonly endsWith: string[];
    readonly decisions: string[];
    readonly businessItems: {
      readonly type: string;
      readonly policyId: string;
      readonly operationId: string | null;
      readonly formula: string;
    }[];
  }[];
  readonly integrationPoints: {
    readonly from: string;
    readonly to: string;
    readonly via: string;
    readonly decisions: string[];
  }[];
};

export function deriveSystemSummary(
  system: System,
  businessView: BusinessViewItem[],
  violations: LintViolation[],
  status: string,
): SystemSummary {
  return {
    status,
    counts: {
      contexts: system.contexts.length,
      actors: system.actors.length,
      policies: system.policies.length,
      operations: system.operations.length,
      processes: system.processes.length,
      infoPoints: system.infoPoints.length,
      integrationPoints: system.integrationPoints.length,
    },
    lint: {
      errors: violations.filter(v => v.level === 'error').length,
      warnings: violations.filter(v => v.level === 'warning').length,
      info: violations.filter(v => v.level === 'info').length,
    },
    actors: system.actors.map(a => ({
      id: a.id,
      type: a.type,
      label: a.type === 'human' ? (a as any).role : (a as any).description,
      decisions: [
        ...system.policies.filter(p => p.actor === a.id).map(p => ({ id: p.id, type: 'policy' as const })),
        ...system.operations.filter(o => o.actor === a.id).map(o => ({ id: o.id, type: 'operation' as const })),
      ],
    })),
    contexts: system.contexts.map(c => ({
      id: c.id,
      type: c.type,
      description: c.description,
      decisions: [
        ...system.policies.filter(p => p.context === c.id).map(p => p.id),
        ...system.operations.filter(o => o.context === c.id).map(o => o.id),
      ],
    })),
    processes: system.processes.map(proc => {
      const procDecisions = [...system.policies, ...system.operations]
        .filter(d => d.processes?.includes(proc.id));
      const procBv = businessView.filter(b => b.processes.includes(proc.id));
      return {
        id: proc.id,
        description: proc.description,
        startsWith: proc.startsWith,
        endsWith: proc.endsWith,
        decisions: procDecisions.map(d => d.id),
        businessItems: procBv.map(b => ({
          type: b.type,
          policyId: b.policyId,
          operationId: b.operationId,
          formula: b.formula,
        })),
      };
    }),
    integrationPoints: system.integrationPoints.map(ip => ({
      from: ip.from.contextId,
      to: ip.to.contextId,
      via: ip.via,
      decisions: [ip.from.decisionId, ip.to.decisionId],
    })),
  };
}
