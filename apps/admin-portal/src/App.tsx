import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const TenantList = lazy(() => import('./pages/tenants/TenantList'));
const CreateTenant = lazy(() => import('./pages/tenants/CreateTenant'));
const TenantDetail = lazy(() => import('./pages/tenants/TenantDetail'));
const TenantEdit = lazy(() => import('./pages/tenants/TenantEdit'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));

// Loading component
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Login Route (Public) */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/tenants"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TenantList />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/tenants/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CreateTenant />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/tenants/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TenantDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/tenants/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TenantEdit />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              {/* Redirect unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
