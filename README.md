# NetworkMap

NetworkMap is a premium, interactive network diagramming platform built with React and `@xyflow/react`. It provides a powerful interface for visualizing complex network topologies with advanced orthogonal routing and manual segment adjustments.

## 🚀 Features

- **Custom Device Nodes**: Specialized nodes for Cloud/Internet, Routers, Switches, Firewalls, and Servers with high-quality icons.
- **Logical Grouping**: Organise nodes into containers for better structural clarity.
- **Advanced Orthogonal Routing**: Intelligent edge routing that automatically maneuvers around nodes to avoid visual intersections.
- **Interactive Segment Dragging**: Fine-tune your diagram by dragging straight segments of any connection horizontally or vertically.
- **Automatic Layout**: Integrated with `dagre` for one-click hierarchical layout adjustments.
- **Persistence**: Automatically saves your diagram to `localStorage`, ensuring your progress is never lost between refreshes.
- **Export/Import**: Easily save your work to JSON files or import existing configurations.

## 🛠️ Technology Stack

- **Framework**: React 18
- **Diagramming Library**: [@xyflow/react](https://reactflow.dev/) (V12+)
- **Layout Engine**: [Dagre](https://github.com/dagrejs/dagre)
- **Styling**: Vanilla CSS with modern HSL color palettes.
- **Build Tool**: Vite

## 📦 Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

### Production

```bash
# Build the application
npm run build
```

---
*Created as part of the NetworkMap Infrastructure Visualization project.*
