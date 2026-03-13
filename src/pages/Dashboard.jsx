import { useEffect, useState } from 'react';
import api from '../api/client';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [maps, setMaps] = useState([]);
  const [polling, setPolling] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [dRes, mRes] = await Promise.all([api.get('/devices'), api.get('/maps')]);
      setDevices(dRes.data);
      setMaps(mRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePollAll = async () => {
    setPolling(true);
    try {
      const res = await api.post('/devices/poll-all');
      setDevices((prev) => prev.map((d) => {
        const updated = res.data.devices.find((u) => u.id === d.id);
        return updated || d;
      }));
    } catch (e) { console.error(e); }
    setPolling(false);
  };

  const snmp = devices.filter((d) => d.category === 'snmp');
  const custom = devices.filter((d) => d.category === 'custom');
  const up = snmp.filter((d) => d.status === 'up');
  const down = snmp.filter((d) => d.status === 'down');

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Network overview and device status</p>
        </div>
        <button className="btn-primary" onClick={handlePollAll} disabled={polling}>
          {polling ? 'Polling…' : 'Poll All SNMP Devices'}
        </button>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Devices" value={devices.length} sub={`${snmp.length} SNMP · ${custom.length} Custom`} color="#f59e0b" />
        <StatCard label="SNMP Devices Up" value={up.length} sub={`of ${snmp.length} monitored`} color="#22c55e" />
        <StatCard label="SNMP Devices Down" value={down.length} sub={down.length > 0 ? 'Attention needed' : 'All clear'} color={down.length > 0 ? '#ef4444' : '#64748b'} />
        <StatCard label="Network Maps" value={maps.length} sub={`${maps.filter((m) => m.type === 'active').length} active · ${maps.filter((m) => m.type === 'static').length} static`} color="#6366f1" />
      </div>

      <div className="dashboard-tables">
        <div className="table-card">
          <div className="table-card-header">
            <h2>SNMP Devices</h2>
          </div>
          {snmp.length === 0 ? (
            <div className="empty-state">No SNMP devices added yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>IP</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Last Polled</th>
                  <th>Interfaces</th>
                </tr>
              </thead>
              <tbody>
                {snmp.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td><code>{d.ip}</code></td>
                    <td>{d.type}</td>
                    <td>
                      <span className={`status-badge status-${d.status}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.lastPolled ? new Date(d.lastPolled).toLocaleString() : '—'}</td>
                    <td>{d.interfaces?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-card">
          <div className="table-card-header">
            <h2>Custom Nodes</h2>
          </div>
          {custom.length === 0 ? (
            <div className="empty-state">No custom nodes added yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Interfaces</th>
                </tr>
              </thead>
              <tbody>
                {custom.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.type}</td>
                    <td>{d.location || '—'}</td>
                    <td>{d.interfaces?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
