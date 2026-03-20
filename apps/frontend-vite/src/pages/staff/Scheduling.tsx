import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { parse } from 'date-fns';
import { format, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { SelectChangeEvent } from '@mui/material';

import StaffScheduleCalendar from '../../components/staff/StaffScheduleCalendar';
import staffService, {
  Staff,
  StaffSchedule,
  ScheduleStatus,
} from '../../services/staffService';

// Create a simple PageHeader component since it doesn't exist yet
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  button?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, button }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        p: 2,
      }}
    >
      <div>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="subtitle1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </div>
      {button && <div>{button}</div>}
    </Box>
  );
};

const Scheduling: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkScheduleData, setBulkScheduleData] = useState({
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
    startTime: '09:00',
    endTime: '17:00',
    selectedStaff: [] as string[],
  });

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const staffData = await staffService.getAllStaff();
      setStaff(staffData);
      if (staffData.length > 0) {
        setSelectedStaffId(staffData[0].id || '');
      }
    } catch (err) {
      setError('Failed to load staff data. Please try again.');
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStaffChange = (event: SelectChangeEvent) => {
    setSelectedStaffId(event.target.value);
  };

  const handleBulkScheduleChange = (field: string, value: any) => {
    setBulkScheduleData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBulkStaffSelection = (event: SelectChangeEvent<string[]>) => {
    setBulkScheduleData((prev) => ({
      ...prev,
      selectedStaff: event.target.value as unknown as string[],
    }));
  };

  /**
   * Parse time string (HH:MM) to Date object for TimePicker
   * @param timeString Time string in 24-hour format (HH:mm)
   * @returns Date object representing the time
   */
  const parseTimeString = (timeString: string): Date => {
    try {
      return parse(timeString, 'HH:mm', new Date());
    } catch (error) {
      console.error('Error parsing time string:', error);
      return new Date(); // Return current time as fallback
    }
  };

  /**
   * Handle time picker changes and store in 24-hour format
   * @param field Field name in the form data (startTime or endTime)
   * @param time Selected time as Date object
   */
  const handleTimeChange = (field: string, time: Date | null): void => {
    if (time) {
      try {
        // Format time to 24-hour format for storage
        const formattedTime = format(time, 'HH:mm');
        setBulkScheduleData((prev) => ({ ...prev, [field]: formattedTime }));
      } catch (error) {
        console.error('Error formatting time:', error);
      }
    }
  };

  const handleCreateBulkSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate, startTime, endTime, selectedStaff } =
        bulkScheduleData;

      if (
        !startDate ||
        !endDate ||
        !startTime ||
        !endTime ||
        selectedStaff.length === 0
      ) {
        setError(
          'Please fill in all required fields and select at least one staff member.'
        );
        return;
      }

      // Generate schedules for each day in the date range for each selected staff member
      const schedules: Partial<StaffSchedule>[] = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        for (const staffId of selectedStaff) {
          schedules.push({
            staffId,
            date: format(currentDate, 'yyyy-MM-dd'),
            startTime,
            endTime,
            status: ScheduleStatus.SCHEDULED,
          });
        }
        currentDate = addDays(currentDate, 1);
      }

      await staffService.bulkCreateSchedules(schedules);
      setSuccess(`Successfully created ${schedules.length} schedule entries.`);

      // Reset form
      setBulkScheduleData({
        startDate: new Date(),
        endDate: addDays(new Date(), 7),
        startTime: '09:00',
        endTime: '17:00',
        selectedStaff: [],
      });
    } catch (err) {
      setError('Failed to create schedules. Please try again.');
      console.error('Error creating bulk schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Staff Scheduling"
        subtitle="Manage employee work schedules"
        button={
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/settings/users')}
          >
            Manage Staff
          </Button>
        }
      />

      <Paper sx={{ p: 0, mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All Staff Schedules" />
          <Tab label="Individual Staff Schedule" />
          <Tab label="Bulk Schedule Creation" />
        </Tabs>

        <Box p={3}>
          {tabValue === 0 && <StaffScheduleCalendar />}

          {tabValue === 1 && (
            <>
              <Box mb={3}>
                <FormControl fullWidth>
                  <InputLabel>Select Staff Member</InputLabel>
                  <Select
                    value={selectedStaffId}
                    onChange={handleStaffChange}
                    label="Select Staff Member"
                  >
                    {staff.map((staffMember) => (
                      <MenuItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.firstName} {staffMember.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {selectedStaffId && (
                <StaffScheduleCalendar staffId={selectedStaffId} />
              )}
            </>
          )}

          {tabValue === 2 && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Create Multiple Schedules
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Select Staff Members</InputLabel>
                      <Select
                        multiple
                        value={bulkScheduleData.selectedStaff}
                        onChange={handleBulkStaffSelection}
                        label="Select Staff Members"
                        renderValue={(selected) => {
                          const selectedStaffNames = (selected as string[])
                            .map((id) => {
                              const staffMember = staff.find(
                                (s) => s.id === id
                              );
                              return staffMember
                                ? `${staffMember.firstName} ${staffMember.lastName}`
                                : '';
                            })
                            .join(', ');
                          return selectedStaffNames;
                        }}
                      >
                        {staff.map((staffMember) => (
                          <MenuItem key={staffMember.id} value={staffMember.id}>
                            {staffMember.firstName} {staffMember.lastName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <DatePicker
                      label="Start Date"
                      value={bulkScheduleData.startDate}
                      onChange={(date) =>
                        handleBulkScheduleChange('startDate', date)
                      }
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <DatePicker
                      label="End Date"
                      value={bulkScheduleData.endDate}
                      onChange={(date) =>
                        handleBulkScheduleChange('endDate', date)
                      }
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TimePicker
                      label="Start Time"
                      value={parseTimeString(bulkScheduleData.startTime)}
                      onChange={(time) => handleTimeChange('startTime', time)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          placeholder: '9:00 AM',
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TimePicker
                      label="End Time"
                      value={parseTimeString(bulkScheduleData.endTime)}
                      onChange={(time) => handleTimeChange('endTime', time)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          placeholder: '5:00 PM',
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCreateBulkSchedules}
                      disabled={
                        loading || bulkScheduleData.selectedStaff.length === 0
                      }
                    >
                      Create Schedules
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </LocalizationProvider>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Scheduling;
