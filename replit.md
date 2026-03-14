# NetworkMap

A full-stack network management platform built with React + Vite (frontend) and Express.js (backend). Supports user authentication, SNMP device monitoring with multi-vendor detection, custom node inventory, network map visualization, role-based access control, and user management.

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
4. **Device View Page** (`/devices/:id`) — Per-device detail page with:
   - System info (IP, SNMP version, community, vendor with color badge)
   - SNMP data (sys name, contact, location, uptime, sysDescr)
   - Interface stats (total, up, down counts)
   - Full interface table (name, alias, speed, MAC, MTU, admin/oper status, type)
   - Searchable and filterable interface list
   - Poll Now button
5. **SNMP Multi-Vendor Detection** — Cisco, Huawei, MikroTik, Arista, TP-Link, HP, Dell, Juniper, Netgear, Ubiquiti, Extreme, Brocade, Alcatel-Lucent, H3C, VMware, Linux, Windows, and more
6. **Maps** — Two map types:
   - Static Map — drag-and-drop editor using react-flow icons
   - Active Map — inventory-linked, drag real devices, interface picker when creating links
7. **User Management** — Add/edit/delete portal users with roles (admin/editor/viewer) and full name field
8. **Role-Based Access Control**:
   - Admin: full access (devices, maps, users, settings)
   - Editor: devices + maps + settings, no user management
   - Viewer: read-only, no editing, no map editing
   - Sidebar automatically hides inaccessible links
   - Role badge color-coded in sidebar footer

## Role Permissions

| Page / Action    | Admin | Editor | Viewer |
|------------------|-------|--------|--------|
| Dashboard        | ✓     | ✓      | ✓      |
| Devices (view)   | ✓     | ✓      | ✓      |
| Device View      | ✓     | ✓      | ✓      |
| Maps (view)      | ✓     | ✓      | ✓      |
| Map editing      | ✓     | ✓      | ✗      |
| Settings         | ✓     | ✓      | ✗      |
| Users            | ✓     | ✗      | ✗      |

## Project Structure

```
server/
  index.js              - Express app, port 3001
  middleware/auth.js    - JWT auth + requireAdmin + requireEditor guards
  routes/auth.js        - Login/logout (returns fullName in user object)
  routes/users.js       - User CRUD (admin only), supports fullName field
  routes/devices.js     - Device CRUD + SNMP polling (GET /:id added)
  routes/maps.js        - Map CRUD
  routes/settings.js    - Platform settings (editor/admin write)
  utils/snmp.js         - net-snmp polling with multi-vendor detection, MAC, alias, MTU, highSpeed
  utils/storage.js      - JSON file read/write
  data/
    users.json          - User storage (with fullName field)
    devices.json        - Device inventory storage
    maps.json           - Map storage
    settings.json       - Platform settings

src/
  App.jsx               - BrowserRouter + role-based route definitions
  App.css               - Canvas/toolbar/node styles
  main.jsx              - Entry point
  index.css             - Global + layout + page + DeviceView styles
  api/client.js         - Axios instance with auth interceptor
  context/AuthContext.jsx
  components/
    Layout.jsx           - Sidebar with role-filtered nav + fullName + role color badge
    Toolbar.jsx          - Static map device toolbar
  pages/
    Login.jsx
    Dashboard.jsx
    Devices.jsx          - Device list with View button
    DeviceView.jsx       - Per-device SNMP detail page (NEW)
    Maps.jsx
    StaticMapEditor.jsx
    ActiveMapEditor.jsx
    Settings.jsx         - Admin/editor only
    UserManagement.jsx   - Admin only, fullName field added
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
- Full Name: `Administrator`

## Data Storage

All data is stored as JSON files in `server/data/`:
- `users.json` — portal login users (id, username, password, role, email, fullName, createdAt)
- `devices.json` — device inventory (includes vendor, sysContact, sysLocation, sysObjectID)
- `maps.json` — network maps (nodes + edges)
- `settings.json` — platform settings (snmpPollInterval)
