/**
 * ResponsiveContainer Component
 * 
 * A flexible container component that adapts its layout and spacing
 * based on screen size. Provides consistent responsive behavior across the app.
 */

import React from 'react';
import { Container, ContainerProps } from '@mui/material';
import { useResponsive, getResponsiveSpacing, getResponsiveMaxWidth } from '../../utils/responsive';

interface ResponsiveContainerProps extends Omit<ContainerProps, 'maxWidth'> {
  /**
   * Children to render inside the container
   */
  children: React.ReactNode;
  
  /**
   * Whether to add padding
   * @default true
   */
  padding?: boolean;
  
  /**
   * Custom padding values for different breakpoints
   */
  customPadding?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  
  /**
   * Whether to center content
   * @default false
   */
  center?: boolean;
  
  /**
   * Background color
   */
  backgroundColor?: string;
  
  /**
   * Whether to use full width
   * @default false
   */
  fullWidth?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  padding = true,
  customPadding,
  center = false,
  backgroundColor,
  fullWidth = false,
  sx,
  ...props
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  const defaultPadding = {
    mobile: customPadding?.mobile ?? 2,
    tablet: customPadding?.tablet ?? 3,
    desktop: customPadding?.desktop ?? 4,
  };
  
  const maxWidth = fullWidth ? false : getResponsiveMaxWidth(isMobile, isTablet);
  
  return (
    <Container
      maxWidth={fullWidth ? false : 'lg'}
      sx={{
        ...(padding && {
          p: getResponsiveSpacing(
            defaultPadding.mobile,
            defaultPadding.tablet,
            defaultPadding.desktop
          ),
        }),
        ...(center && {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }),
        ...(backgroundColor && {
          backgroundColor,
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Container>
  );
};

export default ResponsiveContainer;
