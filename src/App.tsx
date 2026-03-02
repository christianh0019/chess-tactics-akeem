import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import SidebarLayout from './components/SidebarLayout';
import TacticsPage from './pages/TacticsPage';
import SettingsPage from './pages/SettingsPage';
import CreatorPage from './pages/CreatorPage';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

// Admin Route Wrapper
const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!user || !isAdmin) {
    return <Navigate to="/tactics" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<SidebarLayout />}>
              <Route index element={<Navigate to="/tactics" replace />} />
              <Route path="tactics" element={<TacticsPage />} />

              <Route element={<AdminRoute />}>
                <Route path="creator" element={<CreatorPage />} />
              </Route>

              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
