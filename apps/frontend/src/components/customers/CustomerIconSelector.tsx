import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Person,
  Face,
  EmojiEmotions,
  SentimentSatisfied,
  SentimentVerySatisfied,
  Mood,
  TagFaces,
  InsertEmoticon,
} from '@mui/icons-material';

interface CustomerIconSelectorProps {
  open: boolean;
  currentIcon?: string;
  currentColor?: string;
  onClose: () => void;
  onSave: (icon: string, color: string) => void;
}

const ICON_OPTIONS = [
  { name: 'person', icon: Person, label: 'Person' },
  { name: 'face', icon: Face, label: 'Face' },
  { name: 'smile', icon: EmojiEmotions, label: 'Smile' },
  { name: 'satisfied', icon: SentimentSatisfied, label: 'Satisfied' },
  { name: 'happy', icon: SentimentVerySatisfied, label: 'Happy' },
  { name: 'mood', icon: Mood, label: 'Mood' },
  { name: 'tag', icon: TagFaces, label: 'Tag' },
  { name: 'emoticon', icon: InsertEmoticon, label: 'Emoticon' },
];

const COLOR_OPTIONS = [
  { name: 'blue', color: '#2196F3', label: 'Blue' },
  { name: 'green', color: '#4CAF50', label: 'Green' },
  { name: 'purple', color: '#9C27B0', label: 'Purple' },
  { name: 'orange', color: '#FF9800', label: 'Orange' },
  { name: 'red', color: '#F44336', label: 'Red' },
  { name: 'teal', color: '#009688', label: 'Teal' },
  { name: 'pink', color: '#E91E63', label: 'Pink' },
  { name: 'indigo', color: '#3F51B5', label: 'Indigo' },
  { name: 'cyan', color: '#00BCD4', label: 'Cyan' },
  { name: 'lime', color: '#CDDC39', label: 'Lime' },
  { name: 'amber', color: '#FFC107', label: 'Amber' },
  { name: 'brown', color: '#795548', label: 'Brown' },
];

const CustomerIconSelector: React.FC<CustomerIconSelectorProps> = ({
  open,
  currentIcon = 'person',
  currentColor = 'blue',
  onClose,
  onSave,
}) => {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const handleSave = () => {
    onSave(selectedIcon, selectedColor);
    onClose();
  };

  const handleReset = () => {
    setSelectedIcon(currentIcon);
    setSelectedColor(currentColor);
  };

  const getColorValue = (colorName: string) => {
    return COLOR_OPTIONS.find((c) => c.name === colorName)?.color || '#2196F3';
  };

  const SelectedIconComponent =
    ICON_OPTIONS.find((i) => i.name === selectedIcon)?.icon || Person;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Customize Customer Icon</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
          {/* Preview */}
          <Paper
            sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Preview
            </Typography>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: getColorValue(selectedColor),
                margin: '0 auto',
                fontSize: '3rem',
              }}
            >
              <SelectedIconComponent sx={{ fontSize: '3rem' }} />
            </Avatar>
          </Paper>

          {/* Icon Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Choose Icon
            </Typography>
            <Grid container spacing={1}>
              {ICON_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Grid item xs={3} key={option.name}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: 2,
                        borderColor:
                          selectedIcon === option.name
                            ? 'primary.main'
                            : 'transparent',
                        '&:hover': {
                          borderColor: 'primary.light',
                          bgcolor: 'action.hover',
                        },
                      }}
                      onClick={() => setSelectedIcon(option.name)}
                    >
                      <IconComponent sx={{ fontSize: 40 }} />
                      <Typography variant="caption" display="block" mt={1}>
                        {option.label}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Color Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Choose Color
            </Typography>
            <Grid container spacing={1}>
              {COLOR_OPTIONS.map((option) => (
                <Grid item xs={2} key={option.name}>
                  <Paper
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: 2,
                      borderColor:
                        selectedColor === option.name
                          ? 'primary.main'
                          : 'transparent',
                      '&:hover': {
                        borderColor: 'primary.light',
                      },
                    }}
                    onClick={() => setSelectedColor(option.name)}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: option.color,
                        borderRadius: '50%',
                        margin: '0 auto',
                      }}
                    />
                    <Typography variant="caption" display="block" mt={0.5}>
                      {option.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerIconSelector;
