/**
 * Client-side state — wires the virtual module + HMR to the HerbrandStore.
 *
 * The store is injected with rule sets and analysis map here,
 * keeping the store itself free of graphology and heavy dependencies.
 */

import { specs } from 'virtual:herbrand-specs';
import { HerbrandStore } from '@herbrand/core/store';
import { specLintRules } from '@herbrand/core/lint/spec-rules';
import { systemLintRules } from '@herbrand/core/lint/system-rules';
import { graphLintRules } from '@herbrand/core/lint/graph-rules';
import { graphAnalysisMap } from '@herbrand/core/graph/analysis-map';

export const store = new HerbrandStore({
  specLintRules,
  systemLintRules,
  graphLintRules,
  graphAnalysisMap,
});

// Initial load from virtual module
store.setFiles(specs);
console.log(`[herbrand] initial load: ${specs.length} files, status: ${store.pipelineStatus}`);

// HMR: receive updates from Vite plugin
if (import.meta.hot) {
  import.meta.hot.on('herbrand:specs-update', (newFiles: typeof specs) => {
    store.setFiles(newFiles);
    console.log(`[herbrand] updated: ${newFiles.length} files, status: ${store.pipelineStatus}`);
  });
}
