/**
 * Graph-level lint rules — correctness checks that imply spec revision.
 *
 * Every rule here answers: "should the analyst revise their specs?"
 * A clean graph lint means the graph is ready for analysis.
 *
 * Pipeline: spec-lint → system-lint → build graph → graph-lint → graph-analysis
 */

import type { GraphLintRule } from './lint-types.js';
import {
  checkNoOrphanDecisions,
  checkNoDeadEndChains,
  checkNoDegenerateCycles,
  checkCycleHasExit,
  checkExternalSignalsDocumented,
  checkTerminalSignalsDocumented,
  checkViewHasUpdater,
  checkCircularSideEffects,
  checkIntentHasConsumer,
  checkOutcomeHasListener,
  checkNoDuplicateActivation,
  checkNoDuplicateOutcomeKinds,
  checkInfoPointHasProducer,
  checkInfoPointHasReader,
  checkInfoPointNamingConsistency,
  checkActorAssigned,
  checkNoOrphanActors,
  checkNoOrphanContexts,
} from './graph-lint.js';

export const graphLintRules: Record<string, GraphLintRule> = {

  // ── Reachability ───────────────────────────────────────────

  'graph/no-orphan-decisions': {
    id: 'graph/no-orphan-decisions',
    description: 'Every decision should be reachable from at least one signal',
    level: 'warning',
    check: checkNoOrphanDecisions,
  },

  'graph/no-dead-end-chains': {
    id: 'graph/no-dead-end-chains',
    description: 'Every chain starting from an external signal should reach at least one terminal outcome',
    level: 'info',
    check: checkNoDeadEndChains,
  },

  // ── Cycle analysis ─────────────────────────────────────────

  'graph/no-degenerate-cycles': {
    id: 'graph/no-degenerate-cycles',
    description: 'Detect cycles with no termination condition — potential infinite cascades',
    level: 'error',
    check: checkNoDegenerateCycles,
  },

  'graph/cycle-has-exit': {
    id: 'graph/cycle-has-exit',
    description: 'Every cycle in the graph should have at least one conditional exit',
    level: 'warning',
    check: checkCycleHasExit,
  },

  // ── Signal completeness ────────────────────────────────────

  'graph/external-signals-documented': {
    id: 'graph/external-signals-documented',
    description: 'External signals should be confirmed as intentionally external or resolved with a producing operation',
    level: 'info',
    check: checkExternalSignalsDocumented,
  },

  'graph/terminal-signals-documented': {
    id: 'graph/terminal-signals-documented',
    description: 'Terminal signals should be confirmed as intentionally terminal or resolved with a listening policy',
    level: 'info',
    check: checkTerminalSignalsDocumented,
  },

  // ── View / side-effect correctness ─────────────────────────

  'graph/view-has-updater': {
    id: 'graph/view-has-updater',
    description: 'Every view should be fed by at least one updates edge — otherwise a producing effect is missing',
    level: 'info',
    check: checkViewHasUpdater,
  },

  'graph/circular-side-effects': {
    id: 'graph/circular-side-effects',
    description: 'An outcome that updates a view which informs the operation that produced the outcome creates a feedback loop',
    level: 'warning',
    check: checkCircularSideEffects,
  },

  // ── Wiring completeness ────────────────────────────────────

  'graph/intent-has-consumer': {
    id: 'graph/intent-has-consumer',
    description: 'Every intent emitted by a policy should be consumed by at least one operation',
    level: 'warning',
    check: checkIntentHasConsumer,
  },

  'graph/outcome-has-listener': {
    id: 'graph/outcome-has-listener',
    description: 'Every outcome should be listened to by at least one policy (or confirmed as terminal)',
    level: 'info',
    check: checkOutcomeHasListener,
  },

  'graph/no-duplicate-activation': {
    id: 'graph/no-duplicate-activation',
    description: 'An intent kind should not activate more than one operation (ambiguous routing)',
    level: 'warning',
    check: checkNoDuplicateActivation,
  },

  'graph/no-duplicate-outcome-kinds': {
    id: 'graph/no-duplicate-outcome-kinds',
    description: 'An outcome kind should not be produced by more than one operation (ambiguous sourcing)',
    level: 'warning',
    check: checkNoDuplicateOutcomeKinds,
  },

  // ── Info point completeness ────────────────────────────────

  'graph/info-point-has-producer': {
    id: 'graph/info-point-has-producer',
    description: 'Every info point read by a decision should be produced by some outcome effect',
    level: 'warning',
    check: checkInfoPointHasProducer,
  },

  'graph/info-point-has-reader': {
    id: 'graph/info-point-has-reader',
    description: 'Every info point produced by an outcome should be read by some decision',
    level: 'info',
    check: checkInfoPointHasReader,
  },

  'graph/info-point-naming-consistency': {
    id: 'graph/info-point-naming-consistency',
    description: 'Info point names should follow a consistent dot-notation pattern',
    level: 'info',
    check: checkInfoPointNamingConsistency,
  },

  // ── Assignment completeness ────────────────────────────────

  'graph/actor-assigned': {
    id: 'graph/actor-assigned',
    description: 'Every decision should have an actor assigned',
    level: 'warning',
    check: checkActorAssigned,
  },

  // ── Orphans ────────────────────────────────────────────────

  'graph/no-orphan-actors': {
    id: 'graph/no-orphan-actors',
    description: 'Every declared actor should be assigned to at least one decision',
    level: 'info',
    check: checkNoOrphanActors,
  },

  'graph/no-orphan-contexts': {
    id: 'graph/no-orphan-contexts',
    description: 'Every declared context should host at least one decision',
    level: 'info',
    check: checkNoOrphanContexts,
  },
};
