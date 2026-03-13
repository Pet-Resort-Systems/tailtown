import { useState, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Hook to detect device type and capabilities
 * Provides responsive breakpoints and device-specific features
 */
export const useDevice = (): DeviceInfo => {
  // Media queries for responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  // Detect if running as PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Detect Android
  const isAndroid = /Android/.test(navigator.userAgent);

  // Detect touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Track screen dimensions
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isPWA,
    isIOS,
    isAndroid,
    isTouchDevice,
    screenWidth,
    screenHeight,
  };
};

/**
 * Get device type as string
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Check if current device is mobile
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if device supports specific features
 */
export const supportsFeature = {
  camera: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
  geolocation: () => 'geolocation' in navigator,
  notifications: () => 'Notification' in window,
  serviceWorker: () => 'serviceWorker' in navigator,
  webShare: () => 'share' in navigator,
};
