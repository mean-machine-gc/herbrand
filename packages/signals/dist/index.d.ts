import type { SpecFile, ParsedSpecs, DecisionGraph, LintResult } from "@herbrand/core";
export declare class HerbrandStore {
    private _specFiles;
    private _watcher;
    private _watchDir;
    private _debounceTimer;
    private _parsedSpecs;
    private _specLintResults;
    private _decisionGraph;
    private _behaviorLintResults;
    setSpecFiles(files: SpecFile[]): void;
    private _readSpecsFromDisk;
    private _refresh;
    private _debouncedRefresh;
    watch(projectDir: string): void;
    stop(): void;
    get specFiles(): SpecFile[];
    get parsedSpecs(): ParsedSpecs;
    get specLintResults(): LintResult[];
    get decisionGraph(): DecisionGraph | null;
    get behaviorLintResults(): LintResult[];
    get hasSpecErrors(): boolean;
    get hasGraphErrors(): boolean;
    get specCount(): number;
    get nodeCount(): number;
    get signals(): {
        specFiles: import("@preact/signals-core").Signal<SpecFile[]>;
        parsedSpecs: import("@preact/signals-core").ReadonlySignal<ParsedSpecs>;
        specLintResults: import("@preact/signals-core").ReadonlySignal<LintResult[]>;
        decisionGraph: import("@preact/signals-core").ReadonlySignal<DecisionGraph | null>;
        behaviorLintResults: import("@preact/signals-core").ReadonlySignal<LintResult[]>;
    };
}
