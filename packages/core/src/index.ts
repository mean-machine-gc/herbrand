export type {
  SpecFile,
  ParsedSpec,
  ParsedSpecs,
  DecisionGraph,
  GraphNode,
  GraphEdge,
  LintResult,
  RejectDetail,
  ChoiceDetail,
  AssertionDetail,
} from "./types.js"

export {
  parseSpecs,
  specLint,
  buildDecisionGraph,
  behaviorLint,
} from "./functions.js"
