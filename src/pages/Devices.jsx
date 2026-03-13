import { useEffect, useState } from 'react';
import api from '../api/client';

const deviceTypeOptions = ['router', 'switch', 'firewall', 'server', 'accesspoint', 'other'];
const interfaceTypes = ['copper', 'fiber'];

function SnmpModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'router', ip: '', community: 'public', snmpVersion: 'v2c', location: '', description: '' });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    await onSave({ ...form, category: 'snmp' });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Add SNMP Device</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={submit} className="modal-form">
          <div className="form-row">
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={f('name')} required placeholder="e.g. Core-SW-01" /></div>
            <div className="form-group"><label>Type *</label>
              <select value={form.type} onChange={f('type')}>
                {deviceTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>IP Address *</label><input value={form.ip} onChange={f('ip')} required placeholder="192.168.1.1" /></div>
            <div className="form-group"><label>Community String</label><input value={form.community} onChange={f('community')} placeholder="public" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>SNMP Version</label>
              <select value={form.snmpVersion} onChange={f('snmpVersion')}>
                <option value="v1">v1</option>
                <option value="v2c">v2c</option>
              </select>
            </div>
            <div className="form-group"><label>Location</label><input value={form.location} onChange={f('location')} placeholder="e.g. Server Room A" /></div>
          </div>
          <div className="form-group"><label>Description</label><input value={form.description} onChange={f('description')} /></div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Device</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InterfaceRow({ iface, idx, onChange, onRemove }) {
  return (
    <div className="iface-row">
      <input placeholder="Name (e.g. eth0)" value={iface.name} onChange={(e) => onChange(idx, 'name', e.target.value)} />
      <input placeholder="Speed (Mbps)" type="number" value={iface.speed} onChange={(e) => onChange(idx, 'speed', e.target.value)} />
      <select value={iface.type} onChange={(e) => onChange(idx, 'type', e.target.value)}>
        {interfaceTypes.map((t) => <option key={t} value={t}>{t === 'copper' ? 'Copper (RJ45)' : 'Fiber (SFP)'}</option>)}
      </select>
      <button type="button" className="btn-icon danger" onClick={() => onRemove(idx)}>✕</button>
    </div>
  );
}

function CustomModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'server', location: '', description: '' });
  const [interfaces, setInterfaces] = useState([{ name: 'eth0', speed: '1000', type: 'copper' }]);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const addIface = () => setInterfaces((p) => [...p, { name: `eth${p.length}`, speed: '1000', type: 'copper' }]);
  const removeIface = (idx) => setInterfaces((p) => p.filter((_, i) => i !== idx));
  const changeIface = (idx, key, val) => setInterfaces((p) => p.map((x, i) => i === idx ? { ...x, [key]: val } : x));

  const submit = async (e) => {
    e.preventDefault();
    await onSave({ ...form, category: 'custom', interfaces: interfaces.map((x) => ({ ...x, speed: Number(x.speed), operStatus: 'up', adminStatus: 'up' })) });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Add Custom Node</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={submit} className="modal-form">
          <div className="form-row">
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={f('name')} required placeholder="e.g. App-Server-01" /></div>
            <div className="form-group"><label>Type *</label>
              <select value={form.type} onChange={f('type')}>
                {deviceTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Location</label><input value={form.location} onChange={f('location')} /></div>
            <div className="form-group"><label>Description</label><input value={form.description} onChange={f('description')} /></div>
          </div>
          <div className="form-group">
            <div className="iface-header">
              <label>Network Interfaces ({interfaces.length})</label>
              <button type="button" className="btn-sm" onClick={addIface}>+ Add Interface</button>
            </div>
            <div className="iface-list">
              {interfaces.map((iface, idx) => (
                <InterfaceRow key={idx} iface={iface} idx={idx} onChange={changeIface} onRemove={removeIface} />
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Node</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InterfacesPanel({ device, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{device.name} — Interfaces</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {(!device.interfaces || device.interfaces.length === 0) ? (
            <div className="empty-state">No interface data. {device.category === 'snmp' ? 'Try polling the device.' : ''}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {device.category === 'snmp' && <th>#</th>}
                  <th>Name</th>
                  <th>Speed</th>
                  <th>Type</th>
                  {device.category === 'snmp' && <><th>Admin</th><th>Oper</th></>}
                </tr>
              </thead>
              <tbody>
                {device.interfaces.map((iface, i) => (
                  <tr key={i}>
                    {device.category === 'snmp' && <td>{iface.index}</td>}
                    <td>{iface.name}</td>
                    <td>{iface.speed ? `${(iface.speed / 1e6).toFixed(0)} Mbps` : '—'}</td>
                    <td>{iface.type || '—'}</td>
                    {device.category === 'snmp' && (
                      <>
                        <td><span className={`status-badge status-${iface.adminStatus}`}>{iface.adminStatus}</span></td>
                        <td><span className={`status-badge status-${iface.operStatus}`}>{iface.operStatus}</span></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-actions"><button className="btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [tab, setTab] = useState('snmp');
  const [showSnmpModal, setShowSnmpModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [polling, setPolling] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleSave = async (data) => {
    const res = await api.post('/devices', data);
    setDevices((p) => [...p, res.data]);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this device?')) return;
    await api.delete(`/devices/${id}`);
    setDevices((p) => p.filter((d) => d.id !== id));
  };

  const handlePoll = async (device) => {
    setPolling((p) => ({ ...p, [device.id]: true }));
    try {
      const res = await api.post(`/devices/${device.id}/poll`);
      setDevices((p) => p.map((d) => d.id === device.id ? res.data : d));
    } catch (e) { console.error(e); }
    setPolling((p) => ({ ...p, [device.id]: false }));
  };

  const snmpDevices = devices.filter((d) => d.category === 'snmp');
  const customDevices = devices.filter((d) => d.category === 'custom');
  const displayed = tab === 'snmp' ? snmpDevices : customDevices;

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Device Inventory</h1>
          <p className="page-subtitle">Manage SNMP-monitored devices and custom nodes</p>
        </div>
        <div className="btn-group">
          <button className="btn-primary" onClick={() => tab === 'snmp' ? setShowSnmpModal(true) : setShowCustomModal(true)}>
            + Add {tab === 'snmp' ? 'SNMP Device' : 'Custom Node'}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'snmp' ? 'active' : ''}`} onClick={() => setTab('snmp')}>
          SNMP Devices ({snmpDevices.length})
        </button>
        <button className={`tab ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>
          Custom Nodes ({customDevices.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="empty-card">
          <p>No {tab === 'snmp' ? 'SNMP devices' : 'custom nodes'} added yet.</p>
          <button className="btn-primary" onClick={() => tab === 'snmp' ? setShowSnmpModal(true) : setShowCustomModal(true)}>
            Add {tab === 'snmp' ? 'SNMP Device' : 'Custom Node'}
          </button>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                {tab === 'snmp' && <><th>IP</th><th>SNMP Ver</th><th>Status</th><th>Last Polled</th></>}
                {tab === 'custom' && <th>Location</th>}
                <th>Interfaces</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.type}</td>
                  {tab === 'snmp' && (
                    <>
                      <td><code>{d.ip}</code></td>
                      <td>{d.snmpVersion}</td>
                      <td><span className={`status-badge status-${d.status}`}>{d.status}</span></td>
                      <td>{d.lastPolled ? new Date(d.lastPolled).toLocaleString() : '—'}</td>
                    </>
                  )}
                  {tab === 'custom' && <td>{d.location || '—'}</td>}
                  <td>
                    <button className="btn-link" onClick={() => setSelectedDevice(d)}>
                      {d.interfaces?.length ?? 0} ports
                    </button>
                  </td>
                  <td>
                    <div className="action-btns">
                      {tab === 'snmp' && (
                        <button className="btn-sm" onClick={() => handlePoll(d)} disabled={polling[d.id]}>
                          {polling[d.id] ? '…' : 'Poll'}
                        </button>
                      )}
                      <button className="btn-sm danger" onClick={() => handleDelete(d.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSnmpModal && <SnmpModal onClose={() => setShowSnmpModal(false)} onSave={handleSave} />}
      {showCustomModal && <CustomModal onClose={() => setShowCustomModal(false)} onSave={handleSave} />}
      {selectedDevice && <InterfacesPanel device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
    </div>
  );
}
