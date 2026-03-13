import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Tooltip,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  GROUP_ICONS,
  SIZE_ICONS,
  BEHAVIOR_ICONS,
  MEDICAL_ICONS,
  HANDLING_ICONS,
  FLAG_ICONS,
  ALL_PET_ICONS
} from '../../constants/petIcons';

interface PetIconSelectorProps {
  selectedIcons: string[];
  onChange: (selectedIcons: string[]) => void;
}

/**
 * Component for selecting pet icons by category
 */
const PetIconSelector: React.FC<PetIconSelectorProps> = ({ selectedIcons, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);

  // Categories for tabs
  const categories = [
    { name: 'All', icons: ALL_PET_ICONS },
    { name: 'Group', icons: GROUP_ICONS },
    { name: 'Size', icons: SIZE_ICONS },
    { name: 'Behavior', icons: BEHAVIOR_ICONS },
    { name: 'Medical', icons: MEDICAL_ICONS },
    { name: 'Handling', icons: HANDLING_ICONS },
    { name: 'Flags', icons: FLAG_ICONS },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleIconToggle = (iconId: string) => {
    if (selectedIcons.includes(iconId)) {
      onChange(selectedIcons.filter(id => id !== iconId));
    } else {
      onChange([...selectedIcons, iconId]);
    }
  };

  const currentIcons = categories[activeTab].icons;

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Pet Icons
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select icons that apply to this pet. These will be visible to staff as quick reference notes.
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
        {currentIcons.map((icon) => (
          <Grid item key={icon.id}>
            <Tooltip title={icon.description} arrow>
              <Chip
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontSize: '1.2rem' }}>{icon.icon}</span>
                    <Typography variant="caption">{icon.label}</Typography>
                  </Box>
                }
                onClick={() => handleIconToggle(icon.id)}
                color={selectedIcons.includes(icon.id) ? "primary" : "default"}
                variant={selectedIcons.includes(icon.id) ? "filled" : "outlined"}
                sx={{
                  minWidth: '100px',
                  height: 'auto',
                  py: 0.5,
                  '& .MuiChip-label': {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5
                  }
                }}
              />
            </Tooltip>
          </Grid>
        ))}
      </Grid>

      {selectedIcons.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #ccc' }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Icons:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedIcons.map(iconId => {
              const icon = ALL_PET_ICONS.find(i => i.id === iconId);
              return icon ? (
                <Tooltip key={icon.id} title={`${icon.label}: ${icon.description}`} arrow>
                  <Chip
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{icon.icon}</span>
                        <Typography variant="caption">{icon.label}</Typography>
                      </Box>
                    }
                    onDelete={() => handleIconToggle(icon.id)}
                    color="primary"
                    variant="filled"
                    size="small"
                  />
                </Tooltip>
              ) : null;
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default PetIconSelector;
