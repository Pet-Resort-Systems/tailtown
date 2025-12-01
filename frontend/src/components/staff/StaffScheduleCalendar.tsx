import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  ArrowBackIos as ArrowBackIcon,
  ArrowForwardIos as ArrowForwardIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import staffService, { StaffSchedule, Staff, ScheduleStatus } from '../../services/staffService';
import StaffScheduleForm from './StaffScheduleForm';

interface StaffScheduleCalendarProps {
  staffId?: string; // If provided, show only schedules for this staff member
}

const StaffScheduleCalendar: React.FC<StaffScheduleCalendarProps> = ({ staffId }) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<StaffSchedule | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  const startDate = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const endDate = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  
  // Generate array of days for the week
  const days = useMemo(() => {
    const daysArray = [];
    let day = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      daysArray.push(new Date(day));
      day = addDays(day, 1);
    }
    
    return daysArray;
  }, [startDate]);
  
  // Fetch schedules for the current date range
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let fetchedSchedules;
      if (staffId) {
        fetchedSchedules = await staffService.getStaffSchedules(
          staffId,
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        );
      } else {
        fetchedSchedules = await staffService.getAllSchedules(
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        );
      }
      setSchedules(fetchedSchedules);
      
      // Fetch staff members
      if (staffId) {
        // For individual view, fetch just this staff member
        const staffMember = await staffService.getStaffById(staffId);
        if (staffMember) {
          setStaff([staffMember]);
        }
      } else {
        // For all staff view, fetch all staff
        const allStaff = await staffService.getAllStaff();
        // Sort staff alphabetically by last name, then first name
        const sortedStaff = allStaff.sort((a, b) => {
          if (a.lastName === b.lastName) {
            return a.firstName.localeCompare(b.firstName);
          }
          return a.lastName.localeCompare(b.lastName);
        });
        setStaff(sortedStaff);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [staffId, startDate, endDate]);
  
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);
  
  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };
  
  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  const handleAddSchedule = (staffMemberId?: string, day?: Date) => {
    setSelectedStaffId(staffMemberId || null);
    setSelectedDay(day || null);
    setSelectedSchedule(undefined);
    setIsEditing(false);
    setOpenForm(true);
  };
  
  const handleEditSchedule = (schedule: StaffSchedule) => {
    setSelectedSchedule(schedule);
    setIsEditing(true);
    setOpenForm(true);
  };
  
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await staffService.deleteStaffSchedule(scheduleId);
        fetchSchedules(); // Refresh schedules after deletion
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };
  
  const handleSaveSchedule = async (scheduleData: StaffSchedule) => {
    try {
      if (isEditing && selectedSchedule?.id) {
        await staffService.updateStaffSchedule(selectedSchedule.id, scheduleData);
      } else {
        const targetStaffId = staffId || scheduleData.staffId;
        if (targetStaffId) {
          await staffService.createStaffSchedule(targetStaffId, scheduleData);
        }
      }
      setOpenForm(false);
      fetchSchedules(); // Refresh schedules after save
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };
  
  const getScheduleColor = (status: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.SCHEDULED:
        return {
          light: theme.palette.info.light,
          main: theme.palette.info.main,
          dark: theme.palette.info.dark
        };
      case ScheduleStatus.CONFIRMED:
        return {
          light: theme.palette.success.light,
          main: theme.palette.success.main,
          dark: theme.palette.success.dark
        };
      case ScheduleStatus.IN_PROGRESS:
        return {
          light: theme.palette.warning.light,
          main: theme.palette.warning.main,
          dark: theme.palette.warning.dark
        };
      case ScheduleStatus.COMPLETED:
        return {
          light: theme.palette.success.light,
          main: theme.palette.success.main,
          dark: theme.palette.success.dark
        };
      case ScheduleStatus.CANCELLED:
        return {
          light: theme.palette.error.light,
          main: theme.palette.error.main,
          dark: theme.palette.error.dark
        };
      case ScheduleStatus.NO_SHOW:
        return {
          light: theme.palette.error.light,
          main: theme.palette.error.main,
          dark: theme.palette.error.dark
        };
      default:
        return {
          light: theme.palette.grey[200],
          main: theme.palette.grey[400],
          dark: theme.palette.grey[600]
        };
    }
  };
  
  // Function to get schedules for a specific staff member and day
  const getSchedulesForStaffAndDay = (staffId: string, day: Date) => {
    return schedules.filter(schedule => {
      // Parse date in local timezone to avoid timezone shift
      // schedule.date could be 'YYYY-MM-DD' or ISO string from database
      let scheduleDate: Date;
      
      if (typeof schedule.date === 'string') {
        if (schedule.date.includes('T')) {
          // ISO string format from database (e.g., "2025-11-01T00:00:00.000Z")
          // Extract just the date part and parse in local timezone
          const dateOnly = schedule.date.split('T')[0];
          const [year, month, dayOfMonth] = dateOnly.split('-').map(Number);
          scheduleDate = new Date(year, month - 1, dayOfMonth);
        } else {
          // Simple date string format (e.g., "2025-11-01")
          const [year, month, dayOfMonth] = schedule.date.split('-').map(Number);
          scheduleDate = new Date(year, month - 1, dayOfMonth);
        }
      } else {
        // Already a Date object
        scheduleDate = new Date(schedule.date);
      }
      
      return schedule.staffId === staffId && isSameDay(scheduleDate, day);
    });
  };

  /**
   * Convert 24-hour time string to 12-hour format with AM/PM, hiding minutes when they're zero
   * @param timeStr Time string in 24-hour format (HH:MM)
   * @returns Formatted time string in 12-hour format with AM/PM
   */
  const formatTo12Hour = (timeStr: string): string => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
      
      // Format: "1:30 PM" or just "1 PM" if minutes are 00
      return minutes === '00' ? 
        `${displayHour} ${period}` : 
        `${displayHour}:${minutes} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeStr; // Return original string if there's an error
    }
  };

  /**
   * Format the schedule time range for display in 12-hour format
   * @param schedule Staff schedule object
   * @returns Formatted time range string
   */
  const formatScheduleTime = (schedule: StaffSchedule) => {
    if (!schedule.startTime || !schedule.endTime) return '';
    
    const start = formatTo12Hour(schedule.startTime);
    const end = formatTo12Hour(schedule.endTime);
    
    return `${start} - ${end}`;
  };

  // Render the schedule cell content
  const renderScheduleCell = (staffMember: Staff, day: Date) => {
    const schedulesForDay = getSchedulesForStaffAndDay(staffMember.id || '', day);
    
    if (loading) {
      return <CircularProgress size={20} />;
    }
    
    if (schedulesForDay.length === 0) {
      return (
        <Box 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            minHeight: '40px',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
          onClick={() => handleAddSchedule(staffMember.id, day)}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>•</Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 0.5 }}>
        {schedulesForDay.map((schedule) => {
          const scheduleColor = getScheduleColor(schedule.status);
          
          return (
            <Box 
              key={schedule.id} 
              sx={{
                mb: 0.5,
                display: 'flex',
                flexDirection: 'column',
                p: 0.5,
                borderRadius: 1,
                bgcolor: scheduleColor.light,
                border: `1px solid ${scheduleColor.main}`,
                '&:last-child': { mb: 0 }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 'medium', color: scheduleColor.dark }}>
                  {formatScheduleTime(schedule)}
                </Typography>
                <Box>
                  <Tooltip title="Edit Schedule">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSchedule(schedule);
                      }}
                      sx={{ p: 0.25, mr: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Schedule">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(schedule.id || '');
                      }}
                      sx={{ p: 0.25 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              {schedule.startingLocation && (
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
                  🏁 Start: {schedule.startingLocation}
                </Typography>
              )}
              
              {schedule.location && (
                <Typography variant="caption" sx={{ display: 'block' }}>
                  📍 {schedule.location}
                </Typography>
              )}
              
              {schedule.role && (
                <Typography variant="caption" sx={{ display: 'block' }}>
                  👤 {schedule.role}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };
  
  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with title, navigation and add button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {staffId ? 'Staff Schedule' : 'All Staff Schedules'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleAddSchedule()}
            sx={{ mr: 2 }}
          >
            Add Schedule
          </Button>
          <IconButton onClick={handlePreviousWeek} size="small">
            <ArrowBackIcon />
          </IconButton>
          <IconButton onClick={handleToday} size="small" sx={{ mx: 0.5 }}>
            <TodayIcon />
          </IconButton>
          <Typography variant="subtitle2" component="span" sx={{ mx: 1 }}>
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </Typography>
          <IconButton onClick={handleNextWeek} size="small">
            <ArrowForwardIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Schedule Table */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 0.5 } }}>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      minWidth: 150, 
                      position: 'sticky', 
                      left: 0, 
                      zIndex: 3,
                      bgcolor: 'background.paper',
                      borderBottom: '2px solid rgba(224, 224, 224, 1)'
                    }}
                  >
                    Staff Member
                  </TableCell>
                  {days.map((day, index) => (
                    <TableCell 
                      key={index} 
                      align="center"
                      sx={{ 
                        minWidth: 120,
                        bgcolor: isToday(day) ? theme.palette.primary.light + '20' : 
                                 day.getDay() === 0 || day.getDay() === 6 ? '#f5f5f5' : 'background.paper',
                        fontWeight: isToday(day) ? 'bold' : 'normal',
                        color: isToday(day) ? theme.palette.primary.main : 'inherit',
                        borderBottom: '2px solid rgba(224, 224, 224, 1)'
                      }}
                    >
                      <Typography variant="body2">
                        {format(day, 'EEE')}
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {format(day, 'MMM d')}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {staff.map((staffMember) => (
                  <TableRow key={staffMember.id} hover>
                    <TableCell 
                      sx={{ 
                        position: 'sticky', 
                        left: 0, 
                        zIndex: 1,
                        bgcolor: 'background.paper',
                        borderRight: '1px solid rgba(224, 224, 224, 0.5)'
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {staffMember.lastName}, {staffMember.firstName}
                        {staffMember.position && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {staffMember.position}
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    {days.map((day, index) => (
                      <TableCell 
                        key={index}
                        sx={{ 
                          p: 0.5,
                          bgcolor: isToday(day) ? theme.palette.primary.light + '10' : 
                                   day.getDay() === 0 || day.getDay() === 6 ? '#f5f5f5' : 'inherit',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                        onClick={() => handleAddSchedule(staffMember.id, day)}
                      >
                        {renderScheduleCell(staffMember, day)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      
      {/* Schedule Form Dialog */}
      <StaffScheduleForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        staffId={staffId || selectedStaffId || undefined}
        schedule={selectedSchedule}
        onSave={handleSaveSchedule}
        isEditing={isEditing}
        allStaff={!staffId ? staff : undefined}
        initialDate={selectedDay || undefined}
        existingSchedules={schedules}
      />
    </Paper>
  );
};

export default StaffScheduleCalendar;
