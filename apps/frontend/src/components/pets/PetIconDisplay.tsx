import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { getIconById } from '../../constants/petIcons';

interface PetIconDisplayProps {
  iconIds: string[];
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  customNotes?: { [iconId: string]: string };
}

/**
 * Component for displaying selected pet icons
 */
const PetIconDisplay: React.FC<PetIconDisplayProps> = ({
  iconIds,
  size = 'medium',
  showLabels = false,
  customNotes = {}
}) => {
  // Log the icon IDs for debugging
  
  if (!iconIds || iconIds.length === 0) {
    return null;
  }

  // Size mapping for icons
  const sizeMap = {
    small: {
      fontSize: '1rem',
      spacing: 0.5
    },
    medium: {
      fontSize: '1.2rem',
      spacing: 0.75
    },
    large: {
      fontSize: '1.5rem',
      spacing: 1
    }
  };

  const { fontSize, spacing } = sizeMap[size];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: spacing }} className="pet-icons-container">
      {iconIds.map(iconId => {
        const icon = getIconById(iconId);
        
        // Skip if icon not found or missing required properties
        if (!icon || !icon.icon || !icon.label) {
          console.warn(`Icon not found or invalid: ${iconId}`);
          return null;
        }
        
        const customNote = customNotes?.[iconId];
        const tooltipTitle = (
          <>
            <Typography variant="subtitle2">{icon.label}</Typography>
            {icon.description && <Typography variant="body2">{icon.description}</Typography>}
            {customNote && (
              <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                Note: {customNote}
              </Typography>
            )}
          </>
        );

        return (
          <Tooltip
            key={iconId}
            title={tooltipTitle}
            arrow
            placement="top"
          >
            <Box
              sx={{
                display: 'inline-flex',
                flexDirection: showLabels ? 'column' : 'row',
                alignItems: 'center',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '2px 4px',
                backgroundColor: 'background.paper'
              }}
              className="pet-icon-box"
            >
              <span style={{ fontSize }} className="pet-icon-emoji">{icon.icon}</span>
              {showLabels && (
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {icon.label}
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default PetIconDisplay;
