import React from 'react';
import { Box, Chip } from '@mui/material';

interface EmojiIconDisplayProps {
  icons: string[];
  maxDisplay?: number;
  size?: 'small' | 'medium';
}

/**
 * Simple component to display emoji icons directly
 * Used for customerIcons and petIcons that contain emoji strings
 */
const EmojiIconDisplay: React.FC<EmojiIconDisplayProps> = ({
  icons,
  maxDisplay = 10,
  size = 'small'
}) => {
  if (!icons || icons.length === 0) {
    return null;
  }

  // Filter out any null or empty values
  const validIcons = icons.filter(icon => icon && icon.trim());
  
  if (validIcons.length === 0) {
    return null;
  }

  const displayIcons = validIcons.slice(0, maxDisplay);
  const remainingCount = validIcons.length - maxDisplay;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {displayIcons.map((icon, index) => (
        <Chip
          key={`${icon}-${index}`}
          label={icon}
          size={size}
          sx={{
            height: size === 'small' ? 24 : 28,
            fontSize: size === 'small' ? '0.9rem' : '1.1rem',
            '& .MuiChip-label': {
              px: 0.5,
            },
          }}
        />
      ))}
      {remainingCount > 0 && (
        <Chip
          label={`+${remainingCount}`}
          size={size}
          variant="outlined"
          sx={{ height: size === 'small' ? 24 : 28 }}
        />
      )}
    </Box>
  );
};

export default EmojiIconDisplay;
