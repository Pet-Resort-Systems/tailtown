import React from 'react';
import { Paper, Box, Typography, CircularProgress } from '@mui/material';

interface MetricCardProps {
  title: string;
  value: number | string | React.ReactNode | null;
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  isLoading?: boolean;
}

/**
 * MetricCard - Displays a single metric with icon and optional click handler
 * Used on the Dashboard to show key business metrics
 * 
 * Performance: Memoized to prevent unnecessary re-renders when parent updates
 */
const MetricCard: React.FC<MetricCardProps> = React.memo(({
  title,
  value,
  icon,
  onClick,
  isActive = false,
  isLoading = false
}) => {
  const displayValue = React.useMemo(() => 
    isLoading || value === null 
      ? <CircularProgress size={20} /> 
      : value,
    [isLoading, value]
  );

  return (
    <Paper
      elevation={2}
      onClick={onClick}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 70,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isActive ? 1 : 0.9,
        border: isActive ? 2 : 0,
        borderColor: isActive ? 'primary.main' : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        } : {}
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="subtitle2" component="div" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
          {displayValue}
        </Typography>
      </Box>
      <Box sx={{ transform: 'scale(0.8)' }}>
        {icon}
      </Box>
    </Paper>
  );
});

MetricCard.displayName = 'MetricCard';

export default MetricCard;
