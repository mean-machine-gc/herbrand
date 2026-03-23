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
  /// Root signal — consumers feed data via setSpecFiles()

  private _specFiles = signal<SpecFile[]>([]);

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

  /// Setters

  setSpecFiles(files: SpecFile[]) {
    this._specFiles.value = files;
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
