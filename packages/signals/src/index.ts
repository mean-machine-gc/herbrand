import { signal, computed } from "@preact/signals-core";
import type {
  SpecFile,
  ParsedSpecs,
  DecisionGraph,
  LintResult,
  ReactFlowGraph,
  UserStory,
} from "@herbrand/core";
import {
  parseSpecs,
  specLint,
  buildDecisionGraph,
  behaviorLint,
  toReactFlowGraph,
  extractUserStories,
} from "@herbrand/core";

export class HerbrandStore {
  /// Root signals — consumers feed data via setSpecFiles() and setContextFilter()

  private _specFiles = signal<SpecFile[]>([]);
  private _contextFilter = signal<string | null>(null);

  /// Reactive pipeline — computed automatically when specFiles changes

  private _parsedSpecs = computed<ParsedSpecs>(() => {
    const files = this._specFiles.value;
    if (files.length === 0) return { specs: {}, declaredInfos: [] };
    return parseSpecs(files);
  });

  private _specLintResults = computed<LintResult[]>(() => {
    const parsed = this._parsedSpecs.value;
    if (Object.keys(parsed.specs).length === 0) return [];
    return specLint(parsed);
  });

  private _decisionGraph = computed<DecisionGraph | null>(() => {
    const parsed = this._parsedSpecs.value;
    if (Object.keys(parsed.specs).length === 0) return null;
    const errors = this._specLintResults.value.filter((r) => r.level === "error");
    if (errors.length > 0) return null;
    return buildDecisionGraph(parsed);
  });

  private _behaviorLintResults = computed<LintResult[]>(() => {
    const graph = this._decisionGraph.value;
    if (!graph) return [];
    return behaviorLint(graph);
  });

  private _reactFlowGraph = computed<ReactFlowGraph | null>(() => {
    const graph = this._decisionGraph.value;
    if (!graph) return null;
    return toReactFlowGraph(graph);
  });

  private _userStories = computed<Record<string, UserStory>>(() => {
    const graph = this._decisionGraph.value;
    if (!graph) return {};
    return extractUserStories(graph);
  });

  /// Scoped pipeline — reacts to contextFilter changes

  private _scopedSpecLintResults = computed<LintResult[]>(() => {
    const parsed = this._parsedSpecs.value;
    const ctx = this._contextFilter.value;
    if (Object.keys(parsed.specs).length === 0) return [];
    return specLint(parsed, ctx ?? undefined);
  });

  private _scopedBehaviorLintResults = computed<LintResult[]>(() => {
    const graph = this._decisionGraph.value;
    const ctx = this._contextFilter.value;
    if (!graph) return [];
    return behaviorLint(graph, ctx ?? undefined);
  });

  private _scopedUserStories = computed<Record<string, UserStory>>(() => {
    const stories = this._userStories.value;
    const ctx = this._contextFilter.value;
    if (!ctx) return stories;
    return Object.fromEntries(
      Object.entries(stories).filter(([, s]) => s.context === ctx)
    );
  });

  private _scopedSpecCount = computed<number>(() => {
    const specs = this._parsedSpecs.value.specs;
    const ctx = this._contextFilter.value;
    if (!ctx) return Object.keys(specs).length;
    return Object.values(specs).filter(s => s.sourceContext === ctx).length;
  });

  /// Setters

  setSpecFiles(files: SpecFile[]) {
    this._specFiles.value = files;
  }

  setContextFilter(context: string | null) {
    this._contextFilter.value = context;
  }

  /// Getters

  get specFiles(): SpecFile[] {
    return this._specFiles.value;
  }

  get parsedSpecs(): ParsedSpecs {
    return this._parsedSpecs.value;
  }

  get specLintResults(): LintResult[] {
    return this._specLintResults.value;
  }

  get decisionGraph(): DecisionGraph | null {
    return this._decisionGraph.value;
  }

  get behaviorLintResults(): LintResult[] {
    return this._behaviorLintResults.value;
  }

  get reactFlowGraph(): ReactFlowGraph | null {
    return this._reactFlowGraph.value;
  }

  get userStories(): Record<string, UserStory> {
    return this._userStories.value;
  }

  get hasSpecErrors(): boolean {
    return this._specLintResults.value.some((r) => r.level === "error");
  }

  get hasGraphErrors(): boolean {
    return this._behaviorLintResults.value.some((r) => r.level === "error");
  }

  get specCount(): number {
    return Object.keys(this._parsedSpecs.value.specs).length;
  }

  get nodeCount(): number {
    return this._decisionGraph.value?.nodes.length ?? 0;
  }

  /// Scoped getters — filtered by contextFilter

  get scopedSpecLintResults(): LintResult[] {
    return this._scopedSpecLintResults.value;
  }

  get scopedBehaviorLintResults(): LintResult[] {
    return this._scopedBehaviorLintResults.value;
  }

  get scopedUserStories(): Record<string, UserStory> {
    return this._scopedUserStories.value;
  }

  get scopedSpecCount(): number {
    return this._scopedSpecCount.value;
  }

  get scopedHasSpecErrors(): boolean {
    return this._scopedSpecLintResults.value.some((r) => r.level === "error");
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
