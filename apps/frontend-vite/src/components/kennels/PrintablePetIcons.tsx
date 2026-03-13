import React from 'react';
import { Box, Typography } from '@mui/material';
import { getIconById } from '../../constants/petIcons';

interface PrintablePetIconsProps {
  iconIds: string[];
  petType?: 'DOG' | 'CAT' | 'OTHER';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  customNotes?: { [iconId: string]: string };
}

/**
 * Component specifically designed for displaying pet icons in printable kennel cards
 * Includes fallback icons and print-specific styling
 */
const PrintablePetIcons: React.FC<PrintablePetIconsProps> = ({
  iconIds,
  petType = 'DOG',
  size = 'large',
  showLabels = true,
  customNotes = {}
}) => {
  // Log the incoming icon IDs for debugging
  
  // Ensure we have icons to display - IMPORTANT: don't modify the original array
  let displayIconIds = [...iconIds];
  
  // If no icons provided, add default ones based on pet type
  if (!displayIconIds || displayIconIds.length === 0) {
    
    if (petType === 'DOG') {
      displayIconIds = ['medium-size', 'small-group'];
    } else if (petType === 'CAT') {
      displayIconIds = ['small-size', 'solo-only'];
    } else {
      displayIconIds = ['small-size'];
    }
  }

  // Size mapping for icons
  const sizeMap = {
    small: {
      fontSize: '1.2rem',
      spacing: 0.5
    },
    medium: {
      fontSize: '1.5rem',
      spacing: 0.75
    },
    large: {
      fontSize: '1.8rem',
      spacing: 1
    }
  };

  const { fontSize, spacing } = sizeMap[size];

  // Log the display icon IDs before filtering
  
  // Filter out any invalid icon IDs
  const validIconIds = displayIconIds.filter(id => {
    const icon = getIconById(id);
    if (!icon) {
      return false;
    }
    return true;
  });
  
  
  // If we still have no valid icons, add a default one
  if (validIconIds.length === 0) {
    validIconIds.push('medium-size');
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: spacing,
        '@media print': {
          display: 'flex !important'
        }
      }} 
      className="printable-pet-icons-container"
    >
      {validIconIds.map(iconId => {
        const icon = getIconById(iconId);
        if (!icon) return null;
        
        return (
          <Box
            key={iconId}
            sx={{
              display: 'inline-flex',
              flexDirection: showLabels ? 'column' : 'row',
              alignItems: 'center',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '4px 8px',
              margin: '4px',
              backgroundColor: '#f9f9f9',
              '@media print': {
                display: 'inline-flex !important',
                backgroundColor: '#f9f9f9 !important',
                border: '1px solid #e0e0e0 !important',
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact'
              }
            }}
            className="printable-pet-icon-box"
          >
            <span 
              style={{ fontSize }} 
              className="printable-pet-icon-emoji"
            >
              {icon.icon}
            </span>
            {showLabels && (
              <Typography 
                variant="caption" 
                sx={{ 
                  mt: 0.5,
                  fontWeight: 'bold',
                  '@media print': {
                    display: 'block !important'
                  }
                }}
              >
                {icon.label}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default PrintablePetIcons;
