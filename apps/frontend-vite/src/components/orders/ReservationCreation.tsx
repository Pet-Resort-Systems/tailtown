import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Customer } from '../../types/customer';
import { Pet } from '../../types/pet';
import { serviceManagement } from '../../services/serviceManagement';
import { resourceService } from '../../services/resourceService';

interface ReservationCreationProps {
  onContinue: (reservationData: any) => void;
  customer: Customer | null;
  pet: Pet | null;
  initialReservation: {
    startDate: Date | null;
    endDate: Date | null;
    serviceId: string;
    resourceId: string;
    status: string;
    notes: string;
  };
}

const ReservationCreation: React.FC<ReservationCreationProps> = ({
  onContinue,
  customer,
  pet,
  initialReservation,
}) => {
  // State for form data
  const [startDate, setStartDate] = useState<Date | null>(
    initialReservation.startDate || new Date()
  );
  const [endDate, setEndDate] = useState<Date | null>(() => {
    if (initialReservation.endDate) {
      return initialReservation.endDate;
    }
    // Default end date to tomorrow if no initial end date is provided
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [availableResources, setAvailableResources] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [notes, setNotes] = useState<string>(initialReservation.notes || '');

  // Loading and error states
  const [servicesLoading, setServicesLoading] = useState<boolean>(false);
  const [resourcesLoading, setResourcesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load services on component mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        setServicesLoading(true);
        setError(null);
        const response = await serviceManagement.getAllServices();

        if (response && response.data) {
          setServices(response.data);

          // Set the initial service after services are loaded
          if (response.data.length > 0) {
            // If we have an initialReservation.serviceId and it exists in the loaded services, use it
            if (
              initialReservation.serviceId &&
              response.data.some(
                (service: { id: string }) =>
                  service.id === initialReservation.serviceId
              )
            ) {
              setSelectedService(initialReservation.serviceId);
            } else {
              // Otherwise select the first service
              setSelectedService(response.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error loading services:', err);
        setError('Failed to load services. Please try again.');
      } finally {
        setServicesLoading(false);
      }
    };

    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - initialReservation.serviceId is used but intentionally not in deps to avoid re-running

  // Load available resources when dates or service changes
  useEffect(() => {
    const loadAvailableResources = async () => {
      if (!startDate || !endDate || !selectedService) {
        return;
      }

      try {
        setResourcesLoading(true);
        setError(null);

        // Format dates for API
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];

        const response = await resourceService.getAvailableResourcesByDate(
          formattedStartDate,
          formattedEndDate,
          selectedService
        );

        if (response && response.data) {
          setAvailableResources(response.data);

          // Clear selected resource if it's no longer available or if no resources are available
          if (
            selectedResource &&
            (response.data.length === 0 ||
              !response.data.some(
                (resource: { id: string }) => resource.id === selectedResource
              ))
          ) {
            setSelectedResource('');
          }
        } else {
          // If no data is returned, clear resources and selection
          setAvailableResources([]);
          setSelectedResource('');
        }
      } catch (err) {
        console.error('Error loading resources:', err);
        setError('Failed to load available resources. Please try again.');
      } finally {
        setResourcesLoading(false);
      }
    };

    loadAvailableResources();
  }, [startDate, endDate, selectedService, selectedResource]);

  // Handle start date change
  const handleStartDateChange = (value: unknown) => {
    const newStartDate = value as Date | null;
    setStartDate(newStartDate);

    // Ensure end date is after start date
    if (newStartDate && endDate && newStartDate >= endDate) {
      const newEndDate = new Date(newStartDate.getTime());
      newEndDate.setDate(newEndDate.getDate() + 1); // Add one day
      setEndDate(newEndDate);
    }
  };

  // Handle service selection
  const handleServiceChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    const serviceId = event.target.value as string;
    setSelectedService(serviceId);

    // Get the selected service
    const service = services.find((s) => s.id === serviceId);

    // Adjust the end date based on service duration
    if (service && service.duration && startDate) {
      const newEndDate = new Date(startDate.getTime());
      newEndDate.setMinutes(newEndDate.getMinutes() + service.duration);
      setEndDate(newEndDate);
    }
  };

  // Handle continue to next step
  const handleContinue = () => {
    if (!startDate || !endDate || !selectedService) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate that start date is before end date
    if (startDate >= endDate) {
      setError('Start date must be before end date');
      return;
    }

    // Get the selected service to include its price
    const selectedServiceObj = services.find(
      (service: any) => service.id === selectedService
    );

    const reservationData = {
      startDate,
      endDate,
      serviceId: selectedService,
      resourceId: selectedResource || undefined,
      notes,
      status: 'CONFIRMED',
      price: selectedServiceObj ? selectedServiceObj.price : 0, // Include the service price
    };

    onContinue(reservationData);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Reservation Details
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {(!customer || !pet) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please select a customer and pet before creating a reservation.
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Customer:{' '}
            {customer
              ? `${customer.firstName} ${customer.lastName}`
              : 'Not selected'}
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            Pet: {pet ? pet.name : 'Not selected'}
          </Typography>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <FormControl
                fullWidth
                size="small"
                disabled={servicesLoading || !customer || !pet}
              >
                <InputLabel id="service-select-label">Service Type</InputLabel>
                <Select
                  labelId="service-select-label"
                  id="service-select"
                  value={selectedService}
                  label="Service Type"
                  onChange={handleServiceChange as any}
                  endAdornment={
                    servicesLoading ? (
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                    ) : null
                  }
                >
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name} - ${service.price.toFixed(2)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={handleStartDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    disabled: !customer || !pet,
                  },
                }}
                minDate={new Date()}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Start Time"
                value={startDate}
                onChange={(newValue) => {
                  if (!newValue || !startDate) return;

                  const updatedDate = new Date(startDate);
                  updatedDate.setHours(
                    newValue.getHours(),
                    newValue.getMinutes()
                  );
                  handleStartDateChange(updatedDate);

                  // Update end time if we have a service duration
                  const service = services.find(
                    (s) => s.id === selectedService
                  );
                  if (service && service.duration) {
                    const newEndDate = new Date(updatedDate.getTime());
                    newEndDate.setMinutes(
                      newEndDate.getMinutes() + service.duration
                    );
                    setEndDate(newEndDate);
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    disabled: !customer || !pet,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    disabled: !customer || !pet,
                  },
                }}
                minDate={startDate || undefined}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TimePicker
                label="End Time"
                value={endDate}
                onChange={(newValue) => {
                  if (!newValue || !endDate) return;

                  const updatedDate = new Date(endDate);
                  updatedDate.setHours(
                    newValue.getHours(),
                    newValue.getMinutes()
                  );
                  setEndDate(updatedDate);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    disabled: !customer || !pet,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl
                fullWidth
                size="small"
                disabled={
                  resourcesLoading || !selectedService || !startDate || !endDate
                }
              >
                <InputLabel id="resource-select-label">
                  Kennel/Suite Selection
                </InputLabel>
                <Select
                  labelId="resource-select-label"
                  id="resource-select"
                  value={selectedResource}
                  label="Kennel/Suite Selection"
                  onChange={(e) =>
                    setSelectedResource(e.target.value as string)
                  }
                  endAdornment={
                    resourcesLoading ? (
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                    ) : null
                  }
                >
                  <MenuItem value="">
                    <em>Auto-assign kennel</em>
                  </MenuItem>
                  {availableResources.map((resource) => (
                    <MenuItem key={resource.id} value={resource.id}>
                      {resource.name} - {resource.type.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reservation Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
                disabled={!customer || !pet}
              />
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleContinue}
            disabled={
              !customer || !pet || !selectedService || !startDate || !endDate
            }
          >
            Continue to Add-Ons
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default ReservationCreation;
