import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function UserModal({ user, onClose, onSave }) {
  const editing = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
    password: '',
  });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const payload = { username: form.username, email: form.email, role: form.role };
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
          <div className="form-group"><label>Username *</label><input value={form.username} onChange={f('username')} required disabled={editing} /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={f('role')}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
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
  const openAdd = () => { setEditingUser(null); setShowModal(true); };

  const roleBadge = (role) => {
    const colors = { admin: '#ef4444', editor: '#f59e0b', viewer: '#6366f1' };
    return <span className="role-badge" style={{ background: colors[role] || '#64748b' }}>{role}</span>;
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">Manage portal access and roles</p>
        </div>
        {me?.role === 'admin' && <button className="btn-primary" onClick={openAdd}>+ Add User</button>}
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              {me?.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.username}</strong>
                  {u.id === me?.id && <span className="you-badge"> (you)</span>}
                </td>
                <td>{u.email || '—'}</td>
                <td>{roleBadge(u.role)}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                {me?.role === 'admin' && (
                  <td>
                    <div className="action-btns">
                      <button className="btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      {u.id !== me.id && (
                        <button className="btn-sm danger" onClick={() => handleDelete(u.id)}>Delete</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserModal user={editingUser} onClose={() => { setShowModal(false); setEditingUser(null); }} onSave={handleSave} />
      )}
    </div>
  );
}
