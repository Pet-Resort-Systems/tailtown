import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { PieChartProps } from './types';

// Lazy load the actual chart component
const PieChartComponent = lazy(() => import('./PieChartComponent'));

/**
 * Lazy-loaded wrapper for PieChart from recharts
 * Reduces initial bundle size by loading charts only when needed
 */
const LazyPieChart: React.FC<PieChartProps> = (props) => {
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
      <PieChartComponent {...props} />
    </Suspense>
  );
};

export default LazyPieChart;
