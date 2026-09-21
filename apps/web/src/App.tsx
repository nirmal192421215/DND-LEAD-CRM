import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './lib/api';
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
const PublicProposalPage = lazy(() => import('./pages/PublicProposalPage'));

import CreativeLoader from './components/common/CreativeLoader';

function PageLoader() {
  return <CreativeLoader />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <CreativeLoader fullScreen />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  useKeyboardShortcuts();

  // Keep Render server awake while user is active on the CRM
  useEffect(() => {
    // Ping immediately on mount to wake up server
    api.get('/health').catch(() => {});

    // Ping every 4 minutes (Render free tier sleeps after 15 min of inactivity)
    const interval = setInterval(() => {
      api.get('/health').catch(() => {});
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/proposals/view/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <PublicProposalPage />
          </Suspense>
        }
      />
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
