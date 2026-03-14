import { useState, useEffect } from 'react';
import api from '../api/client';

const INTERVAL_OPTIONS = [
  { label: 'Disabled', value: 0 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '30 minutes', value: 1800 },
];

export default function Settings() {
  const [settings, setSettings] = useState({ snmpPollInterval: 60 });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    api.get('/settings').then((r) => { setSettings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', settings);
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Platform configuration</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: 560 }}>
        <div className="settings-card">
          <div className="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <circle cx="4" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="20" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="4" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="20" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="6" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="18" y1="6" x2="14" y2="10" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="6" y1="18" x2="10" y2="14" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="18" y1="18" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            SNMP Monitoring
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <label>Auto-Poll Interval</label>
              <p>How often to automatically refresh SNMP device status on active maps.</p>
            </div>
            <select
              className="settings-select"
              value={settings.snmpPollInterval}
              onChange={(e) => setSettings({ ...settings, snmpPollInterval: Number(e.target.value) })}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span style={{ color: '#22c55e', fontSize: '.85rem', fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
