import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import KennelCalendar from '../../components/calendar/KennelCalendar';

const CalendarPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 64px)', py: 2, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5">
          Boarding & Daycare Calendar
        </Typography>
      </Box>
      
      {/* Show the kennel grid calendar */}
      <Box sx={{ flexGrow: 1 }}>
        <KennelCalendar />
      </Box>
    </Container>
  );
};

export default CalendarPage;
