import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const allNavItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: ['admin', 'editor', 'viewer'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    to: '/devices',
    label: 'Devices',
    roles: ['admin', 'editor', 'viewer'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
        <line x1="10" y1="9" x2="10" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="14" y1="9" x2="14" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="18" y1="9" x2="18" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/maps',
    label: 'Maps',
    roles: ['admin', 'editor', 'viewer'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="4" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="20" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="4" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="20" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="6" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="18" y1="6" x2="14" y2="10" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="6" y1="18" x2="10" y2="14" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="18" y1="18" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'Users',
    roles: ['admin'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2 21c0-4 3-7 7-7h4c4 0 7 3 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    roles: ['admin', 'editor'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
];

const ROLE_COLORS = { admin: '#ef4444', editor: '#f59e0b', viewer: '#6366f1' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = allNavItems.filter((item) => item.roles.includes(user?.role));
  const displayName = user?.fullName || user?.username || '';
  const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="#f59e0b" strokeWidth="2"/>
            <circle cx="4" cy="6" r="2" stroke="#f59e0b" strokeWidth="1.5"/>
            <circle cx="20" cy="6" r="2" stroke="#f59e0b" strokeWidth="1.5"/>
            <circle cx="4" cy="18" r="2" stroke="#f59e0b" strokeWidth="1.5"/>
            <circle cx="20" cy="18" r="2" stroke="#f59e0b" strokeWidth="1.5"/>
            <line x1="6" y1="7" x2="10" y2="10" stroke="#f59e0b" strokeWidth="1.2"/>
            <line x1="18" y1="7" x2="14" y2="10" stroke="#f59e0b" strokeWidth="1.2"/>
            <line x1="6" y1="17" x2="10" y2="14" stroke="#f59e0b" strokeWidth="1.2"/>
            <line x1="18" y1="17" x2="14" y2="14" stroke="#f59e0b" strokeWidth="1.2"/>
          </svg>
          <span>NetworkMap</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials || user?.username?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{user?.fullName || user?.username}</span>
              <span className="user-role" style={{ color: ROLE_COLORS[user?.role] || '#94a3b8' }}>
                {user?.role}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
