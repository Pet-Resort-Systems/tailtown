import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { getIconById } from '../../constants/petIcons';

interface PetIconsPreviewProps {
  iconIds?: string[];
  maxIcons?: number;
}

/**
 * A compact preview of pet icons for use in list views
 * Shows only the icons without labels and with a limit on how many to display
 */
const PetIconsPreview: React.FC<PetIconsPreviewProps> = ({ 
  iconIds = [], 
  maxIcons = 5 
}) => {
  if (!iconIds || iconIds.length === 0) {
    return null;
  }

  // Limit the number of icons shown
  const displayIcons = iconIds.slice(0, maxIcons);
  const remainingCount = iconIds.length - maxIcons;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {displayIcons.map(iconId => {
        const icon = getIconById(iconId);
        if (!icon) return null;
        
        return (
          <Tooltip
            key={iconId}
            title={icon.label}
            arrow
            placement="top"
          >
            <Box
              sx={{
                fontSize: '1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'background.paper'
              }}
            >
              {icon.icon}
            </Box>
          </Tooltip>
        );
      })}
      
      {remainingCount > 0 && (
        <Tooltip title={`${remainingCount} more icon${remainingCount > 1 ? 's' : ''}`} arrow>
          <Box
            sx={{
              fontSize: '0.75rem',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5'
            }}
          >
            +{remainingCount}
          </Box>
        </Tooltip>
      )}
    </Box>
  );
};

export default PetIconsPreview;
