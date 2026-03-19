import { signal, computed } from "@preact/signals-core";
import fs from "node:fs";
import path from "node:path";
import { parseSpecs, specLint, buildDecisionGraph, behaviorLint, toReactFlowGraph, extractUserStories, } from "@herbrand/core";
export class HerbrandStore {
    /// Root signal — set by filesystem watcher, vite plugin, or manually
    _specFiles = signal([]);
    _watcher = null;
    _watchDir = null;
    _debounceTimer = null;
    /// Reactive pipeline — computed automatically when specFiles changes
    _parsedSpecs = computed(() => {
        const files = this._specFiles.value;
        if (files.length === 0)
            return { specs: {}, declaredInfos: [] };
        return parseSpecs(files);
    });
    _specLintResults = computed(() => {
        const parsed = this._parsedSpecs.value;
        if (Object.keys(parsed.specs).length === 0)
            return [];
        return specLint(parsed);
    });
    _decisionGraph = computed(() => {
        const parsed = this._parsedSpecs.value;
        if (Object.keys(parsed.specs).length === 0)
            return null;
        const errors = this._specLintResults.value.filter((r) => r.level === "error");
        if (errors.length > 0)
            return null;
        return buildDecisionGraph(parsed);
    });
    _behaviorLintResults = computed(() => {
        const graph = this._decisionGraph.value;
        if (!graph)
            return [];
        return behaviorLint(graph);
    });
    _reactFlowGraph = computed(() => {
        const graph = this._decisionGraph.value;
        if (!graph)
            return null;
        return toReactFlowGraph(graph);
    });
    _userStories = computed(() => {
        const graph = this._decisionGraph.value;
        if (!graph)
            return {};
        return extractUserStories(graph);
    });
    /// Setters
    setSpecFiles(files) {
        this._specFiles.value = files;
    }
    /// Filesystem watcher
    _readSpecsFromDisk(specsDir) {
        if (!fs.existsSync(specsDir))
            return [];
        return fs.readdirSync(specsDir)
            .filter((f) => f.endsWith(".spec.ts"))
            .map((f) => ({
            fileName: f,
            content: fs.readFileSync(path.join(specsDir, f), "utf-8"),
        }));
    }
    _refresh() {
        if (!this._watchDir)
            return;
        this.setSpecFiles(this._readSpecsFromDisk(this._watchDir));
    }
    _debouncedRefresh() {
        if (this._debounceTimer)
            clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._refresh(), 100);
    }
    watch(projectDir) {
        this.stop();
        const specsDir = path.join(projectDir, "src", "specs");
        this._watchDir = specsDir;
        // Initial load
        this._refresh();
        // Watch for changes
        if (fs.existsSync(specsDir)) {
            this._watcher = fs.watch(specsDir, { recursive: false }, (_eventType, fileName) => {
                if (fileName && fileName.endsWith(".spec.ts")) {
                    this._debouncedRefresh();
                }
            });
        }
    }
    stop() {
        if (this._watcher) {
            this._watcher.close();
            this._watcher = null;
        }
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
        this._watchDir = null;
    }
    /// Getters
    get specFiles() {
        return this._specFiles.value;
    }
    get parsedSpecs() {
        return this._parsedSpecs.value;
    }
    get specLintResults() {
        return this._specLintResults.value;
    }
    get decisionGraph() {
        return this._decisionGraph.value;
    }
    get behaviorLintResults() {
        return this._behaviorLintResults.value;
    }
    get reactFlowGraph() {
        return this._reactFlowGraph.value;
    }
    get userStories() {
        return this._userStories.value;
    }
    get hasSpecErrors() {
        return this._specLintResults.value.some((r) => r.level === "error");
    }
    get hasGraphErrors() {
        return this._behaviorLintResults.value.some((r) => r.level === "error");
    }
    get specCount() {
        return Object.keys(this._parsedSpecs.value.specs).length;
    }
    get nodeCount() {
        return this._decisionGraph.value?.nodes.length ?? 0;
    }
    /// Raw signals — for UI frameworks that consume signals directly
    get signals() {
        return {
            specFiles: this._specFiles,
            parsedSpecs: this._parsedSpecs,
            specLintResults: this._specLintResults,
            decisionGraph: this._decisionGraph,
            behaviorLintResults: this._behaviorLintResults,
            reactFlowGraph: this._reactFlowGraph,
            userStories: this._userStories,
        };
    }
}
