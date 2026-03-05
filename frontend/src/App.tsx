import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import ClientPage from './pages/ClientPage'
import ProjectPage from './pages/ProjectPage'
import AnalysisPage from './pages/AnalysisPage'
import HelpPage from './pages/HelpPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/ProtectedRoute'
import { AppLayout } from './components/app/layout/AppLayout'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Protected routes wrapped in AppLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/:clientId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ClientPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/:clientId/:projectId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProjectPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/:clientId/:projectId/analyze"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AnalysisPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <HelpPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

<Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Backward-compat redirect */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}