/**
 * System-level lint rules — graph-blocking validation.
 *
 * These are gatekeepers: if any fail, the graph should not be built.
 * Every rule here is an error.
 */

import type { SystemLintRule } from './lint-types.js';
import {
  checkUniqueDecisionIds,
  checkUniqueContextIds,
  checkUniqueActorIds,
  checkContextExists,
  checkContextActorCompatibility,
} from './system-lint.js';

export const systemLintRules: Record<string, SystemLintRule> = {

  'system/unique-decision-ids': {
    id: 'system/unique-decision-ids',
    description: 'All decision IDs must be unique across policies and operations',
    level: 'error',
    check: checkUniqueDecisionIds,
  },

  'system/unique-context-ids': {
    id: 'system/unique-context-ids',
    description: 'All execution context IDs must be unique',
    level: 'error',
    check: checkUniqueContextIds,
  },

  'system/unique-actor-ids': {
    id: 'system/unique-actor-ids',
    description: 'All actor IDs must be unique',
    level: 'error',
    check: checkUniqueActorIds,
  },

  'system/context-exists': {
    id: 'system/context-exists',
    description: 'Every decision must reference an existing execution context',
    level: 'error',
    check: checkContextExists,
  },

  'system/context-actor-compatibility': {
    id: 'system/context-actor-compatibility',
    description: 'Institutional contexts require human actors; software contexts require llm or machine actors',
    level: 'error',
    check: checkContextActorCompatibility,
  },
};
