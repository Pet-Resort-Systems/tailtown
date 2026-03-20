import React, { ReactNode, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { BottomNav } from '../components/mobile/BottomNav';
import mobileService from '../services/mobileService';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showBottomNav = true,
}) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);

  useEffect(() => {
    // Fetch counts for bottom nav badges
    const fetchCounts = async () => {
      try {
        const [messages, tasks] = await Promise.all([
          mobileService.getUnreadMessageCount(),
          mobileService.getPendingTasks(),
        ]);
        setUnreadMessages(messages);
        setPendingTasks(tasks.length);
      } catch (error) {
        console.error('Error fetching nav counts:', error);
      }
    };

    fetchCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pb: showBottomNav ? 8 : 0, // Add padding for bottom nav
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        }}
      >
        {children}
      </Box>

      {/* Bottom navigation */}
      {showBottomNav && (
        <BottomNav
          unreadMessages={unreadMessages}
          pendingTasks={pendingTasks}
        />
      )}
    </Box>
  );
};
