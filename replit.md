# NetworkMap

A full-stack network management platform built with React + Vite (frontend) and Express.js (backend). Supports user authentication, SNMP device monitoring, custom node inventory, network map visualization, and user management.

## Tech Stack

- **Frontend**: React 19, Vite 7, React Router v7, Axios
- **Backend**: Express.js (port 3001), JSON file storage
- **Graph Library**: @xyflow/react (React Flow v12)
- **Layout**: Dagre
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **SNMP**: net-snmp
- **Dev Runner**: concurrently (runs both frontend and backend)

## Features

1. **Login** — JWT-based auth, default: admin / admin123
2. **Dashboard** — SNMP device up/down counts, total device counts
3. **Device Inventory** — Two categories:
   - SNMP Devices (switches, routers, etc.) — polls live status + interfaces via SNMP
   - Custom Nodes (servers, etc.) — manually define interface count, name, speed, type (copper/fiber)
4. **Maps** — Two map types:
   - Static Map — drag-and-drop editor using react-flow icons
   - Active Map — inventory-linked, drag real devices, interface picker when creating links (like Packet Tracer)
5. **User Management** — Add/edit/delete portal users with roles (admin/editor/viewer)

## Project Structure

```
server/
  index.js              - Express app, port 3001
  middleware/auth.js    - JWT authentication middleware
  routes/auth.js        - Login/logout endpoints
  routes/users.js       - User CRUD
  routes/devices.js     - Device CRUD + SNMP polling
  routes/maps.js        - Map CRUD
  utils/snmp.js         - net-snmp polling helper
  utils/storage.js      - JSON file read/write
  data/
    users.json          - User storage
    devices.json        - Device inventory storage
    maps.json           - Map storage

src/
  App.jsx               - BrowserRouter + route definitions
  App.css               - Canvas/toolbar/node styles
  main.jsx              - Entry point
  index.css             - Global + layout + page styles
  api/client.js         - Axios instance with auth interceptor
  context/AuthContext.jsx
  components/
    Layout.jsx           - Sidebar navigation layout
    Toolbar.jsx          - Static map device toolbar
  pages/
    Login.jsx
    Dashboard.jsx
    Devices.jsx
    Maps.jsx
    StaticMapEditor.jsx
    ActiveMapEditor.jsx
    UserManagement.jsx
  nodes/                 - DeviceNode, GroupNode
  edges/                 - DraggableEdge
  icons/                 - SVG icon components
  utils/                 - layoutEngine, anchorUtils, router
  data/                  - sampleDiagram
```

## Development

```
npm run dev    # Starts both backend (port 3001) and Vite frontend (port 5000)
npm run build  # Build frontend for production
npm run lint   # Lint code
```

Vite proxies `/api/*` requests to `http://localhost:3001`.

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Data Storage

All data is stored as JSON files in `server/data/`:
- `users.json` — portal login users
- `devices.json` — device inventory
- `maps.json` — network maps (nodes + edges)
