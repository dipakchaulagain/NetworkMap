# Project Progress Log

This document tracks the development progress of the NetworkMap project, from its initial implementation to the current stage.

## Phase 1: Foundation & Core Components
- **Framework Setup**: Initialized React project with Vite and `@xyflow/react` (formerly React Flow).
- **Custom Node Types**: 
  - Created `DeviceNode` with custom SVG icons for various networking equipment (Internet, Router, Switch, Firewall, Server, Network).
  - Implemented `GroupNode` for logical clustering of devices.
- **Layout Engine**: Integrated `dagre` to provide automatic hierarchical layout functionality.
- **Persistence Layer**: Implemented `localStorage` integration to auto-save and auto-load diagram states across sessions.

## Phase 2: Refined Routing & Positioning
- **Handle Positioning Fixes**: 
  - Corrected handle offsets in CSS to ensure they sit on the edge of node boundaries rather than inside the body.
  - Assigned unique IDs to all handles (`top`, `bottom`, `left`, `right`) for precise edge anchoring.
- **Orthogonal Edge Routing**:
  - Replaced standard Bézier curves with a custom orthogonal routing engine (`anchorUtils.js`).
  - Implemented obstacle avoidance logic that generates candidate paths and selects the shortest one that doesn't intersect node rectangles.
  - Added rounded corners to orthogonal paths for a premium visual aesthetic.

## Phase 3: Interactive Edge Manipulation
- **Draggable Edge Segments**:
  - Enhanced the custom `DraggableEdge` component to support manual adjustment of orthogonal segments.
  - Added invisible high-contrast grab handles that highlight on hover.
  - Implemented logic to drag segments horizontally or vertically, naturally extending or shrinking adjacent segments.
- **Coordinate Calibration**:
  - Fixed a bug where segment dragging was exponentially amplified due to redundant screen-to-flow coordinate translations.
  - Calibrated movement to a strict 1:1 ratio that respects the current viewport zoom level.

## Phase 4: Stability & Documentation
- **Ruggedization**:
  - Fixed "Invalid hook call" errors caused by illegal use of React hooks inside effect closures in `DraggableEdge.jsx`.
  - Added validation to prevent malformed SVG paths (NaN coordinates) during fast dragging operations.
- **Documentation**:
  - Created standard `README.md` and `progress.md` for project overview and tracking.

---
*Last Updated: 2026-03-13*
