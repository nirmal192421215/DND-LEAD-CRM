import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy load secondary pages for optimal initial bundle size and load speed
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const LeadDetailPage = lazy(() => import('./pages/LeadDetailPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));

function PageLoader() {
  return (
    <div className="flex-center" style={{ height: '60vh', width: '100%' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex-center" style={{ height: '100vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  useKeyboardShortcuts();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route
          path="leads"
          element={
            <Suspense fallback={<PageLoader />}>
              <LeadsPage />
            </Suspense>
          }
        />
        <Route
          path="leads/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <LeadDetailPage />
            </Suspense>
          }
        />
        <Route
          path="analytics"
          element={
            <Suspense fallback={<PageLoader />}>
              <AnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="team"
          element={
            <Suspense fallback={<PageLoader />}>
              <TeamPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
