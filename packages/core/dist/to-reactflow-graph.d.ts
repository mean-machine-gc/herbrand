import type { DecisionGraph } from "./types.js";
export type RFNodeData = {
    label: string;
    nodeType: "intent" | "outcome" | "outcome_reject" | "view";
    role: string | null;
    infos?: string[];
    intentRejects?: string[];
};
export type RFLaneData = {
    label: string;
    width: number;
    height: number;
};
export type RFNode = {
    id: string;
    type: string;
    position: {
        x: number;
        y: number;
    };
    data: RFNodeData | RFLaneData;
    style?: Record<string, unknown>;
    draggable?: boolean;
    selectable?: boolean;
    zIndex?: number;
};
export type RFEdge = {
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
    animated?: boolean;
    style?: Record<string, unknown>;
    labelStyle?: Record<string, unknown>;
    data?: {
        edgeType: string;
        intentRejects?: string[];
        infos?: string[];
    };
};
export type Lane = {
    id: string;
    label: string;
    y: number;
    height: number;
};
export type ReactFlowGraph = {
    nodes: RFNode[];
    edges: RFEdge[];
    lanes: Lane[];
};
export declare function toReactFlowGraph(graph: DecisionGraph): ReactFlowGraph;
