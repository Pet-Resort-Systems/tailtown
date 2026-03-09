/**
 * System Health Dashboard Component
 * 
 * Displays real-time system health metrics for super admin monitoring.
 * Auto-refreshes every 30 seconds to provide up-to-date status.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  CircularProgress,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Storage as DatabaseIcon,
  Memory as CacheIcon,
  Computer as SystemIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import api from '../../services/api';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    customer: ServiceHealth;
    reservation: ServiceHealth;
    database: DatabaseHealth;
    cache: CacheHealth;
  };
  system: SystemHealth;
  metrics: PerformanceMetrics;
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  uptime: number;
  lastCheck: string;
}

interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'degraded';
  activeConnections?: number;
  responseTime?: number;
}

interface CacheHealth {
  status: 'connected' | 'disconnected' | 'not_configured';
  hitRate?: number;
  memoryUsage?: string;
}

interface SystemHealth {
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  uptime: number;
  platform: string;
}

interface PerformanceMetrics {
  activeTenants: number;
  totalRequests?: number;
  averageResponseTime?: number;
}

const SystemHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchHealthMetrics = async () => {
    try {
      setError(null);
      const response = await api.get('/api/system/health');
      setHealth(response.data);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch health metrics');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'healthy':
      case 'up':
      case 'connected':
        return 'success';
      case 'degraded':
        return 'warning';
      default:
        return 'error';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
      case 'connected':
        return <HealthyIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <IconButton size="small" onClick={fetchHealthMetrics} sx={{ ml: 2 }}>
          <RefreshIcon />
        </IconButton>
      </Alert>
    );
  }

  if (!health) {
    return <Alert severity="info">No health data available</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            System Health Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={getStatusIcon(health.status || 'healthy')}
            label={(health.status || 'healthy').toUpperCase()}
            color={getStatusColor(health.status || 'healthy')}
            size="medium"
          />
          <Tooltip title="Refresh">
            <IconButton onClick={fetchHealthMetrics} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Services Status */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Customer Service */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(health.services.customer.status)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Customer Service
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{health.services.customer.status}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uptime: {formatUptime(health.services.customer.uptime)}
              </Typography>
              {health.services.customer.responseTime !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Response: {health.services.customer.responseTime}ms
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Reservation Service */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(health.services.reservation.status)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Reservation Service
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{health.services.reservation.status}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uptime: {formatUptime(health.services.reservation.uptime)}
              </Typography>
              {health.services.reservation.responseTime !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Response: {health.services.reservation.responseTime}ms
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Database */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DatabaseIcon color={getStatusColor(health.services.database.status)} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Database
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{health.services.database.status}</strong>
              </Typography>
              {health.services.database.activeConnections !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Connections: {health.services.database.activeConnections}
                </Typography>
              )}
              {health.services.database.responseTime !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Response: {health.services.database.responseTime}ms
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Cache */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CacheIcon color={getStatusColor(health.services.cache.status)} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Redis Cache
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{health.services.cache.status}</strong>
              </Typography>
              {health.services.cache.hitRate !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Hit Rate: {(health.services.cache.hitRate * 100).toFixed(1)}%
                </Typography>
              )}
              {health.services.cache.memoryUsage && (
                <Typography variant="body2" color="text.secondary">
                  Memory: {health.services.cache.memoryUsage}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Resources */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Memory Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SystemIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Memory Usage
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {health.system.memory.used} / {health.system.memory.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {health.system.memory.percentage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={health.system.memory.percentage}
                  color={health.system.memory.percentage > 80 ? 'error' : health.system.memory.percentage > 60 ? 'warning' : 'success'}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* CPU Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PerformanceIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  CPU Usage
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {health.system.cpu.cores} cores
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {health.system.cpu.usage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={health.system.cpu.usage}
                  color={health.system.cpu.usage > 80 ? 'error' : health.system.cpu.usage > 60 ? 'warning' : 'success'}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                System uptime: {formatUptime(health.system.uptime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Metrics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="h4" color="primary.main">
                  {health.metrics.activeTenants}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Tenants
                </Typography>
              </Box>
            </Grid>
            {health.metrics.totalRequests !== undefined && (
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="success.main">
                    {health.metrics.totalRequests.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Requests
                  </Typography>
                </Box>
              </Grid>
            )}
            {health.metrics.averageResponseTime !== undefined && (
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="info.main">
                    {health.metrics.averageResponseTime}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemHealthDashboard;
