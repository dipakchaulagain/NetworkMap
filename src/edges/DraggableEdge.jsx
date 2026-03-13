import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useReactFlow, useInternalNode } from '@xyflow/react';
import { getAnchorPosition, getNearestAnchor, computeEdgePath, getNodeRect, buildRoundedPath, cleanWaypoints } from '../utils/anchorUtils';

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
  const [hoveredSegment, setHoveredSegment] = useState(null); // index of segment being hovered
  const segmentDragStartRef = useRef(null);   // { x, y } in screen pixels at drag start
  const initialWaypointsRef = useRef(null);   // snapshot of waypoints at drag start

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
      if (!segmentDragStartRef.current || !initialWaypointsRef.current) return;

      const { zoom } = getViewport();
      // Use TOTAL delta from drag start (not incremental) so we always recompute cleanly
      const totalDx = (e.clientX - segmentDragStartRef.current.x) / zoom;
      const totalDy = (e.clientY - segmentDragStartRef.current.y) / zoom;

      setEdges((eds) => {
        const base = initialWaypointsRef.current;
        if (!base || base.length <= segmentDragging + 1) return eds;

        // Always start from the snapshotted initial waypoints
        let pts = base.map(p => ({ ...p }));
        const p1 = pts[segmentDragging];
        const p2 = pts[segmentDragging + 1];
        const isHorizontal = Math.abs(p1.y - p2.y) < 0.5;
        const isSourceArm = segmentDragging === 0;
        const isTargetArm = segmentDragging === base.length - 2;

        if (isSourceArm) {
          // p1 is pinned to the source node. To avoid diagonal lines, keep the arm
          // perpendicular to the node and insert a 90° bend for off-axis movement.
          const armIsVertical = Math.abs(p1.x - p2.x) < 0.5;
          if (armIsVertical) {
            // Arm exits source top/bottom. Extend by totalDy; add horizontal exit for totalDx.
            pts[1] = { x: p1.x + totalDx, y: p2.y + totalDy };
            if (Math.abs(totalDx) >= 0.5) {
              pts.splice(1, 0, { x: p1.x + totalDx, y: p1.y }); // bend at source level
            }
          } else {
            // Arm exits source left/right. Extend by totalDx; add vertical exit for totalDy.
            pts[1] = { x: p2.x + totalDx, y: p1.y + totalDy };
            if (Math.abs(totalDy) >= 0.5) {
              pts.splice(1, 0, { x: p1.x, y: p1.y + totalDy }); // bend at source level
            }
          }
        } else if (isTargetArm) {
          // p2 is pinned to the target node. Keep arm perpendicular; insert bend for off-axis.
          const armIsVertical = Math.abs(p1.x - p2.x) < 0.5;
          if (armIsVertical) {
            // Arm enters target top/bottom. Extend by totalDy; add horizontal exit for totalDx.
            pts[segmentDragging] = { x: p2.x + totalDx, y: p1.y + totalDy };
            if (Math.abs(totalDx) >= 0.5) {
              pts.splice(segmentDragging + 1, 0, { x: p2.x + totalDx, y: p2.y }); // bend at target level
            }
          } else {
            // Arm enters target left/right. Extend by totalDx; add vertical exit for totalDy.
            pts[segmentDragging] = { x: p1.x + totalDx, y: p2.y + totalDy };
            if (Math.abs(totalDy) >= 0.5) {
              pts.splice(segmentDragging + 1, 0, { x: p2.x, y: p2.y + totalDy }); // bend at target level
            }
          }
        } else {
          // Middle segment: slide the two endpoints in their constrained direction only.
          if (isHorizontal) {
            pts[segmentDragging]     = { ...p1, y: p1.y + totalDy };
            pts[segmentDragging + 1] = { ...p2, y: p2.y + totalDy };
          } else {
            pts[segmentDragging]     = { ...p1, x: p1.x + totalDx };
            pts[segmentDragging + 1] = { ...p2, x: p2.x + totalDx };
          }
        }

        // Remove collinear/duplicate waypoints so parallel segments are merged automatically
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
  }, [segmentDragging, id, setEdges, getViewport]);

  const handleSegmentMouseDown = useCallback(
    (index) => (e) => {
      e.stopPropagation();
      e.preventDefault();
      setSegmentDragging(index);
      segmentDragStartRef.current = { x: e.clientX, y: e.clientY };
      initialWaypointsRef.current = waypoints.map(p => ({ ...p }));
    },
    [waypoints]
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
        const isHorizontal = Math.abs(pt.y - nextPt.y) < 0.5;

        // Don't render grab handle for zero-length segments
        const dist = Math.sqrt((pt.x - nextPt.x) ** 2 + (pt.y - nextPt.y) ** 2);
        if (dist < 5) return null;

        const isActive = segmentDragging === i;
        const isHovered = hoveredSegment === i && segmentDragging === null;

        return (
          <g key={`segment-${i}`}>
            {/* Visible highlight — shown on hover or while dragging, rendered below hit area */}
            {(isActive || isHovered) && (
              <line
                x1={pt.x}
                y1={pt.y}
                x2={nextPt.x}
                y2={nextPt.y}
                stroke={isActive ? '#f59e0b' : 'rgba(59,130,246,0.5)'}
                strokeWidth={isActive ? 4 : 3}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* Wide hit area — uses a near-zero-opacity stroke so pointer-events fires reliably */}
            <line
              x1={pt.x}
              y1={pt.y}
              x2={nextPt.x}
              y2={nextPt.y}
              stroke="black"
              strokeOpacity={0.001}
              strokeWidth={14}
              style={{
                cursor: isHorizontal ? 'row-resize' : 'col-resize',
                pointerEvents: 'stroke',
              }}
              onMouseDown={handleSegmentMouseDown(i)}
              onMouseEnter={() => setHoveredSegment(i)}
              onMouseLeave={() => setHoveredSegment(null)}
            />
          </g>
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
