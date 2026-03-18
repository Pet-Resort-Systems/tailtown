import React, { ReactNode } from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  button?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, button }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="subtitle1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {button && <Box>{button}</Box>}
    </Paper>
  );
};

export default PageHeader;
