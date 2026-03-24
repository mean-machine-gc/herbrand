/**
 * React hook to consume the HerbrandStore reactively.
 *
 * Uses @preact/signals-core effect to trigger React re-renders
 * when any accessed signal changes.
 */

import { useSyncExternalStore } from 'react';
import { effect } from '@preact/signals-core';
import { store } from '../state';

/** Subscribe to store changes — triggers re-render on any signal change */
export function useStore() {
  return useSyncExternalStore(
    (callback) => {
      const dispose = effect(() => {
        // Access all signals to subscribe
        store.pipelineStatus;
        store.system;
        store.graph;
        store.validationResults;
        store.specLintResults;
        store.systemLintResults;
        store.graphLintResults;
        store.graphAnalysisResults;
        store.businessView;
        callback();
      });
      return dispose;
    },
    () => store,
  );
}
