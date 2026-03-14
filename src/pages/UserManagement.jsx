import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function UserModal({ user, onClose, onSave }) {
  const editing = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
    password: '',
  });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const payload = { username: form.username, fullName: form.fullName, email: form.email, role: form.role };
    if (form.password) payload.password = form.password;
    await onSave(payload);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? 'Edit User' : 'Add User'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Username *</label>
              <input value={form.username} onChange={f('username')} required disabled={editing} placeholder="e.g. jsmith" />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input value={form.fullName} onChange={f('fullName')} placeholder="e.g. John Smith" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={f('email')} placeholder="user@example.com" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={f('role')}>
                <option value="admin">Admin — Full access</option>
                <option value="editor">Editor — Can edit maps &amp; settings</option>
                <option value="viewer">Viewer — Read-only access</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" value={form.password} onChange={f('password')} required={!editing} placeholder="••••••••" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save Changes' : 'Add User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_COLORS = { admin: '#ef4444', editor: '#f59e0b', viewer: '#6366f1' };
const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async (data) => {
    if (editingUser) {
      const res = await api.put(`/users/${editingUser.id}`, data);
      setUsers((p) => p.map((u) => u.id === editingUser.id ? res.data : u));
    } else {
      const res = await api.post('/users', data);
      setUsers((p) => [...p, res.data]);
    }
    setEditingUser(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    setUsers((p) => p.filter((u) => u.id !== id));
  };

  const openEdit = (user) => { setEditingUser(user); setShowModal(true); };
  const openAdd  = () => { setEditingUser(null); setShowModal(true); };

  const roleBadge = (role) => (
    <span className="role-badge" style={{ background: ROLE_COLORS[role] || '#64748b' }}>
      {ROLE_LABELS[role] || role}
    </span>
  );

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">Manage portal access and roles</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add User</button>
      </div>

      <div className="dv-card" style={{ marginBottom: 16, padding: '12px 20px' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { role: 'admin',  desc: 'Full access — manage all resources, users, and settings.' },
            { role: 'editor', desc: 'Can create and edit maps and modify settings. Cannot manage users.' },
            { role: 'viewer', desc: 'Read-only access to devices and maps. Cannot edit or configure.' },
          ].map(({ role, desc }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: '1 1 200px' }}>
              {roleBadge(role)}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.fullName || '—'}</strong>
                  {u.id === me?.id && <span className="you-badge"> (you)</span>}
                </td>
                <td><code style={{ fontSize: '0.85rem' }}>{u.username}</code></td>
                <td>{u.email || '—'}</td>
                <td>{roleBadge(u.role)}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn-sm" onClick={() => openEdit(u)}>Edit</button>
                    {u.id !== me.id && (
                      <button className="btn-sm danger" onClick={() => handleDelete(u.id)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
