import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Paper,
  Tooltip,
  Divider,
} from '@mui/material';
import { ALL_PET_ICONS, getIconsByCategory } from '../../constants/petIcons';

interface EmojiPetIconSelectorProps {
  selectedIcons: string[];
  onChange: (selectedIcons: string[]) => void;
}

/**
 * Pet icon selector with organized categories and descriptions
 * Uses the proper icon system from constants/petIcons.ts
 */
const EmojiPetIconSelector: React.FC<EmojiPetIconSelectorProps> = ({
  selectedIcons,
  onChange,
}) => {
  const handleIconToggle = (iconId: string) => {
    if (selectedIcons.includes(iconId)) {
      onChange(selectedIcons.filter((id) => id !== iconId));
    } else {
      onChange([...selectedIcons, iconId]);
    }
  };

  // Get icons by category
  const groupIcons = getIconsByCategory('group');
  const sizeIcons = getIconsByCategory('size');
  const behaviorIcons = getIconsByCategory('behavior');
  const medicalIcons = getIconsByCategory('medical');
  const handlingIcons = getIconsByCategory('handling');
  const kennelIcons = getIconsByCategory('kennel');
  const notesIcons = getIconsByCategory('notes');
  const accountIcons = getIconsByCategory('account');
  const flagIcons = getIconsByCategory('flag');

  const renderIconCategory = (title: string, icons: typeof groupIcons) => {
    if (icons.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          {title}
        </Typography>
        <Grid container spacing={1}>
          {icons.map((icon) => {
            const isSelected = selectedIcons.includes(icon.id);
            return (
              <Grid key={icon.id}>
                <Tooltip title={`${icon.label}: ${icon.description}`} arrow>
                  <Chip
                    label={icon.icon}
                    onClick={() => handleIconToggle(icon.id)}
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      fontSize: '1.5rem',
                      minWidth: '48px',
                      height: '48px',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        transition: 'transform 0.2s',
                      },
                    }}
                  />
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Pet Icons
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select icons that apply to this pet. Hover over icons to see
        descriptions.
      </Typography>

      {/* Selected Icons Display */}
      {selectedIcons.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected ({selectedIcons.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedIcons.map((iconId) => {
              const icon = ALL_PET_ICONS.find((i) => i.id === iconId);
              if (!icon) return null;
              return (
                <Tooltip key={iconId} title={icon.label} arrow>
                  <Chip
                    label={icon.icon}
                    onDelete={() => handleIconToggle(iconId)}
                    color="primary"
                    sx={{ fontSize: '1.2rem' }}
                  />
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Available Icons by Category */}
      {renderIconCategory('Group Compatibility', groupIcons)}
      {renderIconCategory('Size', sizeIcons)}
      {renderIconCategory('Behavioral Alerts', behaviorIcons)}
      {renderIconCategory('Medical', medicalIcons)}
      {renderIconCategory('Handling', handlingIcons)}
      {renderIconCategory('Kennel/Room', kennelIcons)}
      {renderIconCategory('Notes & Communication', notesIcons)}
      {renderIconCategory('Account', accountIcons)}
      {renderIconCategory('Custom Flags', flagIcons)}
    </Paper>
  );
};

export default EmojiPetIconSelector;
