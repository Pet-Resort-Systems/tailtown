import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Announcement } from '../../components/announcements/AnnouncementModal';
import announcementService from '../../services/announcementService';

const AnnouncementManager: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>({
    title: '',
    message: '',
    priority: 'NORMAL',
    type: 'INFO',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true
  });

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await announcementService.getAllAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError('Failed to load announcements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        type: announcement.type,
        startDate: announcement.startDate.split('T')[0],
        endDate: announcement.endDate ? announcement.endDate.split('T')[0] : '',
        isActive: announcement.isActive
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        message: '',
        priority: 'NORMAL',
        type: 'INFO',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isActive: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAnnouncement(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.message) {
      setError('Title and message are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingAnnouncement) {
        await announcementService.updateAnnouncement(editingAnnouncement.id, formData);
      } else {
        await announcementService.createAnnouncement(formData);
      }
      
      handleCloseDialog();
      await loadAnnouncements();
    } catch (err) {
      setError('Failed to save announcement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setLoading(true);
    try {
      await announcementService.deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err) {
      setError('Failed to delete announcement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'NORMAL':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WARNING':
        return 'warning';
      case 'SUCCESS':
        return 'success';
      case 'ERROR':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Announcement Manager
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Announcement
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No announcements yet. Create your first announcement to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {announcement.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {announcement.message.substring(0, 60)}
                        {announcement.message.length > 60 && '...'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={announcement.priority}
                        color={getPriorityColor(announcement.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={announcement.type}
                        color={getTypeColor(announcement.type) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(announcement.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {announcement.endDate
                        ? new Date(announcement.endDate).toLocaleDateString()
                        : 'No expiration'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={announcement.isActive ? 'Active' : 'Inactive'}
                        color={announcement.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(announcement)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(announcement.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              fullWidth
              required
              multiline
              rows={4}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' })}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' })}
                >
                  <MenuItem value="INFO">Info</MenuItem>
                  <MenuItem value="WARNING">Warning</MenuItem>
                  <MenuItem value="SUCCESS">Success</MenuItem>
                  <MenuItem value="ERROR">Error</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End Date (Optional)"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for no expiration"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {editingAnnouncement ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AnnouncementManager;
