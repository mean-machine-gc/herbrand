import { signal, computed } from "@preact/signals-core";
import fs from "node:fs";
import path from "node:path";
import { parseSpecs, specLint, buildDecisionGraph, behaviorLint, toReactFlowGraph, extractUserStories, } from "@herbrand/core";
export class HerbrandStore {
    /// Root signal — set by filesystem watcher, vite plugin, or manually
    _specFiles = signal([]);
    _watcher = null;
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
    _projectDir = null;
    _readSpecsFromDisk() {
        if (!this._projectDir)
            return [];
        const projectDir = this._projectDir;
        const files = [];
        // Read project.hb.yaml from project root
        const projectFile = path.join(projectDir, "project.hb.yaml");
        if (fs.existsSync(projectFile)) {
            files.push({ fileName: "project.hb.yaml", content: fs.readFileSync(projectFile, "utf-8") });
        }
        // Read specs/*.hb.yaml
        const specsDir = path.join(projectDir, "specs");
        if (fs.existsSync(specsDir)) {
            for (const f of fs.readdirSync(specsDir)) {
                if (f.endsWith(".hb.yaml")) {
                    files.push({ fileName: f, content: fs.readFileSync(path.join(specsDir, f), "utf-8") });
                }
            }
        }
        return files;
    }
    _refresh() {
        this.setSpecFiles(this._readSpecsFromDisk());
    }
    _debouncedRefresh() {
        if (this._debounceTimer)
            clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._refresh(), 100);
    }
    watch(projectDir) {
        this.stop();
        this._projectDir = projectDir;
        // Initial load
        this._refresh();
        // Watch project root for project.hb.yaml changes
        this._watcher = fs.watch(projectDir, { recursive: false }, (_eventType, fileName) => {
            if (fileName === "project.hb.yaml") {
                this._debouncedRefresh();
            }
        });
        // Watch specs dir for .hb.yaml changes
        const specsDir = path.join(projectDir, "specs");
        if (fs.existsSync(specsDir)) {
            const specsWatcher = fs.watch(specsDir, { recursive: false }, (_eventType, fileName) => {
                if (fileName && fileName.endsWith(".hb.yaml")) {
                    this._debouncedRefresh();
                }
            });
            // Store original watcher close, chain both
            const originalClose = this._watcher?.close.bind(this._watcher);
            this._watcher = {
                close: () => { originalClose?.(); specsWatcher.close(); },
            };
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
        this._projectDir = null;
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
