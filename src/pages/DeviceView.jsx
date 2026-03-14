import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

const VENDOR_COLORS = {
  Cisco: '#1ba0d7', Huawei: '#cf0a2c', MikroTik: '#e04c1a',
  Arista: '#ffac00', 'TP-Link': '#4cc800', HP: '#0096d6',
  'HPE (Proliant)': '#01a982', Dell: '#007db8', Juniper: '#84b135',
  Netgear: '#6b1fa3', Ubiquiti: '#006fff', 'Extreme Networks': '#7c0037',
  'Brocade/Foundry': '#e01f2b', 'Alcatel-Lucent': '#009acd', Linux: '#f7c200',
  VMware: '#607078', 'Net-SNMP': '#6b7280', 'Net-SNMP (Linux)': '#6b7280',
};

function uptimeToString(ticks) {
  if (!ticks) return '—';
  const totalSecs = Math.floor(ticks / 100);
  const days    = Math.floor(totalSecs / 86400);
  const hours   = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs    = totalSecs % 60;
  if (days > 0)  return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function speedLabel(speedMbps, speedBps) {
  const mbps = speedMbps || (speedBps ? Math.round(speedBps / 1e6) : 0);
  if (!mbps) return '—';
  if (mbps >= 1000) return `${mbps / 1000} Gbps`;
  return `${mbps} Mbps`;
}

function StatusDot({ status }) {
  const color = status === 'up' ? '#22c55e' : status === 'down' ? '#ef4444' : '#94a3b8';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ color, fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>{status || 'unknown'}</span>
    </span>
  );
}

function AdminToggle({ status, saving, onClick }) {
  const isUp = status === 'up';
  return (
    <button
      className={`dv-admin-toggle ${isUp ? 'is-up' : 'is-down'}`}
      onClick={onClick}
      disabled={saving}
      title={`Admin status: ${status}. Click to toggle.`}
    >
      <span className="dv-admin-toggle-dot" />
      <span className="dv-admin-toggle-label">{saving ? '…' : (isUp ? 'Up' : 'Down')}</span>
    </button>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="dv-info-row">
      <span className="dv-info-label">{label}</span>
      <span className="dv-info-value">{value}</span>
    </div>
  );
}

export default function DeviceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [polling, setPolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ifFilter, setIfFilter] = useState('all');
  const [ifSearch, setIfSearch] = useState('');
  const [error, setError] = useState('');
  const [savingIdx, setSavingIdx] = useState(null);

  const fetchDevice = async () => {
    try {
      const res = await api.get(`/devices/${id}`);
      setDevice(res.data);
    } catch {
      setError('Device not found.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchDevice(); }, [id]);

  const handlePoll = async () => {
    setPolling(true);
    try {
      const res = await api.post(`/devices/${id}/poll`);
      setDevice(res.data);
    } catch (e) {
      console.error(e);
    }
    setPolling(false);
  };

  const handleToggleAdmin = async (realIdx) => {
    if (savingIdx !== null) return;
    setSavingIdx(realIdx);

    const updatedInterfaces = (device.interfaces || []).map((iface, i) => {
      if (i !== realIdx) return iface;
      const newAdmin = iface.adminStatus === 'up' ? 'down' : 'up';
      return { ...iface, adminStatus: newAdmin };
    });

    const optimistic = { ...device, interfaces: updatedInterfaces };
    setDevice(optimistic);

    try {
      const res = await api.put(`/devices/${id}`, { interfaces: updatedInterfaces });
      setDevice(res.data);
    } catch (e) {
      console.error(e);
      setDevice(device);
    }
    setSavingIdx(null);
  };

  if (loading) return <div className="page-loading">Loading device…</div>;
  if (error)   return <div className="page-loading" style={{ color: '#ef4444' }}>{error}</div>;
  if (!device) return null;

  const isSNMP = device.category === 'snmp';
  const vendorColor = VENDOR_COLORS[device.vendor] || '#6b7280';

  const interfacesWithIdx = (device.interfaces || []).map((iface, realIdx) => ({ ...iface, realIdx }));

  const filtered = interfacesWithIdx.filter((iface) => {
    const matchStatus = ifFilter === 'all' || iface.adminStatus === ifFilter;
    const matchSearch = !ifSearch
      || iface.name.toLowerCase().includes(ifSearch.toLowerCase())
      || (iface.alias || '').toLowerCase().includes(ifSearch.toLowerCase())
      || (iface.description || '').toLowerCase().includes(ifSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const upCount   = (device.interfaces || []).filter((i) => i.adminStatus === 'up').length;
  const downCount = (device.interfaces || []).filter((i) => i.adminStatus === 'down').length;

  return (
    <div className="page" style={{ overflow: 'auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-secondary" onClick={() => navigate('/devices')} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
            ← Back
          </button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {device.name}
              {device.vendor && (
                <span className="dv-vendor-badge" style={{ background: vendorColor }}>
                  {device.vendor}
                </span>
              )}
              {!isSNMP && (
                <span className="dv-vendor-badge" style={{ background: '#334155' }}>Custom Node</span>
              )}
            </h1>
            <p className="page-subtitle">
              {device.type} · {isSNMP ? 'SNMP Monitored' : 'Custom Node'}
              {device.location ? ` · ${device.location}` : ''}
            </p>
          </div>
        </div>
        {isSNMP && (
          <button className="btn-primary" onClick={handlePoll} disabled={polling}>
            {polling ? 'Polling…' : '⟳ Poll Now'}
          </button>
        )}
      </div>

      <div className="dv-grid">
        <div className="dv-card">
          <div className="dv-card-title">System Information</div>
          <div className="dv-info-rows">
            <InfoRow label="Device Name"  value={device.name} />
            <InfoRow label="Type"         value={device.type} />
            <InfoRow label="Category"     value={isSNMP ? 'SNMP Monitored' : 'Custom Node'} />
            <InfoRow label="Location"     value={device.location} />
            <InfoRow label="Description"  value={device.description} />
            {isSNMP && <>
              <InfoRow label="IP Address"   value={device.ip} />
              <InfoRow label="Community"    value={device.community} />
              <InfoRow label="SNMP Version" value={device.snmpVersion} />
              <InfoRow label="Vendor"       value={device.vendor} />
            </>}
          </div>
        </div>

        {isSNMP && (
          <div className="dv-card">
            <div className="dv-card-title">SNMP Data</div>
            <div className="dv-info-rows">
              <div className="dv-info-row">
                <span className="dv-info-label">Status</span>
                <span className="dv-info-value"><StatusDot status={device.status} /></span>
              </div>
              <InfoRow label="Sys Name"     value={device.sysName} />
              <InfoRow label="Sys Contact"  value={device.sysContact} />
              <InfoRow label="Sys Location" value={device.sysLocation} />
              <InfoRow label="Uptime"       value={uptimeToString(device.uptime)} />
              <InfoRow label="Last Polled"  value={device.lastPolled ? new Date(device.lastPolled).toLocaleString() : '—'} />
              {device.sysDescr && (
                <div className="dv-info-row dv-info-row--col">
                  <span className="dv-info-label">Sys Description</span>
                  <span className="dv-info-value dv-sysdescr">{device.sysDescr}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="dv-card dv-card--stat-row">
          <div className="dv-stat">
            <span className="dv-stat-value">{(device.interfaces || []).length}</span>
            <span className="dv-stat-label">Total Interfaces</span>
          </div>
          <div className="dv-stat">
            <span className="dv-stat-value" style={{ color: '#22c55e' }}>{upCount}</span>
            <span className="dv-stat-label">Admin Up</span>
          </div>
          <div className="dv-stat">
            <span className="dv-stat-value" style={{ color: '#ef4444' }}>{downCount}</span>
            <span className="dv-stat-label">Admin Down</span>
          </div>
        </div>
      </div>

      <div className="dv-section-title">
        Network Interfaces
        <span className="dv-if-count">{filtered.length} shown</span>
        {!isSNMP && (
          <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>
            — Click Admin status to toggle
          </span>
        )}
      </div>

      <div className="dv-if-toolbar">
        <input
          className="dv-if-search"
          placeholder="Search by name…"
          value={ifSearch}
          onChange={(e) => setIfSearch(e.target.value)}
        />
        <div className="tabs" style={{ margin: 0 }}>
          {['all', 'up', 'down'].map((f) => (
            <button key={f} className={`tab ${ifFilter === f ? 'active' : ''}`} onClick={() => setIfFilter(f)}>
              {f === 'all' ? 'All' : f === 'up' ? 'Admin Up' : 'Admin Down'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-card">
          <p>{(device.interfaces || []).length === 0
            ? isSNMP
              ? 'No interface data yet. Click "Poll Now" to fetch interfaces from the device.'
              : 'No interfaces defined.'
            : 'No interfaces match your filter.'
          }</p>
        </div>
      ) : (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {isSNMP && <th>#</th>}
                <th>Name</th>
                {isSNMP && <th>Alias / Description</th>}
                <th>Speed</th>
                <th>Type</th>
                {isSNMP && <th>MAC Address</th>}
                {isSNMP && <th>MTU</th>}
                <th>Admin Status</th>
                {isSNMP && <th>Oper Status</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((iface) => (
                <tr key={iface.realIdx}>
                  {isSNMP && <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{iface.index}</td>}
                  <td><strong>{iface.name}</strong></td>
                  {isSNMP && (
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {iface.alias || iface.description || '—'}
                    </td>
                  )}
                  <td>{speedLabel(iface.speedMbps, iface.speed)}</td>
                  <td>
                    <span className="dv-type-badge">{iface.type || iface.typeLabel || '—'}</span>
                  </td>
                  {isSNMP && (
                    <td><code style={{ fontSize: '0.78rem' }}>{iface.physAddr || '—'}</code></td>
                  )}
                  {isSNMP && (
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{iface.mtu || '—'}</td>
                  )}
                  <td>
                    {isSNMP ? (
                      <StatusDot status={iface.adminStatus} />
                    ) : (
                      <AdminToggle
                        status={iface.adminStatus}
                        saving={savingIdx === iface.realIdx}
                        onClick={() => handleToggleAdmin(iface.realIdx)}
                      />
                    )}
                  </td>
                  {isSNMP && (
                    <td><StatusDot status={iface.operStatus} /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
