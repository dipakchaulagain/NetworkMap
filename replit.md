# NetworkMap

A React + Vite frontend application for visualizing network maps using React Flow (@xyflow/react) and Dagre for layout.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Graph Library**: @xyflow/react (React Flow)
- **Layout**: Dagre
- **Package Manager**: npm

## Project Structure

```
src/
  App.jsx          - Main app component
  App.css          - App styles
  main.jsx         - Entry point
  index.css        - Global styles
  assets/          - Static assets
  components/      - React components
  data/            - Data files
  edges/           - Edge type definitions
  icons/           - Icon components
  nodes/           - Node type definitions
  utils/           - Utility functions
```

## Development

The app runs on port 5000 via Vite dev server.

```
npm run dev    # Start dev server
npm run build  # Build for production
npm run lint   # Lint code
```

## Deployment

Configured as a static site deployment:
- Build command: `npm run build`
- Public directory: `dist`
