import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as TaskIcon,
  Pets as PetIcon,
  Schedule as ScheduleIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { BottomNav } from '../../components/mobile/BottomNav';
import mobileService, { DashboardData } from '../../services/mobileService';
import { useAuth } from '../../contexts/AuthContext';

const MobileDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await mobileService.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading && !dashboardData) {
    return (
      <Box>
        <MobileHeader title="Dashboard" showNotifications userName={user?.firstName} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error && !dashboardData) {
    return (
      <Box>
        <MobileHeader title="Dashboard" showNotifications userName={user?.firstName} />
        <Box sx={{ p: 2 }}>
          <Alert severity="error" action={
            <Chip label="Retry" size="small" onClick={handleRefresh} />
          }>
            {error}
          </Alert>
        </Box>
      </Box>
    );
  }

  const stats = dashboardData?.stats || { petsInFacility: 0, tasksCompleted: 0, totalTasks: 0 };
  const todaySchedule = dashboardData?.todaySchedule || [];
  const pendingTasks = dashboardData?.pendingTasks || [];

  return (
    <Box>
      <MobileHeader
        title="Dashboard"
        showNotifications
        notificationCount={dashboardData?.unreadMessages || 0}
        userName={user?.firstName || 'Staff'}
      />

      <Box sx={{ p: 2, pb: 10 }}>
        {/* Pets in Facility - Compact Info */}
        <Box sx={{ mb: 2, px: 1, py: 1, bgcolor: 'background.paper', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PetIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Pets in Facility
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight="bold">
            {stats.petsInFacility}
          </Typography>
        </Box>

        {/* Tasks Progress */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TaskIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="subtitle2" fontWeight="bold">
                Tasks Progress
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                {stats.tasksCompleted}/{stats.totalTasks}
              </Typography>
              <Chip
                label={`${Math.round((stats.tasksCompleted / stats.totalTasks) * 100)}%`}
                size="small"
                color="warning"
              />
            </Box>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Today's Schedule
              </Typography>
            </Box>
            {todaySchedule.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No scheduled shifts today
              </Typography>
            ) : (
              <List disablePadding>
                {todaySchedule.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem 
                      disablePadding 
                      sx={{ py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => navigate('/mobile/schedule')}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                          {item.time.split(':')[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.title}
                        secondary={item.location}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <ChevronRightIcon fontSize="small" color="action" />
                    </ListItem>
                    {index < todaySchedule.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TaskIcon sx={{ mr: 1, color: 'error.main' }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Pending Tasks
              </Typography>
            </Box>
            {pendingTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No pending tasks
              </Typography>
            ) : (
              <List disablePadding>
                {pendingTasks.map((task, index) => (
                  <React.Fragment key={task.id}>
                    <ListItem 
                      disablePadding 
                      sx={{ py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => navigate('/mobile/checklists')}
                    >
                      <ListItemText
                        primary={task.title}
                        secondary={`${task.completed}/${task.total} completed`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Chip
                        label="View"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </ListItem>
                    {index < pendingTasks.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>

      <BottomNav 
        unreadMessages={dashboardData?.unreadMessages || 0}
        pendingTasks={pendingTasks.length}
      />
    </Box>
  );
};

export default MobileDashboard;
