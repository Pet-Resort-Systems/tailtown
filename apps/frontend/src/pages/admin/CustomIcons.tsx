import React, { useState } from 'react';
import { getApiBaseUrl } from '../../services/api';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface CustomIcon {
  id: string;
  name: string;
  label: string;
  description: string;
  category:
    | 'status'
    | 'payment'
    | 'communication'
    | 'service'
    | 'flag'
    | 'custom';
  imageUrl: string;
  createdAt: string;
}

const CustomIcons: React.FC = () => {
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<CustomIcon | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    description: '',
    category: 'custom' as CustomIcon['category'],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Load icons from API
  const loadIcons = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/custom-icons`);
      const data = await response.json();
      if (data.status === 'success') {
        setCustomIcons(data.data);
      }
    } catch (error) {
      console.error('Error loading icons:', error);
    }
  };

  // Load icons on mount
  React.useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadIcons();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({
          open: true,
          message: 'Please select an image file',
          severity: 'error',
        });
        return;
      }

      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        setSnackbar({
          open: true,
          message: 'Image must be smaller than 1MB',
          severity: 'error',
        });
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (icon?: CustomIcon) => {
    if (icon) {
      setEditingIcon(icon);
      setFormData({
        name: icon.name,
        label: icon.label,
        description: icon.description,
        category: icon.category,
      });
      setPreviewUrl(icon.imageUrl);
    } else {
      setEditingIcon(null);
      setFormData({
        name: '',
        label: '',
        description: '',
        category: 'custom',
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIcon(null);
    setFormData({
      name: '',
      label: '',
      description: '',
      category: 'custom',
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name || !formData.label || !formData.description) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    if (!editingIcon && !selectedFile) {
      setSnackbar({
        open: true,
        message: 'Please select an image file',
        severity: 'error',
      });
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('label', formData.label);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      if (selectedFile) {
        formDataToSend.append('image', selectedFile);
      }

      const url = editingIcon
        ? `${getApiBaseUrl()}/api/custom-icons/${editingIcon.id}`
        : `${getApiBaseUrl()}/api/custom-icons`;

      const response = await fetch(url, {
        method: editingIcon ? 'PUT' : 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to save icon');
      }

      setSnackbar({
        open: true,
        message: editingIcon
          ? 'Icon updated successfully'
          : 'Icon uploaded successfully',
        severity: 'success',
      });

      handleCloseDialog();
      loadIcons(); // Reload icons list
    } catch (error) {
      console.error('Error saving icon:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save icon',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (iconId: string) => {
    if (!window.confirm('Are you sure you want to delete this custom icon?')) {
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/custom-icons/${iconId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete icon');
      }

      setSnackbar({
        open: true,
        message: 'Icon deleted successfully',
        severity: 'success',
      });

      loadIcons(); // Reload icons list
    } catch (error) {
      console.error('Error deleting icon:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete icon',
        severity: 'error',
      });
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              Custom Icons
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload and manage custom icons for customers and pets
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Upload Icon
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Image Requirements:</strong> PNG, JPG, or SVG format •
            Maximum size: 1MB • Recommended size: 64x64px • Transparent
            background recommended
          </Typography>
        </Alert>

        {customIcons.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Custom Icons Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload your first custom icon to get started. Custom icons will
              appear alongside the built-in icons in the icon selector.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Upload Your First Icon
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {customIcons.map((icon) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={icon.id}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}
                    >
                      <img
                        src={icon.imageUrl}
                        alt={icon.label}
                        style={{ width: 64, height: 64, objectFit: 'contain' }}
                      />
                    </Box>
                    <Typography variant="h6" align="center" gutterBottom>
                      {icon.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                      paragraph
                    >
                      {icon.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Chip label={icon.category} size="small" />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(icon)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(icon.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Upload/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingIcon ? 'Edit Custom Icon' : 'Upload Custom Icon'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {/* File Upload */}
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="icon-file-upload"
                  type="file"
                  onChange={handleFileSelect}
                />
                <label htmlFor="icon-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    fullWidth
                  >
                    {selectedFile ? selectedFile.name : 'Select Image File'}
                  </Button>
                </label>

                {previewUrl && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      gutterBottom
                      display="block"
                    >
                      Preview:
                    </Typography>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ width: 64, height: 64, objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </Box>

              {/* Form Fields */}
              <TextField
                fullWidth
                label="Icon Name (ID)"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                  })
                }
                placeholder="e.g., custom_vip"
                helperText="Unique identifier for this icon (lowercase, underscores only)"
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="Display Label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g., VIP Customer"
                helperText="Text shown in the icon selector"
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g., High-value customer requiring special attention"
                helperText="Tooltip text shown when hovering over the icon"
                multiline
                rows={2}
                sx={{ mb: 2 }}
                required
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as CustomIcon['category'],
                    })
                  }
                  label="Category"
                >
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="payment">Payment</MenuItem>
                  <MenuItem value="communication">Communication</MenuItem>
                  <MenuItem value="service">Service</MenuItem>
                  <MenuItem value="flag">Flag</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              {editingIcon ? 'Update' : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default CustomIcons;
