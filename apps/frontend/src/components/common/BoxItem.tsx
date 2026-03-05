import React from 'react';
import { Box, Theme } from '@mui/material';
import { SxProps } from '@mui/system';

type BoxItemProps = {
  children?: React.ReactNode;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  sx?: SxProps<Theme>;
  key?: string | number;
};

const BoxItem = React.forwardRef<HTMLDivElement, BoxItemProps>((props, ref) => {
  const { children, xs, sm, md, lg, xl, sx = {}, ...other } = props;
  
  // Convert grid props to flex basis in sx
  const getFlexBasis = (value: number | boolean | undefined) => {
    if (typeof value === 'number') {
      return `${(value / 12) * 100}%`;
    }
    return value ? '100%' : undefined;
  };

  const gridSx = {
    flexBasis: getFlexBasis(xs),
    '@media (min-width: 600px)': { flexBasis: getFlexBasis(sm) },
    '@media (min-width: 900px)': { flexBasis: getFlexBasis(md) },
    '@media (min-width: 1200px)': { flexBasis: getFlexBasis(lg) },
    '@media (min-width: 1536px)': { flexBasis: getFlexBasis(xl) },
    ...sx
  };

  return (
    <Box ref={ref} sx={gridSx} {...other}>
      {children}
    </Box>
  );
});

BoxItem.displayName = 'BoxItem';

export default BoxItem;
