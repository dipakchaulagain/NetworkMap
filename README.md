# NetworkMap

A web-based network infrastructure visualization and monitoring platform. Create interactive network diagrams, monitor real-time device status via SNMP, and manage your entire network inventory from a single portal.

---

## Features

### Network Monitoring (SNMP)
- **Multi-vendor support**: Cisco, Huawei, MikroTik, TP-Link, Arista, Dell, HP, Juniper, Netgear, Ubiquiti, Extreme Networks, Alcatel-Lucent, Brocade/Foundry, H3C, Allied Telesis, VMware, and more
- **Automatic vendor detection** from SNMP `sysObjectID` enterprise prefixes and `sysDescr` keyword matching
- **Device polling**: Retrieve system info (name, description, location, contact, uptime) and full interface table per device
- **Interface details**: Name, alias, speed (Mbps/Gbps), MAC address, MTU, admin/oper status, interface type (ethernet, LAG, loopback, tunnel, virtual)
- **Bulk polling**: Poll all SNMP devices at once from the Devices page
- **Auto-polling**: Configurable interval for automatic status refresh on active maps (30s up to 30m)
- Supports SNMP **v1** and **v2c**

### Device View Page
Dedicated per-device view (`/devices/:id`) showing:
- System information panel (IP, community, SNMP version, vendor badge with color coding)
- SNMP data panel (sys name, contact, location, uptime, last polled, full sysDescr)
- Interface statistics summary (total, up count, down count)
- Full interface table with live search and status filter (All / Up / Down)
- Inline "Poll Now" button to refresh data on-demand

### Network Maps
- **Static Maps**: Manual drag-and-drop network diagrams with orthogonal edge routing
- **Active Maps**: Live diagrams that reflect real-time SNMP device status with animated polling
- Custom device nodes: Router, Switch, Firewall, Server, Access Point, Cloud, and more
- Group/zone nodes for logical segmentation
- Auto-layout using the Dagre engine
- Export maps as images (PNG)

### Device Inventory
- Manage SNMP-monitored devices and custom (non-SNMP) nodes in separate tabs
- Add, delete, and poll individual devices
- View interface list inline or navigate to the full device detail page

### User Management & Role-Based Access

| Role   | Permissions                                                                        |
|--------|------------------------------------------------------------------------------------|
| Admin  | Full access — manage devices, maps, users, and settings                            |
| Editor | Manage devices and maps, modify settings. Cannot manage users                      |
| Viewer | Read-only access to dashboard, devices, and maps. Cannot edit or configure         |

- **Users page**: Admin-only
- **Settings page**: Admin and Editor only
- **Map editing**: Admin and Editor only (Viewers are redirected to map list)
- Sidebar navigation automatically hides links the current user cannot access
- Role badge color-coded in the sidebar footer (red = Admin, amber = Editor, indigo = Viewer)

### Authentication
- JWT-based authentication (24-hour expiry)
- Bcrypt password hashing
- Per-user fields: username, full name, email, role

---

## Tech Stack

| Layer    | Technology                                               |
|----------|----------------------------------------------------------|
| Frontend | React 19, Vite, React Router v7, @xyflow/react, Dagre   |
| Backend  | Node.js, Express 5                                       |
| SNMP     | net-snmp                                                 |
| Auth     | jsonwebtoken, bcryptjs                                   |
| Storage  | JSON flat files (`server/data/`)                         |

---

## Project Structure

```
networkmap/
├── server/
│   ├── data/                  # JSON flat-file storage
│   │   ├── devices.json
│   │   ├── maps.json
│   │   ├── settings.json
│   │   └── users.json
│   ├── middleware/
│   │   └── auth.js            # JWT authentication & role guards
│   ├── routes/
│   │   ├── auth.js            # Login / logout
│   │   ├── devices.js         # Device CRUD + SNMP polling endpoints
│   │   ├── maps.js            # Map CRUD
│   │   ├── settings.js        # Platform settings (admin/editor only for writes)
│   │   └── users.js           # User management (admin only)
│   ├── utils/
│   │   ├── snmp.js            # SNMP polling logic & multi-vendor detection
│   │   └── storage.js         # JSON file read/write helpers
│   └── index.js               # Express app entry point (port 3001)
├── src/
│   ├── api/client.js          # Axios instance (attaches JWT token)
│   ├── components/
│   │   └── Layout.jsx         # Sidebar + role-filtered navigation
│   ├── context/
│   │   └── AuthContext.jsx    # Auth state, login/logout
│   ├── edges/                 # Custom React Flow draggable edge
│   ├── icons/                 # Device type SVG icons
│   ├── nodes/                 # Custom React Flow device/group nodes
│   ├── pages/
│   │   ├── Dashboard.jsx      # Overview stats and quick links
│   │   ├── Devices.jsx        # Device inventory list
│   │   ├── DeviceView.jsx     # Per-device SNMP detail page
│   │   ├── Login.jsx
│   │   ├── Maps.jsx           # Map list
│   │   ├── ActiveMapEditor.jsx
│   │   ├── StaticMapEditor.jsx
│   │   ├── Settings.jsx       # Platform settings (admin/editor)
│   │   └── UserManagement.jsx # User CRUD (admin only)
│   └── utils/                 # Layout engine, routing helpers
├── package.json
└── vite.config.js
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd networkmap

# Install all dependencies
npm install
```

### Running in Development

```bash
npm run dev
```

This starts both the Express API server (port **3001**) and the Vite dev server (port **5000**) concurrently using `concurrently`.

Open your browser at `http://localhost:5000`.

**Default credentials:**
- Username: `admin`
- Password: `admin123`

### Running Only the API Server

```bash
npm run server
```

### Building for Production

```bash
# 1. Build the React frontend
npm run build

# 2. Start the API server
npm run server
```

For a single-process production setup, configure Express to also serve the `dist/` folder by adding to `server/index.js`:

```js
import { join } from 'path';
// Add after routes:
app.use(express.static(join(__dirname, '../dist')));
app.get('*', (req, res) => res.sendFile(join(__dirname, '../dist/index.html')));
```

### Environment Variables

| Variable     | Default                      | Description                  |
|--------------|------------------------------|------------------------------|
| `JWT_SECRET` | `networkmap-secret-key-2024` | Secret for signing JWTs      |
| `PORT`       | `3001`                       | API server port               |

Set these in a `.env` file or your hosting provider's environment configuration.

---

## Deployment

### Replit
The project is pre-configured for Replit:
- `vite.config.js` sets `host: '0.0.0.0'` and `allowedHosts: true` for the proxied preview
- API proxy: Vite forwards `/api/*` requests to `http://localhost:3001`
- Start command: `npm run dev`

### VPS / Bare Metal

1. Build the frontend: `npm run build`
2. Configure a reverse proxy (Nginx / Caddy) to serve `dist/` and proxy `/api` to port 3001
3. Run the API with a process manager:

```bash
npm install -g pm2
pm2 start server/index.js --name networkmap-api
pm2 save && pm2 startup
```

**Example Nginx configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/networkmap/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker (example)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "server/index.js"]
```

> In Docker, also serve `dist/` from the Express server (see the production section above).

---

## SNMP Notes

- NetworkMap uses **SNMP v1/v2c** (community-string authentication)
- SNMPv3 is not currently supported
- The device must have SNMP enabled and accessible from the server's IP
- Standard MIBs used: **MIB-II** (`1.3.6.1.2.1`) — universally supported by all vendors
- Interface data: `ifTable` + `ifXTable` for high-speed interface counters
- Vendor detection: `sysObjectID` enterprise OID prefix matching + `sysDescr` keyword matching

### Supported Vendors

| Vendor              | Detection Method            |
|---------------------|-----------------------------|
| Cisco IOS / NX-OS   | sysObjectID + sysDescr      |
| Huawei VRP          | sysObjectID + sysDescr      |
| MikroTik RouterOS   | sysObjectID + sysDescr      |
| Arista EOS          | sysObjectID + sysDescr      |
| HP ProCurve/Comware | sysObjectID + sysDescr      |
| HPE ProLiant        | sysObjectID                 |
| Dell                | sysObjectID + sysDescr      |
| TP-Link             | sysObjectID + sysDescr      |
| Juniper JunOS       | sysObjectID + sysDescr      |
| Netgear             | sysObjectID                 |
| Ubiquiti / UniFi    | sysObjectID + sysDescr      |
| Extreme Networks    | sysObjectID + sysDescr      |
| Brocade / Foundry   | sysObjectID + sysDescr      |
| Alcatel-Lucent      | sysObjectID + sysDescr      |
| H3C                 | sysObjectID                 |
| Allied Telesis      | sysObjectID                 |
| VMware              | sysObjectID + sysDescr      |
| Linux (Net-SNMP)    | sysObjectID + sysDescr      |
| Windows SNMP        | sysDescr                    |

---

## Data Storage

All data is persisted as JSON files in `server/data/`. This is suitable for small to medium deployments. For larger environments, replace the storage helpers in `server/utils/storage.js` with a database adapter (PostgreSQL, SQLite, MongoDB, etc.).

---

## License

MIT
