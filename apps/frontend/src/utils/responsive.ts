/**
 * Responsive Design Utilities
 * 
 * Centralized utilities for handling responsive design across the application.
 * Uses Material-UI breakpoints: xs (0px), sm (600px), md (900px), lg (1200px), xl (1536px)
 */

import { useTheme, useMediaQuery } from '@mui/material';
import type { Breakpoint } from '@mui/material';

/**
 * Hook to detect current breakpoint
 * @returns Object with boolean flags for each breakpoint
 */
export const useResponsive = () => {
  const theme = useTheme();
  
  return {
    isMobile: useMediaQuery(theme.breakpoints.down('sm')), // < 600px
    isTablet: useMediaQuery(theme.breakpoints.between('sm', 'md')), // 600px - 900px
    isDesktop: useMediaQuery(theme.breakpoints.up('md')), // >= 900px
    isLargeDesktop: useMediaQuery(theme.breakpoints.up('lg')), // >= 1200px
    isXLarge: useMediaQuery(theme.breakpoints.up('xl')), // >= 1536px
    
    // Specific breakpoint checks
    isXs: useMediaQuery(theme.breakpoints.only('xs')),
    isSm: useMediaQuery(theme.breakpoints.only('sm')),
    isMd: useMediaQuery(theme.breakpoints.only('md')),
    isLg: useMediaQuery(theme.breakpoints.only('lg')),
    isXl: useMediaQuery(theme.breakpoints.only('xl')),
  };
};

/**
 * Hook to get responsive value based on breakpoint
 * @param values Object with values for each breakpoint
 * @returns Value for current breakpoint
 */
export const useResponsiveValue = <T,>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  default: T;
}): T => {
  const theme = useTheme();
  
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  
  if (isXl && values.xl !== undefined) return values.xl;
  if (isLg && values.lg !== undefined) return values.lg;
  if (isMd && values.md !== undefined) return values.md;
  if (isSm && values.sm !== undefined) return values.sm;
  if (isXs && values.xs !== undefined) return values.xs;
  
  return values.default;
};

/**
 * Responsive spacing helper
 * Returns appropriate spacing values for different screen sizes
 */
export const getResponsiveSpacing = (
  mobile: number,
  tablet: number,
  desktop: number
) => ({
  xs: mobile,
  sm: tablet,
  md: desktop,
});

/**
 * Responsive grid columns helper
 * Returns appropriate column counts for different screen sizes
 */
export const getResponsiveColumns = (
  mobile: number = 1,
  tablet: number = 2,
  desktop: number = 3,
  largeDesktop: number = 4
) => ({
  xs: mobile,
  sm: tablet,
  md: desktop,
  lg: largeDesktop,
});

/**
 * Responsive font size helper
 * Returns appropriate font sizes for different screen sizes
 */
export const getResponsiveFontSize = (
  mobile: string | number,
  tablet: string | number,
  desktop: string | number
) => ({
  xs: mobile,
  sm: tablet,
  md: desktop,
});

/**
 * Check if device is touch-enabled
 */
export const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

/**
 * Get optimal table pagination size based on screen size
 */
export const getResponsivePageSize = (
  isMobile: boolean,
  isTablet: boolean
): number => {
  if (isMobile) return 5;
  if (isTablet) return 10;
  return 25;
};

/**
 * Get responsive dialog/modal width
 */
export const getResponsiveDialogWidth = (
  isMobile: boolean,
  isTablet: boolean
): string | number => {
  if (isMobile) return '95%';
  if (isTablet) return '80%';
  return 600;
};

/**
 * Responsive calendar view helper
 * Returns appropriate calendar view for screen size
 */
export const getResponsiveCalendarView = (
  isMobile: boolean,
  isTablet: boolean
): 'day' | 'week' | 'month' => {
  if (isMobile) return 'day';
  if (isTablet) return 'week';
  return 'month';
};

/**
 * Responsive card layout helper
 * Returns appropriate card layout props
 */
export const getResponsiveCardLayout = (isMobile: boolean) => ({
  direction: isMobile ? 'column' : 'row',
  spacing: isMobile ? 1 : 2,
  alignItems: isMobile ? 'stretch' : 'center',
});

/**
 * Responsive button size helper
 */
export const getResponsiveButtonSize = (
  isMobile: boolean
): 'small' | 'medium' | 'large' => {
  return isMobile ? 'small' : 'medium';
};

/**
 * Responsive icon size helper
 */
export const getResponsiveIconSize = (
  isMobile: boolean
): 'small' | 'medium' | 'large' => {
  return isMobile ? 'small' : 'medium';
};

/**
 * Hide element on specific breakpoints
 */
export const hideOn = (breakpoint: Breakpoint | Breakpoint[]) => {
  const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
  return {
    display: {
      ...breakpoints.reduce((acc, bp) => ({
        ...acc,
        [bp]: 'none',
      }), {}),
    },
  };
};

/**
 * Show element only on specific breakpoints
 */
export const showOnlyOn = (breakpoint: Breakpoint | Breakpoint[]) => {
  const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
  const allBreakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  
  return {
    display: {
      ...allBreakpoints.reduce((acc, bp) => ({
        ...acc,
        [bp]: breakpoints.includes(bp) ? 'block' : 'none',
      }), {}),
    },
  };
};

/**
 * Responsive container max-width helper
 */
export const getResponsiveMaxWidth = (
  isMobile: boolean,
  isTablet: boolean
): string | number => {
  if (isMobile) return '100%';
  if (isTablet) return 720;
  return 1200;
};

/**
 * Responsive drawer width helper
 */
export const getResponsiveDrawerWidth = (
  isMobile: boolean
): number => {
  return isMobile ? 280 : 240;
};

/**
 * Responsive table density helper
 */
export const getResponsiveTableDensity = (
  isMobile: boolean
): 'comfortable' | 'compact' | 'standard' => {
  return isMobile ? 'compact' : 'standard';
};
