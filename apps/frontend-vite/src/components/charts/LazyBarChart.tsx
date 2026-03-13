import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { BarChartProps } from './types';

// Lazy load the actual chart component
const BarChartComponent = lazy(() => import('./BarChartComponent'));

/**
 * Lazy-loaded wrapper for BarChart from recharts
 * Reduces initial bundle size by loading charts only when needed
 */
const LazyBarChart: React.FC<BarChartProps> = (props) => {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 300
          }}
        >
          <CircularProgress size={30} />
        </Box>
      }
    >
      <BarChartComponent {...props} />
    </Suspense>
  );
};

export default LazyBarChart;
