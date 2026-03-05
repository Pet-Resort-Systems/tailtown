import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Box,
} from '@mui/material';
import { ContentCut as GroomingIcon, ArrowForward as ViewAllIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import schedulingService from '../../services/schedulingService';
import { GroomerAppointment } from '../../types/scheduling';

const UpcomingAppointments: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<GroomerAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      
      const data = await schedulingService.groomerAppointments.getAll({
        startDate: today,
        endDate: nextWeek,
        status: 'SCHEDULED',
      });
      
      // Sort by date and take first 5
      const sorted = data
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, 5);
      
      setAppointments(sorted);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'primary';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader
        avatar={<GroomingIcon color="primary" />}
        title="Upcoming Grooming Appointments"
        subheader="Next 7 days"
        action={
          <Button
            size="small"
            endIcon={<ViewAllIcon />}
            onClick={() => navigate('/grooming/appointments')}
          >
            View All
          </Button>
        }
      />
      <CardContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : appointments.length === 0 ? (
          <Typography color="textSecondary" align="center" py={3}>
            No upcoming appointments
          </Typography>
        ) : (
          <List>
            {appointments.map((appointment) => (
              <ListItem
                key={appointment.id}
                sx={{
                  borderLeft: 3,
                  borderColor: 'primary.main',
                  mb: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1" fontWeight="medium">
                        {appointment.pet?.name || 'Unknown Pet'}
                      </Typography>
                      <Chip
                        label={appointment.status}
                        size="small"
                        color={getStatusColor(appointment.status)}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        {format(new Date(appointment.scheduledDate), 'MMM dd, yyyy')} at{' '}
                        {appointment.scheduledTime}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        Customer: {appointment.customer
                          ? `${appointment.customer.firstName} ${appointment.customer.lastName}`
                          : 'Unknown'}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        Groomer: {appointment.groomer
                          ? `${appointment.groomer.firstName} ${appointment.groomer.lastName}`
                          : 'TBD'}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingAppointments;
