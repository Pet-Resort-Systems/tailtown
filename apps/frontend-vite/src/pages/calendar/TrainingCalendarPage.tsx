import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import SpecializedCalendar from '../../components/calendar/SpecializedCalendar';
import UpcomingClasses from '../../components/dashboard/UpcomingClasses';
import { ServiceCategory } from '../../types/service';

/**
 * Training Calendar Page Component
 * 
 * Displays a calendar view filtered to show only training service reservations.
 * Uses the SpecializedCalendar component with fixed time formatting.
 * 
 * Note: Class management has been moved to Admin section to prevent accidental
 * schedule modifications by staff. Access via Admin > Training Classes.
 */
const TrainingCalendarPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Training Calendar
        </Typography>
      </Box>

      {/* Upcoming Classes Widget */}
      <Box sx={{ mb: 3 }}>
        <UpcomingClasses />
      </Box>

      <SpecializedCalendar 
        serviceCategories={[ServiceCategory.TRAINING]} 
        calendarTitle="Training Calendar"
      />
    </Container>
  );
};

export default TrainingCalendarPage;
