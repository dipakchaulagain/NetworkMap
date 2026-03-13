import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useReactFlow, useInternalNode } from '@xyflow/react';
import { getAnchorPosition, getNearestAnchor, computeEdgePath, getNodeRect, buildRoundedPath } from '../utils/anchorUtils';

const DEFAULT_SOURCE_ANCHOR = { side: 'bottom', offset: 0.5 };
const DEFAULT_TARGET_ANCHOR = { side: 'top', offset: 0.5 };

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
  const [dragging, setDragging] = useState(null); // 'source' | 'target' | null
  const [hovered, setHovered] = useState(null); // 'source' | 'target' | null
  const dragStartRef = useRef(null);
  const svgRef = useRef(null);

  const sourceAnchor = data?.sourceAnchor || DEFAULT_SOURCE_ANCHOR;
  const targetAnchor = data?.targetAnchor || DEFAULT_TARGET_ANCHOR;

  // Compute positions (safe even if nodes are null — we'll guard in render)
  const sourcePos = useMemo(
    () => (sourceNode ? getAnchorPosition(sourceNode, sourceAnchor) : null),
    [sourceNode, sourceAnchor]
  );
  const targetPos = useMemo(
    () => (targetNode ? getAnchorPosition(targetNode, targetAnchor) : null),
    [targetNode, targetAnchor]
  );

  // Compute node rects for path avoidance
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

  // If we have custom waypoints, we should pin the first and last to the current anchors so it stays connected when nodes move.
  const waypoints = useMemo(() => {
    if (data?.customWaypoints?.length >= 2 && sourcePos && targetPos) {
      const cw = [...data.customWaypoints];
      // Keep first and last points attached to actual nodes
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

  const [segmentDragging, setSegmentDragging] = useState(null); // index of segment being dragged

  const updateAnchor = useCallback(
    (endpoint, newAnchor) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== id) return e;
          const updatedData = { ...e.data };
          if (endpoint === 'source') {
            updatedData.sourceAnchor = newAnchor;
          } else {
            updatedData.targetAnchor = newAnchor;
          }
          // Clear custom waypoints so the auto-router recalculates the full path
          delete updatedData.customWaypoints;
          return { ...e, data: updatedData };
        })
      );
    },
    [id, setEdges]
  );

  const handleMouseDown = useCallback(
    (endpoint) => (e) => {
      e.stopPropagation();
      e.preventDefault();
      setDragging(endpoint);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    const node = dragging === 'source' ? sourceNode : targetNode;
    if (!node) return;

    const handleMouseMove = (e) => {
      const flowPosition = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

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
  }, [dragging, sourceNode, targetNode, updateAnchor, screenToFlowPosition]);

  const { getViewport } = useReactFlow();

  // Segment dragging effect
  useEffect(() => {
    if (segmentDragging === null) return;

    const handleMouseMove = (e) => {
      // Always read current zoom so it stays accurate after zoom changes
      const { zoom } = getViewport();
      const dx = e.movementX / zoom;
      const dy = e.movementY / zoom;

      // Use setEdges functional updater to always operate on the latest edge state
      setEdges((eds) => {
        const targetEdge = eds.find(ed => ed.id === id);
        if (!targetEdge) return eds;

        const currentData = targetEdge.data || {};
        // Use saved customWaypoints if present, otherwise snapshot the auto-computed ones
        const base = currentData.customWaypoints?.length ? currentData.customWaypoints : waypoints;
        const newWaypoints = base.map(p => ({ ...p }));

        if (newWaypoints.length <= segmentDragging + 1) return eds;

        const p1 = newWaypoints[segmentDragging];
        const p2 = newWaypoints[segmentDragging + 1];
        const isHorizontal = Math.abs(p1.y - p2.y) < 0.5;

        if (isHorizontal) {
          // Move horizontal segment up/down; keep adjacent vertical segments connected
          p1.y += dy;
          p2.y += dy;
          if (segmentDragging > 0) {
            newWaypoints[segmentDragging - 1] = { ...newWaypoints[segmentDragging - 1], y: p1.y };
          }
          if (segmentDragging + 2 < newWaypoints.length) {
            newWaypoints[segmentDragging + 2] = { ...newWaypoints[segmentDragging + 2], y: p2.y };
          }
        } else {
          // Move vertical segment left/right; keep adjacent horizontal segments connected
          p1.x += dx;
          p2.x += dx;
          if (segmentDragging > 0) {
            newWaypoints[segmentDragging - 1] = { ...newWaypoints[segmentDragging - 1], x: p1.x };
          }
          if (segmentDragging + 2 < newWaypoints.length) {
            newWaypoints[segmentDragging + 2] = { ...newWaypoints[segmentDragging + 2], x: p2.x };
          }
        }

        return eds.map(ed =>
          ed.id === id ? { ...ed, data: { ...ed.data, customWaypoints: newWaypoints } } : ed
        );
      });
    };

    const handleMouseUp = () => {
      setSegmentDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [segmentDragging, id, setEdges, waypoints, getViewport]);

  const handleSegmentMouseDown = useCallback(
    (index) => (e) => {
      e.stopPropagation();
      e.preventDefault();
      setSegmentDragging(index);
    },
    []
  );

  // Guard render — all hooks are already called above
  if (!sourceNode || !targetNode || !sourcePos || !targetPos) return null;

  const handleRadius = 5;
  const handleHoverRadius = 7;

  return (
    <g ref={svgRef} className="draggable-edge-group">
      {/* Invisible wider hit area for selecting the edge */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        className="edge-hit-area"
      />

      {/* Visible edge path */}
      <path
        d={pathD}
        fill="none"
        stroke={selected ? '#3b82f6' : '#94a3b8'}
        strokeWidth={selected ? 2.5 : 2}
        className="edge-path-custom"
        markerEnd={markerEnd}
      />

      {/* Draggable segments */}
      {waypoints.map((pt, i) => {
        if (i === waypoints.length - 1) return null;
        const nextPt = waypoints[i + 1];
        const isHorizontal = Math.abs(pt.y - nextPt.y) < 0.1;
        
        // Don't render grab handle for zero-length segments
        const dist = Math.sqrt((pt.x - nextPt.x) ** 2 + (pt.y - nextPt.y) ** 2);
        if (dist < 5) return null;

        // Optionally, don't allow dragging the very first arm attached to the node 
        // if it might break the visual connection point, but for maximum flexibility we allow it here.
        
        return (
          <line
            key={`segment-${i}`}
            x1={pt.x}
            y1={pt.y}
            x2={nextPt.x}
            y2={nextPt.y}
            stroke={segmentDragging === i ? '#f59e0b' : 'transparent'}
            strokeWidth={12}
            className="edge-segment-grab"
            onMouseDown={handleSegmentMouseDown(i)}
            style={{
              cursor: isHorizontal ? 'row-resize' : 'col-resize',
              pointerEvents: 'stroke',
              transition: 'stroke 0.2s',
            }}
            onMouseEnter={(e) => {
              if (segmentDragging === null && !selected) e.target.style.stroke = 'rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              if (segmentDragging !== i) e.target.style.stroke = 'transparent';
            }}
          />
        );
      })}

      {/* Source endpoint handle */}
      <circle
        cx={sourcePos.x}
        cy={sourcePos.y}
        r={
          dragging === 'source' || hovered === 'source'
            ? handleHoverRadius
            : handleRadius
        }
        className={`edge-endpoint ${dragging === 'source' ? 'dragging' : ''} ${
          hovered === 'source' ? 'hovered' : ''
        }`}
        fill={
          dragging === 'source'
            ? '#f59e0b'
            : hovered === 'source'
            ? '#3b82f6'
            : selected
            ? '#3b82f6'
            : '#94a3b8'
        }
        stroke="white"
        strokeWidth={2}
        onMouseDown={handleMouseDown('source')}
        onMouseEnter={() => setHovered('source')}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: dragging === 'source' ? 'grabbing' : 'grab' }}
      />

      {/* Target endpoint handle */}
      <circle
        cx={targetPos.x}
        cy={targetPos.y}
        r={
          dragging === 'target' || hovered === 'target'
            ? handleHoverRadius
            : handleRadius
        }
        className={`edge-endpoint ${dragging === 'target' ? 'dragging' : ''} ${
          hovered === 'target' ? 'hovered' : ''
        }`}
        fill={
          dragging === 'target'
            ? '#f59e0b'
            : hovered === 'target'
            ? '#3b82f6'
            : selected
            ? '#3b82f6'
            : '#94a3b8'
        }
        stroke="white"
        strokeWidth={2}
        onMouseDown={handleMouseDown('target')}
        onMouseEnter={() => setHovered('target')}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: dragging === 'target' ? 'grabbing' : 'grab' }}
      />
    </g>
  );
};

export default DraggableEdge;
