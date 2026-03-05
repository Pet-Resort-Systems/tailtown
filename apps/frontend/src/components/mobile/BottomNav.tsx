import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
} from '@mui/material';
import {
  Home as HomeIcon,
  CheckCircle as ChecklistIcon,
  PhotoCamera as ReportCardIcon,
  Chat as ChatIcon,
  CalendarMonth as ScheduleIcon,
} from '@mui/icons-material';

interface BottomNavProps {
  unreadMessages?: number;
  pendingTasks?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  unreadMessages = 0,
  pendingTasks = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/mobile/checklists')) return 1;
    if (path.includes('/mobile/report-cards')) return 2;
    if (path.includes('/mobile/chat')) return 3;
    if (path.includes('/mobile/schedule')) return 4;
    return 0; // dashboard
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    const routes = [
      '/mobile/dashboard',
      '/mobile/checklists',
      '/mobile/report-cards',
      '/mobile/chat',
      '/mobile/schedule',
    ];
    navigate(routes[newValue]);
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderTop: 1,
        borderColor: 'divider',
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getActiveTab()}
        onChange={handleChange}
        showLabels
        sx={{
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 60,
            padding: '6px 12px 8px',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            marginTop: '4px',
          },
          '& .Mui-selected': {
            color: 'primary.main',
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          icon={<HomeIcon />}
        />
        <BottomNavigationAction
          label="Tasks"
          icon={
            <Badge badgeContent={pendingTasks} color="error" max={99}>
              <ChecklistIcon />
            </Badge>
          }
        />
        <BottomNavigationAction
          label="Reports"
          icon={<ReportCardIcon />}
        />
        <BottomNavigationAction
          label="Chat"
          icon={
            <Badge badgeContent={unreadMessages} color="error" max={99}>
              <ChatIcon />
            </Badge>
          }
        />
        <BottomNavigationAction
          label="Schedule"
          icon={<ScheduleIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
};
