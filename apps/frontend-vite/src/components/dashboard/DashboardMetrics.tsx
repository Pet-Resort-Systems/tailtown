import React from 'react';
import { Box } from '@mui/material';
import { 
  Login as InIcon, 
  Logout as OutIcon, 
  Hotel as OvernightIcon
} from '@mui/icons-material';
import MetricCard from './MetricCard';

interface DashboardMetricsProps {
  inCount: number | null;
  outCount: number | null;
  overnightCount: number | null;
  appointmentFilter: 'in' | 'out' | 'all';
  onFilterChange: (filter: 'in' | 'out' | 'all') => void;
}

/**
 * DashboardMetrics - Displays all key business metrics in a grid
 * Handles metric card clicks for filtering appointments
 */
const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  inCount,
  outCount,
  overnightCount,
  appointmentFilter,
  onFilterChange
}) => {
  const metrics = [
    { 
      title: 'In', 
      value: inCount, 
      icon: <InIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      onClick: () => onFilterChange('in'),
      isActive: appointmentFilter === 'in'
    },
    { 
      title: 'Out', 
      value: outCount, 
      icon: <OutIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      onClick: () => onFilterChange('out'),
      isActive: appointmentFilter === 'out'
    },
    { 
      title: 'Overnight', 
      value: overnightCount, 
      icon: <OvernightIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      onClick: undefined,
      isActive: false
    }
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
        gap: 2
      }}
    >
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          icon={metric.icon}
          onClick={metric.onClick}
          isActive={metric.isActive}
          isLoading={metric.value === null}
        />
      ))}
    </Box>
  );
};

export default DashboardMetrics;
