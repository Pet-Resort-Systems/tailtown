/**
 * ResponsiveGrid Component
 * 
 * A grid component that automatically adjusts column count based on screen size.
 * Perfect for displaying cards, items, or any grid-based layout.
 */

import React from 'react';
import { Grid, GridProps } from '@mui/material';
import { getResponsiveColumns } from '../../utils/responsive';

interface ResponsiveGridProps extends Omit<GridProps, 'container' | 'item'> {
  /**
   * Children to render in the grid
   */
  children: React.ReactNode;
  
  /**
   * Number of columns on mobile (< 600px)
   * @default 1
   */
  mobileColumns?: number;
  
  /**
   * Number of columns on tablet (600px - 900px)
   * @default 2
   */
  tabletColumns?: number;
  
  /**
   * Number of columns on desktop (900px - 1200px)
   * @default 3
   */
  desktopColumns?: number;
  
  /**
   * Number of columns on large desktop (>= 1200px)
   * @default 4
   */
  largeDesktopColumns?: number;
  
  /**
   * Spacing between grid items
   * @default 2
   */
  spacing?: number;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  largeDesktopColumns = 4,
  spacing = 2,
  sx,
  ...props
}) => {
  const columns = getResponsiveColumns(
    mobileColumns,
    tabletColumns,
    desktopColumns,
    largeDesktopColumns
  );
  
  return (
    <Grid container spacing={spacing} sx={sx} {...props}>
      {React.Children.map(children, (child) => (
        <Grid
          item
          xs={12 / columns.xs}
          sm={12 / columns.sm}
          md={12 / columns.md}
          lg={12 / columns.lg}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

export default ResponsiveGrid;
