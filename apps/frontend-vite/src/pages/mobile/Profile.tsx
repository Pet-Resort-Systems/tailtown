import React from 'react';
import { Box, Typography } from '@mui/material';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { BottomNav } from '../../components/mobile/BottomNav';

const Profile: React.FC = () => {
  return (
    <Box>
      <MobileHeader title="Profile" showNotifications />
      <Box sx={{ p: 2, pb: 10 }}>
        <Typography variant="body1" color="text.secondary">
          Profile feature coming soon...
        </Typography>
      </Box>
      <BottomNav />
    </Box>
  );
};

export default Profile;
