import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { getCustomerIconById } from '../../constants/customerIcons';

interface CustomerIconBadgesProps {
  iconIds: string[];
  iconNotes?: Record<string, string>;
  maxDisplay?: number;
  size?: 'small' | 'medium';
}

/**
 * Display component for customer icon badges
 * Shows icons with tooltips and custom notes
 */
const CustomerIconBadges: React.FC<CustomerIconBadgesProps> = ({
  iconIds,
  iconNotes = {},
  maxDisplay = 10,
  size = 'small'
}) => {
  if (!iconIds || iconIds.length === 0) {
    return null;
  }

  const displayIcons = iconIds.slice(0, maxDisplay);
  const remainingCount = iconIds.length - maxDisplay;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {displayIcons.map((iconId) => {
        const iconDef = getCustomerIconById(iconId);
        if (!iconDef) return null;

        const hasNote = iconNotes[iconId];
        const tooltipTitle = hasNote 
          ? `${iconDef.description}\n\nNote: ${iconNotes[iconId]}`
          : iconDef.description;

        return (
          <Tooltip key={iconId} title={tooltipTitle} arrow>
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontSize: size === 'small' ? '0.9rem' : '1.1rem' }}>
                    {iconDef.icon}
                  </span>
                  <Typography variant="caption" sx={{ fontSize: size === 'small' ? '0.7rem' : '0.8rem' }}>
                    {iconDef.label}
                  </Typography>
                </Box>
              }
              size={size}
              sx={{
                height: size === 'small' ? 24 : 28,
                bgcolor: iconDef.color ? `${iconDef.color}20` : undefined,
                borderColor: iconDef.color,
                border: hasNote ? '2px solid' : '1px solid',
                borderStyle: hasNote ? 'solid' : 'solid',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
              variant="outlined"
            />
          </Tooltip>
        );
      })}
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

export default CustomerIconBadges;
