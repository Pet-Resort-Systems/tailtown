/**
 * Tenant Status Manager Component
 *
 * Provides suspend, activate, delete, and restore functionality for tenants.
 * Only visible to super admins.
 */

import React, { useState } from 'react';
import { getApiBaseUrl } from '../../services/api';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Block as SuspendIcon,
  CheckCircle as ActivateIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface TenantStatusManagerProps {
  tenant: any;
  onStatusChange: () => void;
}

const TenantStatusManager: React.FC<TenantStatusManagerProps> = ({
  tenant,
  onStatusChange,
}) => {
  const navigate = useNavigate();
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [impersonateReason, setImpersonateReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use dynamic API URL based on environment
  const API_URL = getApiBaseUrl();
  const getAccessToken = () => localStorage.getItem('superAdminAccessToken');

  // Only show to super admins - check localStorage directly
  const isSuperAdmin = !!getAccessToken();

  if (!isSuperAdmin) {
    return null;
  }

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      setError('Suspension reason is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(
        `${API_URL}/api/super-admin/tenants/${tenant.id}/suspend`,
        { reason: suspendReason },
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        }
      );

      setSuspendDialogOpen(false);
      setSuspendReason('');
      onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to suspend tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.post(
        `${API_URL}/api/super-admin/tenants/${tenant.id}/activate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        }
      );

      onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.delete(`${API_URL}/api/super-admin/tenants/${tenant.id}`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        data: { reason: deleteReason },
      });

      setDeleteDialogOpen(false);
      setDeleteReason('');
      onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.post(
        `${API_URL}/api/super-admin/tenants/${tenant.id}/restore`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        }
      );

      onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to restore tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateReason.trim()) {
      setError('Reason for impersonation is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_URL}/api/super-admin/impersonate/${tenant.id}`,
        { reason: impersonateReason },
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        }
      );

      if (response.data.success) {
        const impersonationToken = response.data.data.impersonationToken;
        const session = response.data.data.session;

        // Store impersonation token and session info
        localStorage.setItem('impersonationToken', impersonationToken);
        localStorage.setItem('impersonationSession', JSON.stringify(session));

        // CRITICAL: Set the impersonation token as BOTH access tokens so all auth checks pass
        localStorage.setItem('accessToken', impersonationToken);
        localStorage.setItem('token', impersonationToken); // For AuthContext
        localStorage.setItem('tokenTimestamp', Date.now().toString()); // For AuthContext expiration check

        // CRITICAL: Set the tenant ID so API requests use the correct tenant
        if (session.subdomain) {
          localStorage.setItem('tailtown_tenant_id', session.subdomain);
          localStorage.setItem('tenantId', session.subdomain);
        }

        // CRITICAL: Create a temporary user object for AuthContext
        // This allows the impersonation session to pass auth checks
        const impersonatedUser = {
          id: 'impersonated-super-admin',
          email: session.superAdminEmail || 'super-admin',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
        };
        localStorage.setItem('user', JSON.stringify(impersonatedUser));

        // Clear ALL cached tenant-specific data to force fresh fetch
        // Clear business/tenant data
        localStorage.removeItem('businessLogo');
        localStorage.removeItem('businessName');
        localStorage.removeItem('businessSettings');

        // Clear any cached customer/pet data
        localStorage.removeItem('customer');
        localStorage.removeItem('customers');
        localStorage.removeItem('pets');

        // Clear any cached staff data (except the impersonated user we just set)
        localStorage.removeItem('staff');

        // Force complete page reload with cache busting to ensure fresh data
        // Use replace to avoid back button issues
        window.location.replace(`/dashboard?t=${Date.now()}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start impersonation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'DELETED':
        return 'error';
      case 'TRIAL':
        return 'info';
      default:
        return 'default';
    }
  };

  const isSuspended = tenant.status === 'PAUSED' || tenant.isPaused;
  const isDeleted = tenant.status === 'DELETED' || tenant.deletedAt;
  const isActive = tenant.status === 'ACTIVE' && tenant.isActive;

  return (
    <Box sx={{ display: 'inline-flex', gap: 0.25, alignItems: 'center' }}>
      {/* Status Chip */}
      <Chip
        label={tenant.status || 'ACTIVE'}
        color={getStatusColor(tenant.status)}
        size="small"
        sx={{ height: 20, fontSize: '0.7rem' }}
      />

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* Compact Action Buttons */}
      {(isActive || isSuspended) && !isDeleted && (
        <Tooltip title="Login as Tenant">
          <IconButton
            size="small"
            color="primary"
            onClick={() => setImpersonateDialogOpen(true)}
            disabled={loading}
            sx={{ p: 0.5 }}
          >
            <LoginIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      {isActive && (
        <Tooltip title="Suspend">
          <IconButton
            size="small"
            color="warning"
            onClick={() => setSuspendDialogOpen(true)}
            disabled={loading}
            sx={{ p: 0.5 }}
          >
            <SuspendIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      {isSuspended && !isDeleted && (
        <Tooltip title="Activate">
          <IconButton
            size="small"
            color="success"
            onClick={handleActivate}
            disabled={loading}
            sx={{ p: 0.5 }}
          >
            <ActivateIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      {!isDeleted && (
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading}
            sx={{ p: 0.5 }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      {isDeleted && (
        <Tooltip title="Restore">
          <IconButton
            size="small"
            color="success"
            onClick={handleRestore}
            disabled={loading}
            sx={{ p: 0.5 }}
          >
            <RestoreIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Suspend Dialog */}
      <Dialog
        open={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Suspend Tenant</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Suspending this tenant will prevent all users from accessing the
            system. The account can be reactivated at any time.
          </Typography>
          <TextField
            fullWidth
            label="Suspension Reason"
            multiline
            rows={3}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
            helperText="Required: Explain why this tenant is being suspended"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSuspend}
            color="warning"
            variant="contained"
            disabled={loading || !suspendReason.trim()}
          >
            {loading ? 'Suspending...' : 'Suspend Tenant'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is a soft delete. The tenant can be restored within 1 year.
            After 1 year, all data will be permanently deleted.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Tenant:</strong> {tenant.businessName}
          </Typography>
          <TextField
            fullWidth
            label="Deletion Reason (Optional)"
            multiline
            rows={3}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            helperText="Optional: Explain why this tenant is being deleted"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Tenant'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Impersonate Dialog */}
      <Dialog
        open={impersonateDialogOpen}
        onClose={() => setImpersonateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Login as Tenant</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You will be logged in as this tenant for support purposes. Session
            will automatically expire after 30 minutes.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Tenant:</strong> {tenant.businessName} ({tenant.subdomain})
          </Typography>
          <TextField
            fullWidth
            label="Reason for Impersonation"
            multiline
            rows={3}
            value={impersonateReason}
            onChange={(e) => setImpersonateReason(e.target.value)}
            required
            helperText="Required: Why are you logging in as this tenant?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpersonateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImpersonate}
            color="primary"
            variant="contained"
            disabled={loading || !impersonateReason.trim()}
            startIcon={<LoginIcon />}
          >
            {loading ? 'Starting Session...' : 'Login as Tenant'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantStatusManager;
