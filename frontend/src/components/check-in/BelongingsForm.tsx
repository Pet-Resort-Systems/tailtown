import React from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  IconButton,
  Grid,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { CheckInBelonging } from '../../services/checkInService';

interface BelongingsFormProps {
  belongings: CheckInBelonging[];
  onChange: (belongings: CheckInBelonging[]) => void;
}

const COMMON_ITEMS = [
  { type: 'Collar', icon: '🔗' },
  { type: 'Leash', icon: '🦮' },
  { type: 'Toy', icon: '🎾' },
  { type: 'Bedding', icon: '🛏️' },
  { type: 'Food', icon: '🍖' },
  { type: 'Bowl', icon: '🥣' },
  { type: 'Medication', icon: '💊' },
  { type: 'Treats', icon: '🦴' }
];

const BelongingsForm: React.FC<BelongingsFormProps> = ({ belongings, onChange }) => {
  const handleQuickAdd = (itemType: string) => {
    const newBelonging: CheckInBelonging = {
      itemType,
      description: '',
      quantity: 1
    };
    onChange([...belongings, newBelonging]);
  };

  const handleAddCustom = () => {
    const newBelonging: CheckInBelonging = {
      itemType: 'Other',
      description: '',
      quantity: 1
    };
    onChange([...belongings, newBelonging]);
  };

  const handleUpdateBelonging = (index: number, field: keyof CheckInBelonging, value: any) => {
    const updated = [...belongings];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemoveBelonging = (index: number) => {
    const updated = belongings.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Belongings Inventory
      </Typography>

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
            No belongings added. Click a quick-add button above or add a custom item.
          </Typography>
        </Paper>
      )}

      {belongings.map((belonging, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                onChange={(e) => handleUpdateBelonging(index, 'itemType', e.target.value)}
                placeholder="e.g., Collar, Toy, Bedding"
                required
              />
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Description *"
                value={belonging.description}
                onChange={(e) => handleUpdateBelonging(index, 'description', e.target.value)}
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
                onChange={(e) => handleUpdateBelonging(index, 'quantity', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                label="Notes"
                value={belonging.notes || ''}
                onChange={(e) => handleUpdateBelonging(index, 'notes', e.target.value)}
                placeholder="Any additional notes"
              />
            </Grid>
          </Grid>
        </Paper>
      ))}

      {belongings.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.dark">
            <strong>Total Items:</strong> {belongings.reduce((sum, b) => sum + b.quantity, 0)} items across {belongings.length} categories
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BelongingsForm;
