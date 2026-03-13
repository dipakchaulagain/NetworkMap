/**
 * Anchor utilities for computing border positions on nodes.
 *
 * An anchor is { side: 'top'|'right'|'bottom'|'left', offset: 0..1 }
 * where offset is fractional position along that side (0 = start, 1 = end).
 */

/**
 * Get node rectangle in absolute flow coordinates.
 */
export function getNodeRect(node) {
  const x = node.internals?.positionAbsolute?.x ?? node.position?.x ?? 0;
  const y = node.internals?.positionAbsolute?.y ?? node.position?.y ?? 0;
  const width = node.measured?.width ?? node.width ?? 140;
  const height = node.measured?.height ?? node.height ?? 100;
  return { x, y, width, height };
}

/**
 * Convert an anchor to absolute pixel position on the node border.
 */
export function getAnchorPosition(node, anchor) {
  const { x, y, width, height } = getNodeRect(node);
  const { side = 'bottom', offset = 0.5 } = anchor || {};

  switch (side) {
    case 'top':
      return { x: x + width * offset, y };
    case 'bottom':
      return { x: x + width * offset, y: y + height };
    case 'left':
      return { x, y: y + height * offset };
    case 'right':
      return { x: x + width, y: y + height * offset };
    default:
      return { x: x + width * 0.5, y: y + height };
  }
}

/**
 * Find the nearest anchor on the node border from a point.
 */
export function getNearestAnchor(node, point) {
  const rect = getNodeRect(node);
  const { x, y, width, height } = rect;

  const candidates = [
    { side: 'top', offset: clamp((point.x - x) / width, 0, 1), dist: Math.abs(point.y - y) },
    { side: 'bottom', offset: clamp((point.x - x) / width, 0, 1), dist: Math.abs(point.y - (y + height)) },
    { side: 'left', offset: clamp((point.y - y) / height, 0, 1), dist: Math.abs(point.x - x) },
    { side: 'right', offset: clamp((point.y - y) / height, 0, 1), dist: Math.abs(point.x - (x + width)) },
  ];

  candidates.sort((a, b) => a.dist - b.dist);
  return { side: candidates[0].side, offset: candidates[0].offset };
}

/**
 * Compute an orthogonal SVG path between two anchors with rounded bends.
 * Routes around source/target node rects when needed.
 * Returns { path, waypoints } array.
 */
export function computeEdgePath(sourcePos, sourceSide, targetPos, targetSide, sourceRect, targetRect) {
  const sx = sourcePos.x;
  const sy = sourcePos.y;
  const tx = targetPos.x;
  const ty = targetPos.y;

  const ARM = 20;

  const sArm = getArmPoint(sx, sy, sourceSide, ARM);
  const tArm = getArmPoint(tx, ty, targetSide, ARM);

  const sRaw = rectToBounds(sourceRect, 2);
  const tRaw = rectToBounds(targetRect, 2);

  const waypoints = findBestPath(sx, sy, sArm, tArm, tx, ty, sRaw, tRaw);
  
  const pts = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) {
    const prev = pts[pts.length - 1];
    if (Math.abs(waypoints[i].x - prev.x) > 0.5 || Math.abs(waypoints[i].y - prev.y) > 0.5) {
      pts.push(waypoints[i]);
    }
  }

  return { path: buildRoundedPath(pts, 8), waypoints: pts };
}

// ──────────────────────────────────
// Routing strategies
// ──────────────────────────────────

function findBestPath(sx, sy, sArm, tArm, tx, ty, sRaw, tRaw) {
  const candidates = getOrthogonalCandidates(sx, sy, sArm, tArm, tx, ty, sRaw, tRaw);
  let bestSafe = null;
  let minSafeLen = Infinity;

  for (const path of candidates) {
    if (isPathSafe(path, sRaw, tRaw)) {
      const len = pathLength(path);
      if (len < minSafeLen) {
        minSafeLen = len;
        bestSafe = path;
      }
    }
  }

  return bestSafe || candidates[0];
}

function getOrthogonalCandidates(sx, sy, sArm, tArm, tx, ty, sRaw, tRaw) {
  const MARGIN = 15;
  const safeLeft = Math.min(sRaw.left, tRaw.left) - MARGIN;
  const safeRight = Math.max(sRaw.right, tRaw.right) + MARGIN;
  const safeTop = Math.min(sRaw.top, tRaw.top) - MARGIN;
  const safeBottom = Math.max(sRaw.bottom, tRaw.bottom) + MARGIN;

  const midX = (sArm.x + tArm.x) / 2;
  const midY = (sArm.y + tArm.y) / 2;

  const C = [
    // 1 elbow
    [ {x: sArm.x, y: tArm.y} ],
    [ {x: tArm.x, y: sArm.y} ],

    // 2 elbows (center)
    [ {x: sArm.x, y: midY}, {x: tArm.x, y: midY} ],
    [ {x: midX, y: sArm.y}, {x: midX, y: tArm.y} ],
    
    // 2 elbows (bounds)
    [ {x: sArm.x, y: safeTop}, {x: tArm.x, y: safeTop} ],
    [ {x: sArm.x, y: safeBottom}, {x: tArm.x, y: safeBottom} ],
    [ {x: safeLeft, y: sArm.y}, {x: safeLeft, y: tArm.y} ],
    [ {x: safeRight, y: sArm.y}, {x: safeRight, y: tArm.y} ],

    // 3 elbows
    [ {x: safeLeft, y: sArm.y}, {x: safeLeft, y: safeTop}, {x: tArm.x, y: safeTop} ],
    [ {x: safeLeft, y: sArm.y}, {x: safeLeft, y: safeBottom}, {x: tArm.x, y: safeBottom} ],
    [ {x: safeRight, y: sArm.y}, {x: safeRight, y: safeTop}, {x: tArm.x, y: safeTop} ],
    [ {x: safeRight, y: sArm.y}, {x: safeRight, y: safeBottom}, {x: tArm.x, y: safeBottom} ],
    [ {x: sArm.x, y: safeTop}, {x: safeLeft, y: safeTop}, {x: safeLeft, y: tArm.y} ],
    [ {x: sArm.x, y: safeBottom}, {x: safeLeft, y: safeBottom}, {x: safeLeft, y: tArm.y} ],
    [ {x: sArm.x, y: safeTop}, {x: safeRight, y: safeTop}, {x: safeRight, y: tArm.y} ],
    [ {x: sArm.x, y: safeBottom}, {x: safeRight, y: safeBottom}, {x: safeRight, y: tArm.y} ],
  ];

  return C.map(pts => [
    {x: sx, y: sy},
    {x: sArm.x, y: sArm.y},
    ...pts,
    {x: tArm.x, y: tArm.y},
    {x: tx, y: ty}
  ]);
}

function lineIntersectsRect(x1, y1, x2, y2, r) {
  const margin = 2; // small threshold
  const left = r.left - margin;
  const right = r.right + margin;
  const top = r.top - margin;
  const bottom = r.bottom + margin;

  if (Math.abs(x1 - x2) < 0.1) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return (x1 > left && x1 < right && minY < bottom && maxY > top);
  } else {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    return (y1 > top && y1 < bottom && minX < right && maxX > left);
  }
}

function isPathSafe(pts, r1, r2) {
  const lastSeg = pts.length - 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = pts[i].x;
    const y1 = pts[i].y;
    const x2 = pts[i+1].x;
    const y2 = pts[i+1].y;
    // i === 0 is the source arm — it always starts on the source node border, skip vs r1
    if (i !== 0 && lineIntersectsRect(x1, y1, x2, y2, r1)) return false;
    // i === lastSeg is the target arm — it always ends on the target node border, skip vs r2
    if (i !== lastSeg && lineIntersectsRect(x1, y1, x2, y2, r2)) return false;
  }
  return true;
}

function pathLength(pts) {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.abs(pts[i].x - pts[i+1].x) + Math.abs(pts[i].y - pts[i+1].y);
  }
  return len;
}

// ──────────────────────────────────
// Helpers
// ──────────────────────────────────

function rectToBounds(rect, margin = 0) {
  if (!rect) return { top: -9999, bottom: 9999, left: -9999, right: 9999 };
  return {
    top: rect.y - margin,
    bottom: rect.y + rect.height + margin,
    left: rect.x - margin,
    right: rect.x + rect.width + margin,
  };
}

function pointInsideBounds(x, y, bounds) {
  return x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom;
}

function getArmPoint(x, y, side, offset) {
  switch (side) {
    case 'top':    return { x, y: y - offset };
    case 'bottom': return { x, y: y + offset };
    case 'left':   return { x: x - offset, y };
    case 'right':  return { x: x + offset, y };
    default:       return { x, y: y + offset };
  }
}

export function buildRoundedPath(pts, radius) {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const dPrev = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    const dNext = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);

    const r = Math.min(radius, dPrev / 2, dNext / 2);

    const beforeX = curr.x - (r * (curr.x - prev.x)) / dPrev;
    const beforeY = curr.y - (r * (curr.y - prev.y)) / dPrev;
    const afterX = curr.x + (r * (next.x - curr.x)) / dNext;
    const afterY = curr.y + (r * (next.y - curr.y)) / dNext;

    d += ` L ${beforeX} ${beforeY}`;
    d += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}
