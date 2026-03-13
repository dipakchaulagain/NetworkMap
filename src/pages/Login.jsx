import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="4" cy="6" r="2" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="20" cy="6" r="2" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="4" cy="18" r="2" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="20" cy="18" r="2" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="6" y1="7" x2="10" y2="10" stroke="#f59e0b" strokeWidth="1.2" />
            <line x1="18" y1="7" x2="14" y2="10" stroke="#f59e0b" strokeWidth="1.2" />
            <line x1="6" y1="17" x2="10" y2="14" stroke="#f59e0b" strokeWidth="1.2" />
            <line x1="18" y1="17" x2="14" y2="14" stroke="#f59e0b" strokeWidth="1.2" />
          </svg>
          <h1>NetworkMap</h1>
          <p>Network Management Platform</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="login-hint">Default: admin / admin123</div>
      </div>
    </div>
  );
}
