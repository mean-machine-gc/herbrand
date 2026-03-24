import type { NodeProps } from '@xyflow/react';

const LANE_COLORS: Record<string, string> = {
  human: '#f0883e',
  llm: '#a371f7',
  machine: '#79c0ff',
};

export function SwimlaneNode({ data }: NodeProps) {
  const color = LANE_COLORS[data.actorType as string] ?? '#8b949e';

  return (
    <div style={{
      width: data.width as number,
      height: data.height as number,
      background: `${color}08`,
      borderTop: `1px solid ${color}25`,
      borderBottom: `1px solid ${color}25`,
      borderRadius: 4,
      position: 'relative',
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        left: 10,
        top: 8,
        color,
        fontSize: 11,
        fontFamily: 'monospace',
        opacity: 0.6,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}>
        {data.label as string}
      </div>
    </div>
  );
}
