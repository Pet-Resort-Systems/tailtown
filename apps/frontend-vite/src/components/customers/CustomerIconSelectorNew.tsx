import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Tooltip,
  Chip,
  Paper,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  STATUS_ICONS,
  PAYMENT_ICONS,
  COMMUNICATION_ICONS,
  SERVICE_ICONS,
  FLAG_ICONS,
  ALL_CUSTOMER_ICONS,
} from '../../constants/customerIcons';

interface CustomerIconSelectorNewProps {
  selectedIcons: string[];
  iconNotes?: Record<string, string>;
  onChange: (
    selectedIcons: string[],
    iconNotes: Record<string, string>
  ) => void;
}

/**
 * Component for selecting multiple customer icons by category
 * Similar to PetIconSelector but for customer-specific icons
 */
const CustomerIconSelectorNew: React.FC<CustomerIconSelectorNewProps> = ({
  selectedIcons,
  iconNotes = {},
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNoteIcon, setCurrentNoteIcon] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Categories for tabs
  const categories = [
    { name: 'All', icons: ALL_CUSTOMER_ICONS },
    { name: 'Status', icons: STATUS_ICONS },
    { name: 'Payment', icons: PAYMENT_ICONS },
    { name: 'Communication', icons: COMMUNICATION_ICONS },
    { name: 'Service', icons: SERVICE_ICONS },
    { name: 'Flags', icons: FLAG_ICONS },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleIconToggle = (iconId: string) => {
    let newSelectedIcons: string[];

    if (selectedIcons.includes(iconId)) {
      newSelectedIcons = selectedIcons.filter((id) => id !== iconId);
      // Remove note if icon is deselected
      const newNotes = { ...iconNotes };
      delete newNotes[iconId];
      onChange(newSelectedIcons, newNotes);
    } else {
      newSelectedIcons = [...selectedIcons, iconId];
      onChange(newSelectedIcons, iconNotes);
    }
  };

  const handleAddNote = (iconId: string) => {
    setCurrentNoteIcon(iconId);
    setNoteText(iconNotes[iconId] || '');
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (currentNoteIcon) {
      const newNotes = { ...iconNotes };
      if (noteText.trim()) {
        newNotes[currentNoteIcon] = noteText.trim();
      } else {
        delete newNotes[currentNoteIcon];
      }
      onChange(selectedIcons, newNotes);
    }
    setNoteDialogOpen(false);
    setCurrentNoteIcon(null);
    setNoteText('');
  };

  const currentIcons = categories[activeTab].icons;

  return (
    <>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Customer Icons
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select icons that apply to this customer. These will be visible to
          staff as quick reference notes.
        </Typography>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {categories.map((category, index) => (
            <Tab key={index} label={category.name} />
          ))}
        </Tabs>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={1}>
          {currentIcons.map((icon) => {
            const isSelected = selectedIcons.includes(icon.id);
            const hasNote = iconNotes[icon.id];

            return (
              <Grid key={icon.id}>
                <Tooltip title={icon.description} arrow>
                  <Box sx={{ position: 'relative' }}>
                    <Chip
                      label={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>
                            {icon.icon}
                          </span>
                          <Typography variant="caption">
                            {icon.label}
                          </Typography>
                        </Box>
                      }
                      onClick={() => handleIconToggle(icon.id)}
                      onDoubleClick={() => isSelected && handleAddNote(icon.id)}
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      sx={{
                        minWidth: '100px',
                        height: 'auto',
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                        transition: 'transform 0.2s',
                        border: hasNote ? '2px solid' : undefined,
                        borderColor: hasNote ? 'warning.main' : undefined,
                      }}
                    />
                    {hasNote && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          border: '2px solid white',
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>

        {selectedIcons.length > 0 && (
          <Box
            sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Selected Icons ({selectedIcons.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Double-click any selected icon to add a custom note
            </Typography>
          </Box>
        )}
      </Paper>
      {/* Note Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Note to Icon</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Custom Note"
            fullWidth
            multiline
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a custom note for this icon..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveNote} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CustomerIconSelectorNew;
