import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
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
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2 21c0-4 3-7 7-7h4c4 0 7 3 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.role}</span>
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
