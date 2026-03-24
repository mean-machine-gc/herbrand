/**
 * Client-side state — wires the virtual module + HMR to the HerbrandStore.
 *
 * The store is injected with rule sets and analysis map here,
 * keeping the store itself free of graphology and heavy dependencies.
 */

import { specs } from 'virtual:herbrand-specs';
import { HerbrandStore } from 'policies-poc/store';
import { specLintRules } from 'policies-poc/spec-linting-rules';
import { systemLintRules } from 'policies-poc/system-linting-rules';
import { graphLintRules } from 'policies-poc/graph-linting-rules';
import { graphAnalysisMap } from 'policies-poc/graph-analysis-map';

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
