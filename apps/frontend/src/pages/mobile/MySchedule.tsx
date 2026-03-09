import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Today as TodayIcon,
  CalendarMonth as WeekIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { BottomNav } from '../../components/mobile/BottomNav';
import mobileService, { TodaySchedule } from '../../services/mobileService';

const MySchedule: React.FC = () => {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [schedule, setSchedule] = useState<TodaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchSchedule();
  }, [currentDate]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const data = await mobileService.getTodaySchedule();
      setSchedule(data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return 'primary';
      case 'IN_PROGRESS':
        return 'success';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTotalHours = () => {
    let total = 0;
    schedule.forEach(shift => {
      const start = parseTime(shift.startTime);
      const end = parseTime(shift.endTime);
      total += (end - start) / (1000 * 60 * 60);
    });
    return total.toFixed(1);
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };

  if (loading) {
    return (
      <Box>
        <MobileHeader title="My Schedule" showNotifications />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <MobileHeader title="My Schedule" showNotifications />
      
      {/* View Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <Tabs
          value={view}
          onChange={(_, newValue) => setView(newValue)}
          variant="fullWidth"
        >
          <Tab
            icon={<TodayIcon />}
            iconPosition="start"
            label="Day"
            value="day"
          />
          <Tab
            icon={<WeekIcon />}
            iconPosition="start"
            label="Week"
            value="week"
          />
        </Tabs>
      </Box>

      {/* Date Navigation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <IconButton onClick={handlePrevDay}>
          <PrevIcon />
        </IconButton>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            {formatDate(currentDate)}
          </Typography>
          <Chip
            label="Today"
            size="small"
            onClick={handleToday}
            sx={{ mt: 0.5 }}
          />
        </Box>
        <IconButton onClick={handleNextDay}>
          <NextIcon />
        </IconButton>
      </Box>

      {/* Schedule Summary */}
      <Card elevation={0} sx={{ m: 2, backgroundColor: 'primary.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {schedule.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Shifts
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {getTotalHours()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hours
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Schedule List */}
      <Box sx={{ p: 2, pb: 10 }}>
        {schedule.length === 0 ? (
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No shifts scheduled for this day
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <List disablePadding>
            {schedule.map((shift, index) => (
              <Card key={shift.id} elevation={1} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 48,
                        height: 48,
                        mr: 2,
                      }}
                    >
                      <TimeIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {shift.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {shift.role || 'Staff Member'}
                      </Typography>
                    </Box>
                    <Chip
                      label={shift.status}
                      size="small"
                      color={getStatusColor(shift.status)}
                    />
                  </Box>

                  <List disablePadding>
                    <ListItem disablePadding sx={{ py: 0.5 }}>
                      <TimeIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <ListItemText
                        primary={`${shift.time}`}
                        secondary={`${shift.startTime} - ${shift.endTime}`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {shift.location && (
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <LocationIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                        <ListItemText
                          primary={shift.location}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

      <BottomNav />

export default MySchedule;
