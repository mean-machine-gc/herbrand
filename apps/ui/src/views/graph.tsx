import { useState, useCallback } from "react";
import { Stack, Text, Box, Group, Title, Badge } from "@mantine/core";
import { Graph as GraphIcon, Warning } from "@phosphor-icons/react";
import {
  ReactFlow,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { HerbrandStore } from "@herbrand/signals";
import type { LintResult } from "@herbrand/core";
import type { RFNodeData, RFLaneData } from "@herbrand/core";

const nodeColors: Record<string, string> = {
  intent: "#4A90D9",
  outcome: "#E8944A",
  outcome_reject: "#D94A4A",
  view: "#7CB342",
};

function DecisionNode({ data }: NodeProps<Node<RFNodeData>>) {
  const bg = nodeColors[data.nodeType] ?? "#999";
  const isView = data.nodeType === "view";
  const lines = data.label.split("\n");

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: bg }} />
      <div
        style={{
          background: bg,
          color: "#fff",
          borderRadius: isView ? 2 : 6,
          padding: "6px 12px",
          fontSize: 11,
          fontFamily: "Helvetica, Arial, sans-serif",
          fontWeight: 500,
          minWidth: 100,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: bg }} />
    </>
  );
}

function LaneNode({ data }: NodeProps<Node<RFLaneData>>) {
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        border: "1px solid var(--mantine-color-default-border, #e0e0e0)",
        borderRadius: 0,
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 70,
          borderRight: "1px solid var(--mantine-color-default-border, #e0e0e0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 12,
            fontFamily: "Helvetica, Arial, sans-serif",
            color: "var(--mantine-color-dimmed, #888)",
            fontWeight: 500,
          }}
        >
          {data.label}
        </span>
      </div>
    </div>
  );
}

const nodeTypes = {
  intent: DecisionNode,
  outcome: DecisionNode,
  outcome_reject: DecisionNode,
  view: DecisionNode,
  lane: LaneNode,
};

function BehaviorLintPanel({ results }: { results: LintResult[] }) {
  if (results.length === 0) {
    return (
      <Stack p="md">
        <Group gap="xs">
          <Title order={5}>Behavior Lint</Title>
          <Badge color="green" size="xs">clean</Badge>
        </Group>
      </Stack>
    );
  }

  const grouped: Record<string, LintResult[]> = {};
  for (const r of results) {
    if (!grouped[r.rule]) grouped[r.rule] = [];
    grouped[r.rule].push(r);
  }

  return (
    <Stack p="md" gap="sm">
      <Group gap="xs">
        <Title order={5}>Behavior Lint</Title>
        <Badge color="yellow" size="xs">{results.length} warnings</Badge>
      </Group>
      {Object.entries(grouped).map(([rule, items]) => (
        <div key={rule}>
          <Text size="xs" fw={600} mb={4}>{rule} ({items.length})</Text>
          {items.map((r, i) => (
            <Group key={i} gap={4} mb={2}>
              <Warning size={12} color="var(--mantine-color-yellow-6)" />
              <Text size="xs">{r.message}{r.spec ? ` (${r.spec})` : ""}</Text>
            </Group>
          ))}
        </div>
      ))}
    </Stack>
  );
}

export function GraphView({ store }: { store: HerbrandStore }) {
  const rfGraph = store.reactFlowGraph;
  const lintResults = store.behaviorLintResults;

  if (!rfGraph) {
    return (
      <Stack align="center" justify="center" h="60vh" gap="md">
        <GraphIcon size={48} weight="light" color="var(--mantine-color-dimmed)" />
        <Text c="dimmed" size="sm">
          {store.hasSpecErrors
            ? "Cannot build graph — fix spec-lint errors first"
            : "No decision graph to show"}
        </Text>
      </Stack>
    );
  }

  const { nodes: initialNodes, edges: initialEdges } = rfGraph;

  return (
    <Group align="stretch" h="calc(100vh - 80px)" gap={0} wrap="nowrap">
      <Box style={{ flex: 1 }}>
        <ReactFlow
          nodes={initialNodes as Node[]}
          edges={initialEdges as Edge[]}
          nodeTypes={nodeTypes}
          nodesDraggable
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
        </ReactFlow>
      </Box>
      <Box
        w={lintResults.length > 0 ? 360 : undefined}
        style={{ borderLeft: "1px solid var(--mantine-color-default-border)", flexShrink: 0, overflowY: "auto" }}
      >
        <BehaviorLintPanel results={lintResults} />
      </Box>
    </Group>
  );
}
