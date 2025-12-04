import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import WorkflowEditor from './components/WorkflowEditor';
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
import { TemplateGallery } from './pages/TemplateGallery';

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
                          <TemplateGallery />
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
                        <WorkflowEditor />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/editor/:id"
                    element={
                      <ProtectedRoute>
                        <WorkflowEditor />
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
