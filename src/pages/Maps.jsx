import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function NewMapModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('static');
  const [description, setDescription] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    await onCreate({ name, type, description });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Create New Map</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={submit} className="modal-form">
          <div className="form-group"><label>Map Name *</label><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Core Network" autoFocus /></div>
          <div className="form-group">
            <label>Map Type</label>
            <div className="map-type-selector">
              <label className={`map-type-option ${type === 'static' ? 'selected' : ''}`}>
                <input type="radio" name="type" value="static" checked={type === 'static'} onChange={() => setType('static')} />
                <div className="map-type-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="13" y="3" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="8" y="15" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="7" y1="9" x2="12" y2="15" stroke="currentColor" strokeWidth="1.3"/>
                    <line x1="17" y1="9" x2="12" y2="15" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                </div>
                <div>
                  <strong>Static Map</strong>
                  <p>Drag-and-drop diagram editor. Draw custom network topology maps.</p>
                </div>
              </label>
              <label className={`map-type-option ${type === 'active' ? 'selected' : ''}`}>
                <input type="radio" name="type" value="active" checked={type === 'active'} onChange={() => setType('active')} />
                <div className="map-type-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="#22c55e" strokeWidth="1.8"/>
                    <circle cx="4" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="20" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="4" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="20" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="6" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3"/>
                    <line x1="18" y1="6" x2="14" y2="10" stroke="currentColor" strokeWidth="1.3"/>
                    <line x1="6" y1="18" x2="10" y2="14" stroke="currentColor" strokeWidth="1.3"/>
                    <line x1="18" y1="18" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                </div>
                <div>
                  <strong>Active Map</strong>
                  <p>Inventory-linked map. Add real devices, connect with interface selection.</p>
                </div>
              </label>
            </div>
          </div>
          <div className="form-group"><label>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" /></div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Create Map</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Maps() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMaps = async () => {
    try {
      const res = await api.get('/maps');
      setMaps(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchMaps(); }, []);

  const handleCreate = async (data) => {
    const res = await api.post('/maps', data);
    setMaps((p) => [...p, res.data]);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this map?')) return;
    await api.delete(`/maps/${id}`);
    setMaps((p) => p.filter((m) => m.id !== id));
  };

  const openMap = (map) => {
    navigate(`/maps/${map.id}/${map.type}`);
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Network Maps</h1>
          <p className="page-subtitle">Visual network topology diagrams</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Map</button>
      </div>

      {maps.length === 0 ? (
        <div className="empty-card">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3, marginBottom: 16 }}>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="4" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="20" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="4" cy="19" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="20" cy="19" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="6" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="18" y1="6" x2="14" y2="10" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="6" y1="18" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="18" y1="18" x2="14" y2="14" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          <p>No maps yet. Create your first network map.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Create Map</button>
        </div>
      ) : (
        <div className="maps-grid">
          {maps.map((map) => (
            <div key={map.id} className="map-card" onClick={() => openMap(map)}>
              <div className="map-card-type-badge">{map.type}</div>
              <div className="map-card-icon">
                {map.type === 'active' ? (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="#22c55e" strokeWidth="1.8"/>
                    <circle cx="4" cy="5" r="2" stroke="#64748b" strokeWidth="1.5"/>
                    <circle cx="20" cy="5" r="2" stroke="#64748b" strokeWidth="1.5"/>
                    <circle cx="4" cy="19" r="2" stroke="#64748b" strokeWidth="1.5"/>
                    <circle cx="20" cy="19" r="2" stroke="#64748b" strokeWidth="1.5"/>
                    <line x1="6" y1="6" x2="10" y2="10" stroke="#64748b" strokeWidth="1.3"/>
                    <line x1="18" y1="6" x2="14" y2="10" stroke="#64748b" strokeWidth="1.3"/>
                    <line x1="6" y1="18" x2="10" y2="14" stroke="#64748b" strokeWidth="1.3"/>
                    <line x1="18" y1="18" x2="14" y2="14" stroke="#64748b" strokeWidth="1.3"/>
                  </svg>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="8" height="6" rx="1" stroke="#f59e0b" strokeWidth="1.5"/>
                    <rect x="13" y="3" width="8" height="6" rx="1" stroke="#64748b" strokeWidth="1.5"/>
                    <rect x="8" y="15" width="8" height="6" rx="1" stroke="#64748b" strokeWidth="1.5"/>
                    <line x1="7" y1="9" x2="12" y2="15" stroke="#64748b" strokeWidth="1.3"/>
                    <line x1="17" y1="9" x2="12" y2="15" stroke="#64748b" strokeWidth="1.3"/>
                  </svg>
                )}
              </div>
              <div className="map-card-info">
                <h3>{map.name}</h3>
                {map.description && <p>{map.description}</p>}
                <span className="map-card-date">{new Date(map.updatedAt || map.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="map-card-actions">
                <button className="btn-sm" onClick={() => openMap(map)}>Open</button>
                <button className="btn-sm danger" onClick={(e) => handleDelete(map.id, e)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewMapModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
