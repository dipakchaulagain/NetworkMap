import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useReactFlow, useInternalNode } from '@xyflow/react';
import { getAnchorPosition, getNearestAnchor, computeEdgePath, getNodeRect, buildRoundedPath, cleanWaypoints } from '../utils/anchorUtils';
import { useMapMode } from '../context/MapModeContext';

const DEFAULT_SOURCE_ANCHOR = { side: 'bottom', offset: 0.5 };
const DEFAULT_TARGET_ANCHOR = { side: 'top', offset: 0.5 };

// ── Tooltip Portal ─────────────────────────────────────────────────────────
function EdgeTooltip({ mousePos, srcLabel, tgtLabel, srcIface, tgtIface, srcCategory, tgtCategory }) {
  const getStatus = (iface, category) => {
    if (!iface) return null;
    return category === 'snmp' ? iface.operStatus : iface.adminStatus;
  };

  const srcStatus = getStatus(srcIface, srcCategory);
  const tgtStatus = getStatus(tgtIface, tgtCategory);

  const statusColor = (s) =>
    s === 'up' ? '#22c55e' : s === 'down' ? '#ef4444' : '#94a3b8';

  const rows = [
    { label: srcLabel, iface: srcIface, status: srcStatus },
    { label: tgtLabel, iface: tgtIface, status: tgtStatus },
  ].filter((r) => r.label);

  if (rows.length === 0) return null;

  const style = {
    position: 'fixed',
    top: mousePos.y + 14,
    left: mousePos.x + 14,
    zIndex: 99999,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 14px',
    minWidth: 220,
    maxWidth: 320,
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    pointerEvents: 'none',
    fontFamily: 'inherit',
  };

  return ReactDOM.createPortal(
    <div style={style}>
      {rows.map((row, i) => (
        <div key={i}>
          {i > 0 && (
            <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.7rem', margin: '5px 0' }}>↕</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
              {row.label}
            </span>
            {row.status && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor(row.status), textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                ● {row.status}
              </span>
            )}
          </div>
          {row.iface ? (
            <div style={{ marginTop: 3 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#f59e0b' }}>
                {row.iface.name}
              </span>
              {(row.iface.alias || row.iface.description) && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 6 }}>
                  {row.iface.alias || row.iface.description}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>No interface assigned</div>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}

// ── DraggableEdge ──────────────────────────────────────────────────────────
const DraggableEdge = ({
  id,
  source,
  target,
  data,
  selected,
  markerEnd,
}) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const { mode, nodes } = useMapMode();
  const isViewOnly = mode === 'view';

  const [dragging, setDragging] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const dragStartRef = useRef(null);
  const svgRef = useRef(null);
  const prevSourcePos = useRef(null);
  const prevTargetPos = useRef(null);

  const sourceAnchor = data?.sourceAnchor || DEFAULT_SOURCE_ANCHOR;
  const targetAnchor = data?.targetAnchor || DEFAULT_TARGET_ANCHOR;

  const sourcePos = useMemo(
    () => (sourceNode ? getAnchorPosition(sourceNode, sourceAnchor) : null),
    [sourceNode, sourceAnchor]
  );
  const targetPos = useMemo(
    () => (targetNode ? getAnchorPosition(targetNode, targetAnchor) : null),
    [targetNode, targetAnchor]
  );

  const sourceRect = useMemo(
    () => (sourceNode ? getNodeRect(sourceNode) : null),
    [sourceNode]
  );
  const targetRect = useMemo(
    () => (targetNode ? getNodeRect(targetNode) : null),
    [targetNode]
  );

  const { path: defaultPath, waypoints: defaultWaypoints } = useMemo(
    () => {
      if (sourcePos && targetPos && sourceRect && targetRect) {
        return computeEdgePath(sourcePos, sourceAnchor.side, targetPos, targetAnchor.side, sourceRect, targetRect);
      }
      return { path: '', waypoints: [] };
    },
    [sourcePos, targetPos, sourceAnchor.side, targetAnchor.side, sourceRect, targetRect]
  );

  const waypoints = useMemo(() => {
    if (data?.customWaypoints?.length >= 2 && sourcePos && targetPos) {
      const cw = [...data.customWaypoints];
      cw[0] = { ...sourcePos };
      cw[cw.length - 1] = { ...targetPos };
      return cw;
    }
    return defaultWaypoints;
  }, [data?.customWaypoints, defaultWaypoints, sourcePos, targetPos]);

  const pathD = useMemo(() => {
    if (!waypoints || waypoints.length < 2) return '';
    return buildRoundedPath(waypoints, 8);
  }, [waypoints]);

  const labelPos = useMemo(() => {
    if (!waypoints || waypoints.length < 2) return null;
    const midIdx = Math.floor((waypoints.length - 1) / 2);
    const p1 = waypoints[midIdx];
    const p2 = waypoints[midIdx + 1] || waypoints[midIdx];
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }, [waypoints]);

  const [segmentDragging, setSegmentDragging] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const segmentDragStartRef = useRef(null);
  const initialWaypointsRef = useRef(null);

  useEffect(() => {
    if (!sourcePos || !targetPos) return;
    const prev  = prevSourcePos.current;
    const prevT = prevTargetPos.current;
    prevSourcePos.current = { x: sourcePos.x, y: sourcePos.y };
    prevTargetPos.current = { x: targetPos.x, y: targetPos.y };
    if (!prev || !prevT) return;
    if (dragging || segmentDragging !== null) return;

    const dxS = sourcePos.x - prev.x;
    const dyS = sourcePos.y - prev.y;
    const dxT = targetPos.x - prevT.x;
    const dyT = targetPos.y - prevT.y;

    if (Math.abs(dxS) < 0.5 && Math.abs(dyS) < 0.5 && Math.abs(dxT) < 0.5 && Math.abs(dyT) < 0.5) return;

    setEdges((eds) => eds.map((ed) => {
      if (ed.id !== id || !ed.data?.customWaypoints?.length) return ed;
      const cw = ed.data.customWaypoints;
      if (cw.length < 3) return ed;
      const sameDelta = Math.abs(dxS - dxT) < 1 && Math.abs(dyS - dyT) < 1;
      if (sameDelta) {
        const newWaypoints = cw.map((p, i) => {
          if (i === 0 || i === cw.length - 1) return p;
          return { x: p.x + dxS, y: p.y + dyS };
        });
        return { ...ed, data: { ...ed.data, customWaypoints: newWaypoints } };
      } else {
        return { ...ed, data: { ...ed.data, customWaypoints: null } };
      }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcePos?.x, sourcePos?.y, targetPos?.x, targetPos?.y, dragging, segmentDragging, id, setEdges]);

  const updateAnchor = useCallback(
    (endpoint, newAnchor) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== id) return e;
          const updatedData = { ...e.data };
          if (endpoint === 'source') updatedData.sourceAnchor = newAnchor;
          else updatedData.targetAnchor = newAnchor;
          delete updatedData.customWaypoints;
          return { ...e, data: updatedData };
        })
      );
    },
    [id, setEdges]
  );

  const handleMouseDown = useCallback(
    (endpoint) => (e) => {
      if (isViewOnly) return;
      e.stopPropagation();
      e.preventDefault();
      setDragging(endpoint);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [isViewOnly]
  );

  useEffect(() => {
    if (!dragging || isViewOnly) return;
    const node = dragging === 'source' ? sourceNode : targetNode;
    if (!node) return;

    const handleMouseMove = (e) => {
      const flowPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newAnchor = getNearestAnchor(node, flowPosition);
      updateAnchor(dragging, newAnchor);
    };
    const handleMouseUp = () => {
      setDragging(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, isViewOnly, sourceNode, targetNode, updateAnchor, screenToFlowPosition]);

  const { getViewport } = useReactFlow();

  useEffect(() => {
    if (segmentDragging === null || isViewOnly) return;

    const handleMouseMove = (e) => {
      if (!segmentDragStartRef.current || !initialWaypointsRef.current) return;
      const { zoom } = getViewport();
      const totalDx = (e.clientX - segmentDragStartRef.current.x) / zoom;
      const totalDy = (e.clientY - segmentDragStartRef.current.y) / zoom;

      setEdges((eds) => {
        const base = initialWaypointsRef.current;
        if (!base || base.length <= segmentDragging + 1) return eds;

        let pts = base.map(p => ({ ...p }));
        const p1 = pts[segmentDragging];
        const p2 = pts[segmentDragging + 1];
        const isHorizontal = Math.abs(p1.y - p2.y) < 0.5;
        const isSourceArm = segmentDragging === 0;
        const isTargetArm = segmentDragging === base.length - 2;

        if (isSourceArm) {
          const armIsVertical = Math.abs(p1.x - p2.x) < 0.5;
          if (armIsVertical) {
            if (Math.abs(totalDx) >= Math.abs(totalDy)) {
              pts[1] = { x: p1.x + totalDx, y: p2.y };
              if (Math.abs(totalDx) >= 0.5) pts.splice(1, 0, { x: p1.x + totalDx, y: p1.y });
            } else {
              pts[1] = { x: p1.x, y: p2.y + totalDy };
              if (pts.length > 2) pts[2] = { ...pts[2], y: p2.y + totalDy };
            }
          } else {
            if (Math.abs(totalDy) >= Math.abs(totalDx)) {
              pts[1] = { x: p2.x, y: p1.y + totalDy };
              if (Math.abs(totalDy) >= 0.5) pts.splice(1, 0, { x: p1.x, y: p1.y + totalDy });
            } else {
              pts[1] = { x: p2.x + totalDx, y: p1.y };
              if (pts.length > 2) pts[2] = { ...pts[2], x: p2.x + totalDx };
            }
          }
        } else if (isTargetArm) {
          const armIsVertical = Math.abs(p1.x - p2.x) < 0.5;
          const si = segmentDragging;
          if (armIsVertical) {
            if (Math.abs(totalDx) >= Math.abs(totalDy)) {
              pts[si] = { x: p2.x + totalDx, y: p1.y };
              if (Math.abs(totalDx) >= 0.5) pts.splice(si + 1, 0, { x: p2.x + totalDx, y: p2.y });
            } else {
              pts[si] = { x: p1.x, y: p1.y + totalDy };
              if (si > 0) pts[si - 1] = { ...pts[si - 1], y: p1.y + totalDy };
            }
          } else {
            if (Math.abs(totalDy) >= Math.abs(totalDx)) {
              pts[si] = { x: p1.x, y: p2.y + totalDy };
              if (Math.abs(totalDy) >= 0.5) pts.splice(si + 1, 0, { x: p2.x, y: p2.y + totalDy });
            } else {
              pts[si] = { x: p1.x + totalDx, y: p2.y };
              if (si > 0) pts[si - 1] = { ...pts[si - 1], x: p1.x + totalDx };
            }
          }
        } else {
          if (isHorizontal) {
            pts[segmentDragging]     = { ...p1, y: p1.y + totalDy };
            pts[segmentDragging + 1] = { ...p2, y: p2.y + totalDy };
          } else {
            pts[segmentDragging]     = { ...p1, x: p1.x + totalDx };
            pts[segmentDragging + 1] = { ...p2, x: p2.x + totalDx };
          }
        }

        pts = cleanWaypoints(pts);
        return eds.map(ed =>
          ed.id === id ? { ...ed, data: { ...ed.data, customWaypoints: pts } } : ed
        );
      });
    };
    const handleMouseUp = () => {
      setSegmentDragging(null);
      setHoveredSegment(null);
      segmentDragStartRef.current = null;
      initialWaypointsRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [segmentDragging, isViewOnly, id, setEdges, getViewport]);

  const handleSegmentMouseDown = useCallback(
    (index) => (e) => {
      if (isViewOnly) return;
      e.stopPropagation();
      e.preventDefault();
      setSegmentDragging(index);
      segmentDragStartRef.current = { x: e.clientX, y: e.clientY };
      initialWaypointsRef.current = waypoints.map(p => ({ ...p }));
    },
    [isViewOnly, waypoints]
  );

  if (!sourceNode || !targetNode || !sourcePos || !targetPos) return null;

  const handleRadius = 5;
  const handleHoverRadius = 7;

  const linkLabel = data?.linkLabel || (() => {
    const parts = [data?.sourceIface, data?.targetIface].filter(Boolean);
    return parts.length > 0 ? parts.join(' ↔ ') : null;
  })();

  const edgeColor = data?.color || (selected ? '#3b82f6' : '#94a3b8');

  // ── Tooltip data ─────────────────────────────────────────────────
  const srcNodeFull = nodes.find((n) => n.id === source);
  const tgtNodeFull = nodes.find((n) => n.id === target);
  const srcIfaceFull = srcNodeFull?.data?.interfaces?.find((i) => i.name === data?.sourceIface) || null;
  const tgtIfaceFull = tgtNodeFull?.data?.interfaces?.find((i) => i.name === data?.targetIface) || null;

  return (
    <g ref={svgRef} className="draggable-edge-group">
      {/* Invisible wider hit area — tracks hover for tooltip */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        className="edge-hit-area"
        onMouseEnter={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e)  => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={()  => setTooltipPos(null)}
      />

      {/* Visible edge path */}
      <path
        d={pathD}
        fill="none"
        stroke={edgeColor}
        strokeWidth={selected ? 2.5 : 2}
        className="edge-path-custom"
        markerEnd={markerEnd}
      />

      {/* Draggable segments — disabled in view mode */}
      {waypoints.map((pt, i) => {
        if (i === waypoints.length - 1) return null;
        const nextPt = waypoints[i + 1];
        const isHorizontal = Math.abs(pt.y - nextPt.y) < 0.5;
        const dist = Math.sqrt((pt.x - nextPt.x) ** 2 + (pt.y - nextPt.y) ** 2);
        if (dist < 5) return null;

        const isActive  = segmentDragging === i;
        const isHovered = hoveredSegment === i && segmentDragging === null;

        return (
          <g key={`segment-${i}`}>
            {(isActive || isHovered) && !isViewOnly && (
              <line
                x1={pt.x} y1={pt.y} x2={nextPt.x} y2={nextPt.y}
                stroke={isActive ? '#f59e0b' : 'rgba(59,130,246,0.5)'}
                strokeWidth={isActive ? 4 : 3}
                style={{ pointerEvents: 'none' }}
              />
            )}
            <line
              x1={pt.x} y1={pt.y} x2={nextPt.x} y2={nextPt.y}
              stroke="black"
              strokeOpacity={0.001}
              strokeWidth={14}
              style={{
                cursor: isViewOnly ? 'default' : (isHorizontal ? 'row-resize' : 'col-resize'),
                pointerEvents: 'stroke',
              }}
              onMouseDown={!isViewOnly ? handleSegmentMouseDown(i) : undefined}
              onMouseEnter={!isViewOnly ? () => setHoveredSegment(i) : undefined}
              onMouseLeave={!isViewOnly ? () => setHoveredSegment(null) : undefined}
            />
          </g>
        );
      })}

      {/* Interface link label */}
      {linkLabel && labelPos && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={labelPos.x - (linkLabel.length * 3.6) - 5}
            y={labelPos.y - 9}
            width={linkLabel.length * 7.2 + 10}
            height={18}
            rx={3}
            fill="#1e293b"
            fillOpacity={0.92}
            stroke="#334155"
            strokeWidth={0.5}
          />
          <text
            x={labelPos.x}
            y={labelPos.y + 4.5}
            textAnchor="middle"
            fontSize={10}
            fontFamily="'SFMono-Regular', Consolas, monospace"
            fill="#f59e0b"
          >
            {linkLabel}
          </text>
        </g>
      )}

      {/* Source endpoint handle — disabled in view mode */}
      <circle
        cx={sourcePos.x}
        cy={sourcePos.y}
        r={!isViewOnly && (dragging === 'source' || hovered === 'source') ? handleHoverRadius : handleRadius}
        className={`edge-endpoint ${dragging === 'source' ? 'dragging' : ''} ${hovered === 'source' ? 'hovered' : ''}`}
        fill={
          isViewOnly ? edgeColor
            : dragging === 'source' ? '#f59e0b'
            : hovered  === 'source' ? '#3b82f6'
            : selected               ? '#3b82f6'
            : '#94a3b8'
        }
        stroke="white"
        strokeWidth={2}
        onMouseDown={!isViewOnly ? handleMouseDown('source') : undefined}
        onMouseEnter={!isViewOnly ? () => setHovered('source') : undefined}
        onMouseLeave={!isViewOnly ? () => setHovered(null)    : undefined}
        style={{ cursor: isViewOnly ? 'default' : (dragging === 'source' ? 'grabbing' : 'grab') }}
      />

      {/* Target endpoint handle — disabled in view mode */}
      <circle
        cx={targetPos.x}
        cy={targetPos.y}
        r={!isViewOnly && (dragging === 'target' || hovered === 'target') ? handleHoverRadius : handleRadius}
        className={`edge-endpoint ${dragging === 'target' ? 'dragging' : ''} ${hovered === 'target' ? 'hovered' : ''}`}
        fill={
          isViewOnly ? edgeColor
            : dragging === 'target' ? '#f59e0b'
            : hovered  === 'target' ? '#3b82f6'
            : selected               ? '#3b82f6'
            : '#94a3b8'
        }
        stroke="white"
        strokeWidth={2}
        onMouseDown={!isViewOnly ? handleMouseDown('target') : undefined}
        onMouseEnter={!isViewOnly ? () => setHovered('target') : undefined}
        onMouseLeave={!isViewOnly ? () => setHovered(null)    : undefined}
        style={{ cursor: isViewOnly ? 'default' : (dragging === 'target' ? 'grabbing' : 'grab') }}
      />

      {/* Tooltip — shown on hover for all links */}
      {tooltipPos && (
        <EdgeTooltip
          mousePos={tooltipPos}
          srcLabel={srcNodeFull?.data?.label}
          tgtLabel={tgtNodeFull?.data?.label}
          srcIface={srcIfaceFull}
          tgtIface={tgtIfaceFull}
          srcCategory={srcNodeFull?.data?.category}
          tgtCategory={tgtNodeFull?.data?.category}
        />
      )}
    </g>
  );
};

export default DraggableEdge;
