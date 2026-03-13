import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import staffService, { StaffTimeOff, TimeOffType, TimeOffStatus } from '../../services/staffService';

interface StaffTimeOffFormProps {
  staffId: string;
  onSave?: () => void;
}

const timeOffTypes = [
  'VACATION',
  'SICK',
  'PERSONAL',
  'BEREAVEMENT',
  'JURY_DUTY',
  'OTHER'
];

const statusOptions = [
  'PENDING',
  'APPROVED',
  'DENIED'
];

const StaffTimeOffForm: React.FC<StaffTimeOffFormProps> = ({ staffId, onSave }) => {
  const [timeOffList, setTimeOffList] = useState<StaffTimeOff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTimeOff, setEditingTimeOff] = useState<StaffTimeOff | null>(null);
  const [formData, setFormData] = useState<Partial<StaffTimeOff>>({
    startDate: '',
    endDate: '',
    type: TimeOffType.VACATION,
    status: TimeOffStatus.PENDING,
    reason: '',
    approvedById: null,
    approvedDate: null
  });

  const loadStaffTimeOff = useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaffTimeOff(staffId);
      setTimeOffList(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load staff time off:', err);
      setError('Failed to load time off records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  // Load staff time off when component mounts
  useEffect(() => {
    if (staffId) {
      loadStaffTimeOff();
    }
  }, [staffId, loadStaffTimeOff]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Format date to YYYY-MM-DD for input fields
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

  const handleEditTimeOff = (timeOff: StaffTimeOff) => {
    setEditingTimeOff(timeOff);
    setFormData({
      startDate: formatDateForInput(timeOff.startDate),
      endDate: formatDateForInput(timeOff.endDate),
      type: timeOff.type,
      status: timeOff.status,
      reason: timeOff.reason || '',
      approvedById: timeOff.approvedById,
      approvedDate: formatDateForInput(timeOff.approvedDate)
    });
  };

  const handleCancelEdit = () => {
    setEditingTimeOff(null);
    setFormData({
      startDate: '',
      endDate: '',
      type: TimeOffType.VACATION,
      status: TimeOffStatus.PENDING,
      reason: '',
      approvedById: null,
      approvedDate: ''
    });
  };

  const handleSaveTimeOff = async () => {
    try {
      setLoading(true);
      
      // Validate form data
      if (!formData.startDate || !formData.endDate) {
        setError('Start date and end date are required');
        setLoading(false);
        return;
      }

      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (start > end) {
        setError('End date must be after start date');
        setLoading(false);
        return;
      }

      if (editingTimeOff && editingTimeOff.id) {
        // Update existing time off
        await staffService.updateStaffTimeOff(editingTimeOff.id, {
          ...formData,
          staffId
        });
      } else {
        // Create new time off
        await staffService.createStaffTimeOff(staffId, formData);
      }
      
      // Reload the time off list
      await loadStaffTimeOff();
      
      // Reset form
      handleCancelEdit();
      
      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to save staff time off:', err);
      setError('Failed to save time off. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimeOff = async (timeOffId: string) => {
    try {
      setLoading(true);
      await staffService.deleteStaffTimeOff(timeOffId);
      await loadStaffTimeOff();
      
      // If we were editing the deleted item, reset the form
      if (editingTimeOff && editingTimeOff.id === timeOffId) {
        handleCancelEdit();
      }
      
      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to delete staff time off:', err);
      setError('Failed to delete time off. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate the number of days for a time off request
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
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
          {editingTimeOff ? 'Edit Time Off Request' : 'Request Time Off'}
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="startDate"
              label="Start Date"
              type="date"
              value={formData.startDate || ''}
              onChange={handleInputChange}
              fullWidth
              size="small"
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="endDate"
              label="End Date"
              type="date"
              value={formData.endDate || ''}
              onChange={handleInputChange}
              fullWidth
              size="small"
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                name="type"
                value={formData.type || 'VACATION'}
                label="Type"
                onChange={handleSelectChange}
                required
              >
                {timeOffTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status || 'PENDING'}
                label="Status"
                onChange={handleSelectChange}
                required
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="reason"
              label="Reason (Optional)"
              value={formData.reason || ''}
              onChange={handleInputChange}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Grid>
          
          {formData.status === 'APPROVED' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="approvedById"
                  label="Approved By ID"
                  value={formData.approvedById || ''}
                  onChange={handleInputChange}
                  disabled={formData.status !== TimeOffStatus.APPROVED}
                  fullWidth
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="approvedDate"
                  label="Approved Date"
                  type="date"
                  value={formData.approvedDate || ''}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {editingTimeOff ? (
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
                  onClick={handleSaveTimeOff}
                  size="small"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleSaveTimeOff}
                size="small"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Request'}
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      <Typography variant="subtitle1" gutterBottom>
        Time Off Requests
      </Typography>
      
      {loading && !editingTimeOff ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      ) : timeOffList.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          No time off requests found.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dates</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Approval</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timeOffList.map((timeOff) => (
                <TableRow key={timeOff.id}>
                  <TableCell>{`${formatDate(timeOff.startDate)} - ${formatDate(timeOff.endDate)}`}</TableCell>
                  <TableCell>{calculateDays(timeOff.startDate, timeOff.endDate)}</TableCell>
                  <TableCell>
                    {timeOff.type.charAt(0) + timeOff.type.slice(1).toLowerCase().replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={timeOff.status.charAt(0) + timeOff.status.slice(1).toLowerCase()} 
                      color={
                        timeOff.status === 'APPROVED' ? 'success' : 
                        timeOff.status === 'DENIED' ? 'error' : 'warning'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{timeOff.reason || '-'}</TableCell>
                  <TableCell>
                    {timeOff.approvedById ? (
                      <>
                        {timeOff.approvedById}
                        {timeOff.approvedDate && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {new Date(timeOff.approvedDate).toLocaleDateString()}
                          </Typography>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditTimeOff(timeOff)}
                      aria-label="edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => timeOff.id ? handleDeleteTimeOff(timeOff.id) : undefined}
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

export default StaffTimeOffForm;
