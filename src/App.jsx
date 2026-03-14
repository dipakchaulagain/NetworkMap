import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceView from './pages/DeviceView';
import Maps from './pages/Maps';
import StaticMapEditor from './pages/StaticMapEditor';
import ActiveMapEditor from './pages/ActiveMapEditor';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import './App.css';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function ProtectedEditorRoute({ children, readOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (readOnly && user.role === 'viewer') return <Navigate to="/maps" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
      <Route path="/devices/:id" element={<ProtectedRoute><DeviceView /></ProtectedRoute>} />
      <Route path="/maps" element={<ProtectedRoute><Maps /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={['admin', 'editor']}><Settings /></ProtectedRoute>} />
      <Route path="/maps/:mapId/static" element={<ProtectedEditorRoute readOnly><StaticMapEditor /></ProtectedEditorRoute>} />
      <Route path="/maps/:mapId/active" element={<ProtectedEditorRoute readOnly><ActiveMapEditor /></ProtectedEditorRoute>} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
