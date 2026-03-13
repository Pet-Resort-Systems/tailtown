/**
 * Waitlist Page
 * 
 * Staff page for managing waitlist entries across all services
 */

import React from 'react';
import { Box, Container } from '@mui/material';
import WaitlistDashboard from '../../components/waitlist/WaitlistDashboard';

const Waitlist: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <WaitlistDashboard />
      </Box>
    </Container>
  );
};

export default Waitlist;
