import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import staffService, { StaffAvailability } from '../../services/staffService';

interface StaffAvailabilityFormProps {
  staffId: string;
  onSave?: () => void;
}

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const StaffAvailabilityForm: React.FC<StaffAvailabilityFormProps> = ({
  staffId,
  onSave,
}) => {
  const [availabilityList, setAvailabilityList] = useState<StaffAvailability[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAvailability, setEditingAvailability] =
    useState<StaffAvailability | null>(null);
  const [formData, setFormData] = useState<Partial<StaffAvailability>>({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true,
    effectiveFrom: null,
    effectiveUntil: null,
    // Removed notes field as it's not supported in the backend schema
  });

  // Load staff availability when component mounts
  useEffect(() => {
    if (staffId) {
      loadStaffAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]); // loadStaffAvailability defined below, stable function

  const loadStaffAvailability = async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaffAvailability(staffId);
      setAvailabilityList(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load staff availability:', err);
      setError('Failed to load availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'dayOfWeek' ? parseInt(value, 10) : value === 'true',
    });
  };

  const handleEditAvailability = (availability: StaffAvailability) => {
    setEditingAvailability(availability);
    setFormData({
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isAvailable: availability.isAvailable,
      effectiveFrom: availability.effectiveFrom,
      effectiveUntil: availability.effectiveUntil,
      // Removed notes field as it's not supported in the backend schema
    });
  };

  const handleCancelEdit = () => {
    setEditingAvailability(null);
    setFormData({
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
      effectiveFrom: null,
      effectiveUntil: null,
      // Removed notes field as it's not supported in the backend schema
    });
  };

  const handleSaveAvailability = async () => {
    try {
      setLoading(true);

      // Validate form data
      if (
        formData.startTime &&
        formData.endTime &&
        formData.startTime >= formData.endTime
      ) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      if (editingAvailability && editingAvailability.id) {
        // Update existing availability
        await staffService.updateStaffAvailability(editingAvailability.id, {
          ...formData,
          staffId,
        });
      } else {
        // Create new availability
        await staffService.createStaffAvailability(staffId, formData);
      }

      // Reload the availability list
      await loadStaffAvailability();

      // Reset form
      handleCancelEdit();

      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to save staff availability:', err);
      setError('Failed to save availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    try {
      setLoading(true);
      await staffService.deleteStaffAvailability(availabilityId);
      await loadStaffAvailability();

      // If we were editing the deleted item, reset the form
      if (editingAvailability && editingAvailability.id === availabilityId) {
        handleCancelEdit();
      }

      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to delete staff availability:', err);
      setError('Failed to delete availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {editingAvailability ? 'Edit Availability' : 'Add New Availability'}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Day of Week</InputLabel>
              <Select
                name="dayOfWeek"
                value={formData.dayOfWeek?.toString() || '0'}
                label="Day of Week"
                onChange={handleSelectChange}
              >
                {dayNames.map((day, index) => (
                  <MenuItem key={day} value={index.toString()}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Available</InputLabel>
              <Select
                name="isAvailable"
                value={formData.isAvailable ? 'true' : 'false'}
                label="Available"
                onChange={handleSelectChange}
              >
                <MenuItem value="true">Available</MenuItem>
                <MenuItem value="false">Unavailable</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              name="startTime"
              label="Start Time"
              type="time"
              value={formData.startTime || '09:00'}
              onChange={handleInputChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              name="endTime"
              label="End Time"
              type="time"
              value={formData.endTime || '17:00'}
              onChange={handleInputChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              name="effectiveFrom"
              label="Effective From (Optional)"
              type="date"
              value={formData.effectiveFrom || ''}
              onChange={handleInputChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              name="effectiveUntil"
              label="Effective Until (Optional)"
              type="date"
              value={formData.effectiveUntil || ''}
              onChange={handleInputChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Removed notes field as it's not supported in the backend schema */}

          <Grid
            item
            xs={12}
            sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}
          >
            {editingAvailability ? (
              <>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  size="small"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveAvailability}
                  size="small"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={handleSaveAvailability}
                size="small"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Add'}
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="subtitle1" gutterBottom>
        Current Availability Schedule
      </Typography>

      {loading && !editingAvailability ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      ) : availabilityList.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          No availability records found. Add a new schedule above.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Effective Period</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availabilityList.map((availability) => (
                <TableRow key={availability.id}>
                  <TableCell>{dayNames[availability.dayOfWeek]}</TableCell>
                  <TableCell>{`${availability.startTime} - ${availability.endTime}`}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        availability.isAvailable ? 'Available' : 'Unavailable'
                      }
                      color={availability.isAvailable ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {availability.effectiveFrom ||
                    availability.effectiveUntil ? (
                      <>
                        {availability.effectiveFrom
                          ? new Date(
                              availability.effectiveFrom
                            ).toLocaleDateString()
                          : 'Always'}
                        {' - '}
                        {availability.effectiveUntil
                          ? new Date(
                              availability.effectiveUntil
                            ).toLocaleDateString()
                          : 'Forever'}
                      </>
                    ) : (
                      'Always'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditAvailability(availability)}
                      aria-label="edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        availability.id
                          ? handleDeleteAvailability(availability.id)
                          : undefined
                      }
                      aria-label="delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StaffAvailabilityForm;
