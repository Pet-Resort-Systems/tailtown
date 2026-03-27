import React, { useRef, useState } from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  IconButton,
  Grid,
  Chip,
  Button,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Alert,
  CircularProgress,
  Tooltip,
  Collapse,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import checkInService from '../../services/checkInService';
import type { CheckInBelonging } from '../../services/checkInService';

// Extended belonging type with photos
interface BelongingWithPhotos extends CheckInBelonging {
  photos?: string[]; // Base64 encoded photos
}

interface BelongingsFormProps {
  belongings: BelongingWithPhotos[];
  onChange: (belongings: BelongingWithPhotos[]) => void;
  petId?: string; // Optional - enables "Use Previous" feature
  onBulkPhotoCapture?: (photo: string) => void; // Callback for bulk photo
}

const COMMON_COLORS = [
  { name: 'Red', color: '#ef5350' },
  { name: 'Blue', color: '#42a5f5' },
  { name: 'Green', color: '#66bb6a' },
  { name: 'Black', color: '#424242' },
  { name: 'Brown', color: '#8d6e63' },
  { name: 'Pink', color: '#f48fb1' },
  { name: 'Purple', color: '#ab47bc' },
  { name: 'Orange', color: '#ff9800' },
  { name: 'Yellow', color: '#ffee58' },
  { name: 'Gray', color: '#9e9e9e' },
];

const COMMON_ITEMS = [
  { type: 'Collar', icon: '🔗' },
  { type: 'Leash', icon: '🦮' },
  { type: 'Toy', icon: '🎾' },
  { type: 'Bedding', icon: '🛏️' },
  { type: 'Food', icon: '🍖' },
  { type: 'Bowl', icon: '🥣' },
  { type: 'Medication', icon: '💊' },
  { type: 'Treats', icon: '🦴' },
];

const BelongingsForm: React.FC<BelongingsFormProps> = ({
  belongings,
  onChange,
  petId,
  onBulkPhotoCapture,
}) => {
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const bulkPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [previousError, setPreviousError] = useState<string | null>(null);
  // showColorPicker removed - using inline color selection instead
  const [bulkPhoto, setBulkPhoto] = useState<string | null>(null);
  const [showBulkPhoto, setShowBulkPhoto] = useState(false);

  const handleQuickAdd = (itemType: string) => {
    const newBelonging: BelongingWithPhotos = {
      itemType,
      description: '',
      quantity: 1,
      photos: [],
    };
    onChange([...belongings, newBelonging]);
  };

  const handleAddCustom = () => {
    const newBelonging: BelongingWithPhotos = {
      itemType: 'Other',
      description: '',
      quantity: 1,
      photos: [],
    };
    onChange([...belongings, newBelonging]);
  };

  const handleUpdateBelonging = (
    index: number,
    field: keyof BelongingWithPhotos,
    value: any
  ) => {
    const updated = [...belongings];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemoveBelonging = (index: number) => {
    const updated = belongings.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handlePhotoCapture = (index: number) => {
    const input = fileInputRefs.current[index];
    if (input) {
      input.click();
    }
  };

  const handleFileChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result as string;
      const currentPhotos = belongings[index].photos || [];
      handleUpdateBelonging(index, 'photos', [...currentPhotos, base64]);
    };

    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleRemovePhoto = (belongingIndex: number, photoIndex: number) => {
    const currentPhotos = belongings[belongingIndex].photos || [];
    const updatedPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    handleUpdateBelonging(belongingIndex, 'photos', updatedPhotos);
  };

  // Load belongings from pet's last check-in
  const handleLoadPrevious = async () => {
    if (!petId) return;

    setLoadingPrevious(true);
    setPreviousError(null);

    try {
      const previousBelongings =
        await checkInService.getPreviousBelongings(petId);
      if (previousBelongings.length > 0) {
        // Add photos array to each belonging
        const withPhotos = previousBelongings.map((b) => ({
          ...b,
          photos: [],
        }));
        onChange(withPhotos);
      } else {
        setPreviousError('No previous belongings found for this pet.');
      }
    } catch (err) {
      console.error('Error loading previous belongings:', err);
      setPreviousError('Failed to load previous belongings.');
    } finally {
      setLoadingPrevious(false);
    }
  };

  // Handle bulk photo capture for all belongings
  const handleBulkPhotoCapture = () => {
    bulkPhotoInputRef.current?.click();
  };

  const handleBulkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result as string;
      setBulkPhoto(base64);
      setShowBulkPhoto(true);
      // Call callback if provided
      if (onBulkPhotoCapture) {
        onBulkPhotoCapture(base64);
      }
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Select color for a belonging
  const handleColorSelect = (index: number, colorName: string) => {
    handleUpdateBelonging(index, 'color', colorName);
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">Belongings Inventory</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Bulk Photo Button */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            ref={bulkPhotoInputRef}
            onChange={handleBulkFileChange}
          />
          <Tooltip title="Take a photo of all belongings together">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddPhotoAlternateIcon />}
              onClick={handleBulkPhotoCapture}
            >
              Bulk Photo
            </Button>
          </Tooltip>
          {/* Use Previous Button */}
          {petId && (
            <Tooltip title="Load belongings from this pet's last visit">
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  loadingPrevious ? (
                    <CircularProgress size={16} />
                  ) : (
                    <HistoryIcon />
                  )
                }
                onClick={handleLoadPrevious}
                disabled={loadingPrevious}
              >
                Use Previous
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>
      {/* Error message for loading previous */}
      {previousError && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setPreviousError(null)}
        >
          {previousError}
        </Alert>
      )}
      {/* Bulk Photo Preview */}
      <Collapse in={showBulkPhoto && !!bulkPhoto}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.100' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2">
              📷 Bulk Belongings Photo
            </Typography>
            <IconButton
              size="small"
              onClick={() => setShowBulkPhoto(!showBulkPhoto)}
            >
              {showBulkPhoto ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          {bulkPhoto && (
            <Box sx={{ position: 'relative' }}>
              <img
                src={bulkPhoto}
                alt="All belongings"
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
              />
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                }}
                onClick={() => {
                  setBulkPhoto(null);
                  setShowBulkPhoto(false);
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Paper>
      </Collapse>
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Quick Add Common Items:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {COMMON_ITEMS.map((item) => (
            <Chip
              key={item.type}
              label={`${item.icon} ${item.type}`}
              onClick={() => handleQuickAdd(item.type)}
              clickable
              color="primary"
              variant="outlined"
            />
          ))}
          <Chip
            label="+ Custom Item"
            onClick={handleAddCustom}
            clickable
            color="secondary"
            variant="outlined"
          />
        </Box>
      </Paper>
      {belongings.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography color="text.secondary">
            No belongings added. Click a quick-add button above or add a custom
            item.
          </Typography>
        </Paper>
      )}
      {belongings.map((belonging, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              {belonging.itemType}
              {belonging.description && ` - ${belonging.description}`}
            </Typography>
            <IconButton
              color="error"
              onClick={() => handleRemoveBelonging(index)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <TextField
                fullWidth
                label="Item Type *"
                value={belonging.itemType}
                onChange={(e) =>
                  handleUpdateBelonging(index, 'itemType', e.target.value)
                }
                placeholder="e.g., Collar, Toy, Bedding"
                required
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 8
              }}>
              <TextField
                fullWidth
                label="Description *"
                value={belonging.description}
                onChange={(e) =>
                  handleUpdateBelonging(index, 'description', e.target.value)
                }
                placeholder="e.g., Blue nylon collar with tags, Red squeaky ball"
                required
              />
            </Grid>

            <Grid
              size={{
                xs: 6,
                md: 2
              }}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={belonging.quantity}
                onChange={(e) =>
                  handleUpdateBelonging(
                    index,
                    'quantity',
                    parseInt(e.target.value) || 1
                  )
                }
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* Color Quick Select */}
            <Grid
              size={{
                xs: 6,
                md: 4
              }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: 'block' }}
              >
                Color
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {COMMON_COLORS.map((c) => (
                  <Tooltip key={c.name} title={c.name}>
                    <Box
                      onClick={() => handleColorSelect(index, c.name)}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: c.color,
                        cursor: 'pointer',
                        border:
                          belonging.color === c.name
                            ? '3px solid #1976d2'
                            : '2px solid #ddd',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              {belonging.color && (
                <Chip
                  label={belonging.color}
                  size="small"
                  onDelete={() => handleUpdateBelonging(index, 'color', '')}
                  sx={{ mt: 0.5 }}
                />
              )}
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="Notes"
                value={belonging.notes || ''}
                onChange={(e) =>
                  handleUpdateBelonging(index, 'notes', e.target.value)
                }
                placeholder="Any additional notes"
              />
            </Grid>

            {/* Photo Documentation */}
            <Grid size={12}>
              <Box sx={{ mt: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  ref={(el) => (fileInputRefs.current[index] = el)}
                  onChange={(e) => handleFileChange(index, e)}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => handlePhotoCapture(index)}
                  sx={{ mb: 1 }}
                >
                  Add Photo
                </Button>

                {belonging.photos && belonging.photos.length > 0 && (
                  <ImageList sx={{ mt: 1 }} cols={4} rowHeight={100}>
                    {belonging.photos.map((photo, photoIndex) => (
                      <ImageListItem key={photoIndex}>
                        <img
                          src={photo}
                          alt={`${belonging.itemType} photo ${photoIndex + 1}`}
                          loading="lazy"
                          style={{ objectFit: 'cover', height: '100%' }}
                        />
                        <ImageListItemBar
                          sx={{ background: 'transparent' }}
                          position="top"
                          actionIcon={
                            <IconButton
                              sx={{
                                color: 'white',
                                bgcolor: 'rgba(0,0,0,0.5)',
                                m: 0.5,
                              }}
                              size="small"
                              onClick={() =>
                                handleRemovePhoto(index, photoIndex)
                              }
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          }
                          actionPosition="right"
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      ))}
      {belongings.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.dark">
            <strong>Total Items:</strong>{' '}
            {belongings.reduce((sum, b) => sum + b.quantity, 0)} items across{' '}
            {belongings.length} categories
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BelongingsForm;
