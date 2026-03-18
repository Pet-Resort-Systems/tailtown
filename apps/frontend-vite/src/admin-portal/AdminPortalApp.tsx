import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Box,
} from '@mui/material';
import theme from './theme';
import { AdminPortalAuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const TenantList = lazy(() => import('./pages/tenants/TenantList'));
const CreateTenant = lazy(() => import('./pages/tenants/CreateTenant'));
const TenantDetail = lazy(() => import('./pages/tenants/TenantDetail'));
const TenantEdit = lazy(() => import('./pages/tenants/TenantEdit'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));

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

const AdminPortalApp: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AdminPortalAuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route
              path=""
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="tenants"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TenantList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="tenants/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateTenant />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="tenants/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TenantDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="tenants/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TenantEdit />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Analytics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/admin-portal" replace />} />
          </Routes>
        </Suspense>
      </AdminPortalAuthProvider>
    </ThemeProvider>
  );
};

export default AdminPortalApp;
