import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, GlobalStyles } from '@mui/material';
import SpecializedCalendar from '../../components/calendar/SpecializedCalendar';
import { ServiceCategory } from '../../types/service';
import staffService from '../../services/staffService';

/**
 * Grooming Calendar Page Component
 * 
 * Displays a calendar view filtered to show only grooming service reservations.
 * Includes a groomer selector to filter by specific groomer.
 * Uses the SpecializedCalendar component with fixed time formatting.
 */
const GroomingCalendarPage: React.FC = () => {
  const [groomers, setGroomers] = useState<any[]>([]);
  const [selectedGroomer, setSelectedGroomer] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Load groomers on mount
  useEffect(() => {
    const loadGroomers = async () => {
      try {
        const staffList = await staffService.getAllStaff();
        
        // Filter to only groomers (staff with GROOMING specialty)
        // specialties is an array of strings like ['GROOMING', 'TRAINING']
        const groomerList = staffList.filter((staff: any) => 
          staff.specialties?.includes('GROOMING')
        );
        
        console.log('Groomers found:', groomerList.map(g => `${g.firstName} ${g.lastName}`));
        setGroomers(groomerList);
      } catch (error) {
        console.error('Error loading groomers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadGroomers();
  }, []);

  const handleGroomerChange = (event: SelectChangeEvent<string>) => {
    setSelectedGroomer(event.target.value);
  };

  return (
    <>
      <GlobalStyles styles={{ body: { overflowX: 'hidden' } }} />
      <Container maxWidth="xl" sx={{ overflow: 'hidden' }}>
      <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'visible' }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          Grooming Calendar
        </Typography>
        <FormControl sx={{ minWidth: 200, maxWidth: 250 }}>
          <InputLabel id="groomer-select-label">Filter by Groomer</InputLabel>
          <Select
            labelId="groomer-select-label"
            id="groomer-select"
            value={selectedGroomer}
            label="Filter by Groomer"
            onChange={handleGroomerChange}
            disabled={loading}
            autoWidth={false}
            sx={{ overflow: 'hidden' }}
            MenuProps={{
              PaperProps: {
                sx: {
                  width: '250px !important',
                  maxWidth: '250px !important',
                },
              },
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
            }}
          >
            <MenuItem value="all">All Groomers</MenuItem>
            {groomers.map((groomer) => (
              <MenuItem key={groomer.id} value={groomer.id}>
                {groomer.firstName} {groomer.lastName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <SpecializedCalendar 
        serviceCategories={[ServiceCategory.GROOMING]} 
        calendarTitle="Grooming Calendar"
        staffId={selectedGroomer === 'all' ? undefined : selectedGroomer}
      />
    </Container>
    </>
  );
};

export default GroomingCalendarPage;
