import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface PageLoaderProps {
  message?: string;
}

/**
 * Loading component shown while lazy-loaded pages are being fetched
 */
const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        gap: 2
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default PageLoader;
