import React, { useRef } from "react";
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CloseIcon from "@mui/icons-material/Close";
import { CheckInBelonging } from "../../services/checkInService";

// Extended belonging type with photos
interface BelongingWithPhotos extends CheckInBelonging {
  photos?: string[]; // Base64 encoded photos
}

interface BelongingsFormProps {
  belongings: BelongingWithPhotos[];
  onChange: (belongings: BelongingWithPhotos[]) => void;
}

const COMMON_ITEMS = [
  { type: "Collar", icon: "🔗" },
  { type: "Leash", icon: "🦮" },
  { type: "Toy", icon: "🎾" },
  { type: "Bedding", icon: "🛏️" },
  { type: "Food", icon: "🍖" },
  { type: "Bowl", icon: "🥣" },
  { type: "Medication", icon: "💊" },
  { type: "Treats", icon: "🦴" },
];

const BelongingsForm: React.FC<BelongingsFormProps> = ({
  belongings,
  onChange,
}) => {
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const handleQuickAdd = (itemType: string) => {
    const newBelonging: BelongingWithPhotos = {
      itemType,
      description: "",
      quantity: 1,
      photos: [],
    };
    onChange([...belongings, newBelonging]);
  };

  const handleAddCustom = () => {
    const newBelonging: BelongingWithPhotos = {
      itemType: "Other",
      description: "",
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
      handleUpdateBelonging(index, "photos", [...currentPhotos, base64]);
    };

    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    event.target.value = "";
  };

  const handleRemovePhoto = (belongingIndex: number, photoIndex: number) => {
    const currentPhotos = belongings[belongingIndex].photos || [];
    const updatedPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    handleUpdateBelonging(belongingIndex, "photos", updatedPhotos);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Belongings Inventory
      </Typography>

      <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
        <Typography variant="subtitle2" gutterBottom>
          Quick Add Common Items:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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
        <Paper sx={{ p: 3, textAlign: "center", bgcolor: "grey.50" }}>
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Item Type *"
                value={belonging.itemType}
                onChange={(e) =>
                  handleUpdateBelonging(index, "itemType", e.target.value)
                }
                placeholder="e.g., Collar, Toy, Bedding"
                required
              />
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Description *"
                value={belonging.description}
                onChange={(e) =>
                  handleUpdateBelonging(index, "description", e.target.value)
                }
                placeholder="e.g., Blue nylon collar with tags, Red squeaky ball"
                required
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={belonging.quantity}
                onChange={(e) =>
                  handleUpdateBelonging(
                    index,
                    "quantity",
                    parseInt(e.target.value) || 1
                  )
                }
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                label="Notes"
                value={belonging.notes || ""}
                onChange={(e) =>
                  handleUpdateBelonging(index, "notes", e.target.value)
                }
                placeholder="Any additional notes"
              />
            </Grid>

            {/* Photo Documentation */}
            <Grid item xs={12}>
              <Box sx={{ mt: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
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
                          style={{ objectFit: "cover", height: "100%" }}
                        />
                        <ImageListItemBar
                          sx={{ background: "transparent" }}
                          position="top"
                          actionIcon={
                            <IconButton
                              sx={{
                                color: "white",
                                bgcolor: "rgba(0,0,0,0.5)",
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
        <Box sx={{ mt: 2, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
          <Typography variant="body2" color="info.dark">
            <strong>Total Items:</strong>{" "}
            {belongings.reduce((sum, b) => sum + b.quantity, 0)} items across{" "}
            {belongings.length} categories
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BelongingsForm;
