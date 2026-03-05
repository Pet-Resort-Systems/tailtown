import React, { ReactNode } from 'react';
import { useDevice } from '../hooks/useDevice';
import { MobileLayout } from './MobileLayout';
// Desktop layout will be imported when we integrate with existing app
// import { DesktopLayout } from './DesktopLayout';

interface ResponsiveLayoutProps {
  children: ReactNode;
  forceMobile?: boolean;
  forceDesktop?: boolean;
}

/**
 * Responsive layout that switches between mobile and desktop layouts
 * based on device detection
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  forceMobile = false,
  forceDesktop = false,
}) => {
  const { isMobile } = useDevice();

  // Determine which layout to use
  const useMobileLayout = forceMobile || (!forceDesktop && isMobile);

  if (useMobileLayout) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  // For now, return children directly for desktop
  // This will be replaced with DesktopLayout integration
  return <>{children}</>;
};
