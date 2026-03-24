import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from './layout';

const handleStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  background: '#30363d',
  border: '1px solid #484f58',
};

const hiddenHandle: React.CSSProperties = { opacity: 0, width: 0, height: 0 };

export function CustomNode({ data }: NodeProps) {
  const node = data.graphNode as GraphNode;
  const condition = data.condition as { description: string; reads: string[] } | undefined;
  const isView = node.type === 'view';
  const [showTooltip, setShowTooltip] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const typeLabel = node.type === 'signal'
    ? (node.origin === 'external' ? `${node.signalKind} (ext)` : node.signalKind)
    : node.type;

  // Extract preconditions/constraints from spec
  const guards = node.type === 'policy'
    ? node.spec.preconditions.map(p => ({ id: p.id, description: p.description, reads: p.reads }))
    : node.type === 'operation'
      ? node.spec.constraints.map(c => ({ id: c.id, description: c.description, reads: c.reads }))
      : [];
  const guardLabel = node.type === 'policy' ? 'Preconditions' : 'Constraints';
  const hasGuards = guards.length > 0;
  const isClickable = hasGuards || !!condition;

  if (isView) {
    return (
      <div style={{ textAlign: 'left', width: '100%', padding: '6px 10px' }}>
        <div style={{ fontSize: 8, opacity: 0.5, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          view
        </div>
        {node.infoPoints.map((ip) => (
          <div key={ip} style={{ fontSize: 10, lineHeight: '16px', opacity: 0.85 }}>
            {ip}
          </div>
        ))}
        <Handle type="target" position={Position.Left} style={hiddenHandle} />
        <Handle type="source" position={Position.Right} style={hiddenHandle} />
        <Handle type="target" position={Position.Top} id="top" style={hiddenHandle} />
        <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      </div>
    );
  }

  return (
    <div
      ref={nodeRef}
      onClick={isClickable ? (e) => { e.stopPropagation(); setShowTooltip(v => !v); } : undefined}
      style={{
        textAlign: 'center', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        cursor: isClickable ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <div style={{ fontSize: 8, opacity: 0.5, marginBottom: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {condition ? `${typeLabel} (if)` : typeLabel}
      </div>
      <div style={{ fontSize: 11 }}>
        {data.label as string}
      </div>

      {/* Guard count badge */}
      {hasGuards && (
        <div style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive-foreground))',
          fontSize: 10,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid hsl(var(--background))',
        }}>
          {guards.length}
        </div>
      )}

      {/* Tooltip: condition (for conditional signals) */}
      {showTooltip && condition && (
        <Tooltip onClose={() => setShowTooltip(false)} anchorRef={nodeRef}>
          <TooltipHeader>Condition</TooltipHeader>
          <TooltipBody>{condition.description}</TooltipBody>
          {condition.reads.length > 0 && (
            <TooltipReads reads={condition.reads} />
          )}
        </Tooltip>
      )}

      {/* Tooltip: preconditions/constraints (for decisions) */}
      {showTooltip && hasGuards && (
        <Tooltip onClose={() => setShowTooltip(false)} anchorRef={nodeRef}>
          <TooltipHeader>{guardLabel}</TooltipHeader>
          {guards.map(g => (
            <div key={g.id} style={{ marginBottom: 6 }}>
              <TooltipBody>{g.description}</TooltipBody>
              {g.reads.length > 0 && <TooltipReads reads={g.reads} />}
            </div>
          ))}
        </Tooltip>
      )}

      <Handle type="target" position={Position.Left} style={hiddenHandle} />
      <Handle type="source" position={Position.Right} style={hiddenHandle} />
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={hiddenHandle} />
    </div>
  );
}

// ── Tooltip sub-components ──────────────────────────────────

function Tooltip({ children, onClose, anchorRef }: { children: React.ReactNode; onClose: () => void; anchorRef: React.RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'fixed',
        bottom: window.innerHeight - pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        padding: '12px 16px',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 9999,
        textAlign: 'left',
        whiteSpace: 'normal',
        cursor: 'default',
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function TooltipHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: 'hsl(var(--muted-foreground))',
      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function TooltipBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: 'hsl(var(--foreground))', whiteSpace: 'normal' }}>
      {children}
    </div>
  );
}

function TooltipReads({ reads }: { reads: string[] }) {
  return (
    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {reads.map(r => (
        <span key={r} style={{
          fontSize: 10, fontFamily: 'monospace',
          padding: '1px 6px', borderRadius: 3,
          background: 'hsl(var(--h-info) / 0.1)',
          color: 'hsl(var(--h-info))',
        }}>
          {r}
        </span>
      ))}
    </div>
  );
}
