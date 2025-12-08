import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { lazy, Suspense } from 'react';
import WorkflowList from './components/WorkflowList';
import { ConfirmDialogProvider } from './components/ui/ConfirmDialog';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';
import { CreateOrganization } from './pages/CreateOrganization';
import { OrganizationSettings } from './pages/OrganizationSettings';

// Lazy load heavy components
const WorkflowEditor = lazy(() => import('./components/WorkflowEditor'));
const TemplateGallery = lazy(() => import('./pages/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const VersionControl = lazy(() => import('./pages/VersionControl').then(m => ({ default: m.VersionControl })));
const Notifications = lazy(() => import('./pages/Notifications'));

// Create QueryClient OUTSIDE component to prevent re-creation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <ConfirmDialogProvider>
            <BrowserRouter>
              <div className="flex flex-col h-full">
                <Navbar />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/auth/callback" element={<OAuthCallback />} />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <Home />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/workflows"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <WorkflowList />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/templates"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-hidden">
                          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                            <TemplateGallery />
                          </Suspense>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                            <Analytics />
                          </Suspense>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/alerts"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                            <Alerts />
                          </Suspense>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/monitoring"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                            <Monitoring />
                          </Suspense>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                            <Notifications />
                          </Suspense>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/organizations/new"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <CreateOrganization />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/organizations/:organizationId/settings"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 overflow-auto">
                          <OrganizationSettings />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/editor"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading editor...</div>}>
                            <WorkflowEditor />
                          </Suspense>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/editor/:id"
                    element={
                      <ProtectedRoute>
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading editor...</div>}>
                            <WorkflowEditor />
                          </Suspense>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/workflows/:workflowId/version-control"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                          <VersionControl />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </div>
            </BrowserRouter>
            <Toaster position="top-right" richColors />
          </ConfirmDialogProvider>
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
