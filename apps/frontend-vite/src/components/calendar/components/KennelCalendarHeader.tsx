import React, { memo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Tooltip
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarViewMonth as CalendarViewMonthIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  CalendarViewDay as CalendarViewDayIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { KennelType } from '../../../hooks/useKennelData';
import { useResponsive, getResponsiveButtonSize } from '../../../utils/responsive';

// Define the view types
type ViewType = 'month' | 'week' | 'day';

interface KennelCalendarHeaderProps {
  currentDate: Date;
  viewType: ViewType;
  kennelTypeFilter: KennelType | 'ALL';
  onDateChange: (date: Date) => void;
  onViewTypeChange: (viewType: ViewType) => void;
  onKennelTypeFilterChange: (filter: KennelType | 'ALL') => void;
  onTodayClick: () => void;
}

/**
 * Header component for the KennelCalendar with navigation and filter controls
 * Memoized to prevent unnecessary re-renders
 */
const KennelCalendarHeader: React.FC<KennelCalendarHeaderProps> = memo(({
  currentDate,
  viewType,
  kennelTypeFilter,
  onDateChange,
  onViewTypeChange,
  onKennelTypeFilterChange,
  onTodayClick
}) => {
  // Responsive hooks
  const { isMobile } = useResponsive();
  
  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    onDateChange(newDate);
  };

  // Format the current date display
  const formatCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long'
    };
    
    if (viewType === 'day') {
      options.day = 'numeric';
      options.weekday = 'long';
    }
    
    return currentDate.toLocaleDateString('en-US', options);
  };

  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      {/* Flexible container that wraps naturally */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Date Navigation - will wrap to new line if needed */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 1 },
          flexShrink: 0,
          minWidth: 'fit-content'
        }}>
          <Tooltip title="Previous">
            <IconButton 
              onClick={navigatePrevious} 
              size={getResponsiveButtonSize(isMobile)}
            >
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          
          <Typography 
            variant={isMobile ? 'subtitle1' : 'h6'} 
            sx={{ 
              textAlign: 'center',
              fontSize: { xs: '0.9rem', sm: '1.25rem' },
              whiteSpace: 'nowrap'
            }}
          >
            {formatCurrentDate()}
          </Typography>
          
          <Tooltip title="Next">
            <IconButton 
              onClick={navigateNext} 
              size={getResponsiveButtonSize(isMobile)}
            >
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Today">
            <Button
              variant="outlined"
              size="small"
              startIcon={<TodayIcon />}
              onClick={onTodayClick}
              sx={{ 
                ml: { xs: 0.5, sm: 2 },
                display: { xs: 'none', sm: 'inline-flex' }
              }}
            >
              Today
            </Button>
          </Tooltip>
        </Box>

        {/* View Type and Filter Controls - will wrap to new line if needed */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, md: 2 },
          flexShrink: 1,
          minWidth: 'fit-content'
        }}>
          {/* View Type Selector */}
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <Tooltip title="Month View">
              <IconButton
                onClick={() => onViewTypeChange('month')}
                color={viewType === 'month' ? 'primary' : 'default'}
                size={getResponsiveButtonSize(isMobile)}
              >
                <CalendarViewMonthIcon fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Week View">
              <IconButton
                onClick={() => onViewTypeChange('week')}
                color={viewType === 'week' ? 'primary' : 'default'}
                size={getResponsiveButtonSize(isMobile)}
              >
                <CalendarViewWeekIcon fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Day View">
              <IconButton
                onClick={() => onViewTypeChange('day')}
                color={viewType === 'day' ? 'primary' : 'default'}
                size={getResponsiveButtonSize(isMobile)}
              >
                <CalendarViewDayIcon fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Room Size Filter */}
          <FormControl
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{
              minWidth: { xs: 120, sm: 150 },
              maxWidth: { xs: 180, sm: 200 },
              flexShrink: 1
            }}
          >
            <InputLabel>Room Size</InputLabel>
            <Select
              value={kennelTypeFilter}
              label="Room Size"
              onChange={(e) => onKennelTypeFilterChange(e.target.value as KennelType | 'ALL')}
            >
              <MenuItem value="ALL">All Sizes</MenuItem>
              <MenuItem value="JUNIOR">Junior (1)</MenuItem>
              <MenuItem value="QUEEN">Queen (2)</MenuItem>
              <MenuItem value="KING">King (3)</MenuItem>
              <MenuItem value="VIP">VIP (4)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
});

KennelCalendarHeader.displayName = 'KennelCalendarHeader';

export default KennelCalendarHeader;
