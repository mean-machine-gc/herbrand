import dagre from "dagre";
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
  position: { x: number; y: number };
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

const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const LANE_PADDING = 50;
const LANE_LABEL_WIDTH = 80;

export function toReactFlowGraph(graph: DecisionGraph): ReactFlowGraph {
  const { nodes: graphNodes, edges: graphEdges } = graph;

  // Step 1: Run dagre LR to get horizontal rank positions (X only)
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 200, marginx: LANE_LABEL_WIDTH + 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of graphNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of graphEdges) {
    g.setEdge(e.from, e.to);
  }

  dagre.layout(g);

  // Extract only X from dagre — we'll compute Y ourselves based on lanes
  const dagreX: Record<string, number> = {};
  for (const n of graphNodes) {
    const node = g.node(n.id);
    dagreX[n.id] = node.x;
  }

  // Step 2: Assign lanes — views on top, human roles in middle, automations at bottom
  const humanRoles = new Set<string>();
  for (const n of graphNodes) {
    if (n.type === "view") continue;
    if (n.role && n.role !== "machine") humanRoles.add(n.role);
  }
  const humanRoleList = [...humanRoles].sort();
  const laneIds = ["views", ...humanRoleList, "automations"];

  function laneOf(node: typeof graphNodes[0]): string {
    if (node.type === "view") return "views";
    if (node.role === "machine") return "automations";
    return node.role ?? "automations";
  }

  // Step 3: Group nodes by lane, then by X rank within each lane
  // Quantize X positions into ranks so nodes at similar X cluster together
  const allX = Object.values(dagreX).sort((a, b) => a - b);
  const ranks = [...new Set(allX)].sort((a, b) => a - b);

  type LaneRanks = Record<number, typeof graphNodes>;
  const laneRankNodes: Record<string, LaneRanks> = {};
  for (const lane of laneIds) laneRankNodes[lane] = {};

  for (const n of graphNodes) {
    const lane = laneOf(n);
    const x = dagreX[n.id];
    if (!laneRankNodes[lane]) laneRankNodes[lane] = {};
    if (!laneRankNodes[lane][x]) laneRankNodes[lane][x] = [];
    laneRankNodes[lane][x].push(n);
  }

  // Step 4: Calculate lane heights — based on max nodes at any single rank
  const laneHeights: Record<string, number> = {};
  for (const lane of laneIds) {
    let maxAtRank = 1;
    for (const nodesAtRank of Object.values(laneRankNodes[lane])) {
      if (nodesAtRank.length > maxAtRank) maxAtRank = nodesAtRank.length;
    }
    laneHeights[lane] = maxAtRank * (NODE_HEIGHT + 30) + LANE_PADDING * 2;
  }

  // Step 5: Calculate lane Y positions
  const laneY: Record<string, number> = {};
  let currentY = 0;
  for (const lane of laneIds) {
    laneY[lane] = currentY;
    currentY += laneHeights[lane];
  }

  // Step 6: Position nodes — dagre X, distributed Y within lane at each rank
  const nodePositions: Record<string, { x: number; y: number }> = {};

  for (const lane of laneIds) {
    const rankMap = laneRankNodes[lane];
    for (const [xStr, nodesAtRank] of Object.entries(rankMap)) {
      const x = Number(xStr);
      const h = laneHeights[lane];
      const spacing = h / (nodesAtRank.length + 1);

      for (let i = 0; i < nodesAtRank.length; i++) {
        nodePositions[nodesAtRank[i].id] = {
          x: x - NODE_WIDTH / 2,
          y: laneY[lane] + spacing * (i + 1) - NODE_HEIGHT / 2,
        };
      }
    }
  }

  // Calculate total graph width from rightmost node
  const maxX = Math.max(...Object.values(nodePositions).map((p) => p.x)) + NODE_WIDTH + 60;
  const graphWidth = Math.max(maxX, 800);

  // Build lane nodes (background rectangles in the flow)
  const laneRFNodes: RFNode[] = laneIds.map((id) => ({
    id: `lane-${id}`,
    type: "lane",
    position: { x: 0, y: laneY[id] },
    data: {
      label: id === "views" ? "Views" : id === "automations" ? "Automations" : id,
      width: graphWidth,
      height: laneHeights[id],
    } as RFLaneData,
    draggable: false,
    selectable: false,
    zIndex: -1,
    style: {
      width: graphWidth,
      height: laneHeights[id],
      padding: 0,
    },
  }));

  // Build decision nodes
  const decisionNodes: RFNode[] = graphNodes.map((n) => {
    const intentRejects = graphEdges
      .filter((e) => e.type === "intent_flow" && e.to === n.id)
      .flatMap((e) => e.intentRejects ?? []);

    return {
      id: n.id,
      type: n.type,
      position: nodePositions[n.id],
      zIndex: 1,
      data: {
        label: n.infos ? n.infos.join("\n") : n.id,
        nodeType: n.type,
        role: n.role,
        infos: n.infos,
        intentRejects: intentRejects.length > 0 ? intentRejects : undefined,
      },
    };
  });

  const rfNodes: RFNode[] = [...laneRFNodes, ...decisionNodes];

  // Build RF edges
  const rfEdges: RFEdge[] = graphEdges.map((e, i) => {
    const base: RFEdge = {
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      data: {
        edgeType: e.type,
        intentRejects: e.intentRejects,
        infos: e.infos,
      },
    };

    switch (e.type) {
      case "intent_flow":
        base.label = e.intentRejects?.join(", ");
        base.labelStyle = { fill: "#D94A4A", fontSize: 9 };
        break;
      case "reject_flow":
        base.animated = true;
        base.style = { stroke: "#D94A4A" };
        break;
      case "info_flow":
        base.animated = true;
        base.style = { stroke: "#7CB342", strokeDasharray: "4 3" };
        base.label = e.infos?.join(", ");
        base.labelStyle = { fill: "#7CB342", fontSize: 9 };
        break;
      case "view_to_intent":
        base.style = { stroke: "#7CB342" };
        break;
      case "outcome_flow":
        break;
    }

    return base;
  });

  // Build lane metadata
  const lanes: Lane[] = laneIds.map((id) => ({
    id,
    label: id === "views" ? "Views" : id,
    y: laneY[id],
    height: laneHeights[id],
  }));

  return { nodes: rfNodes, edges: rfEdges, lanes };
}
