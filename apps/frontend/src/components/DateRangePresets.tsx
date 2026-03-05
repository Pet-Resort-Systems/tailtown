/**
 * Date Range Presets Component
 * Provides quick date range selection buttons
 */

import React from 'react';
import { Box, Button, ButtonGroup } from '@mui/material';

interface DateRangePresetsProps {
  onSelectRange: (startDate: string, endDate: string) => void;
  size?: 'small' | 'medium' | 'large';
}

export const DateRangePresets: React.FC<DateRangePresetsProps> = ({ 
  onSelectRange,
  size = 'small'
}) => {
  const getDateRange = (preset: string): { start: string; end: string } => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start: Date;

    switch (preset) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        return {
          start: start.toISOString().split('T')[0],
          end: start.toISOString().split('T')[0]
        };
      case 'last7':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case 'last30':
        start = new Date(today);
        start.setDate(start.getDate() - 30);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: start.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        };
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'lastYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        return {
          start: start.toISOString().split('T')[0],
          end: lastYearEnd.toISOString().split('T')[0]
        };
      default:
        start = today;
    }

    return {
      start: start.toISOString().split('T')[0],
      end
    };
  };

  const handlePresetClick = (preset: string) => {
    const { start, end } = getDateRange(preset);
    onSelectRange(start, end);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      <ButtonGroup size={size} variant="outlined">
        <Button onClick={() => handlePresetClick('today')}>Today</Button>
        <Button onClick={() => handlePresetClick('yesterday')}>Yesterday</Button>
        <Button onClick={() => handlePresetClick('last7')}>Last 7 Days</Button>
        <Button onClick={() => handlePresetClick('last30')}>Last 30 Days</Button>
      </ButtonGroup>
      <ButtonGroup size={size} variant="outlined">
        <Button onClick={() => handlePresetClick('thisMonth')}>This Month</Button>
        <Button onClick={() => handlePresetClick('lastMonth')}>Last Month</Button>
        <Button onClick={() => handlePresetClick('thisYear')}>This Year</Button>
        <Button onClick={() => handlePresetClick('lastYear')}>Last Year</Button>
      </ButtonGroup>
    </Box>
  );
};

export default DateRangePresets;
