import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Mobile-optimized Material-UI theme
 * Extends the base theme with mobile-specific overrides
 */
export const mobileThemeOptions: ThemeOptions = {
  // Mobile-optimized typography
  typography: {
    fontSize: 16, // Prevent iOS zoom on input focus
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '1rem',
      fontWeight: 600,
      textTransform: 'none', // No uppercase on mobile
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
  },

  // Mobile-optimized spacing
  spacing: 8, // Base spacing unit

  // Mobile-friendly breakpoints
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,  // Mobile breakpoint
      lg: 1024, // Tablet breakpoint
      xl: 1280,
    },
  },

  // Component overrides for mobile
  components: {
    // AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
    },

    // Buttons - larger touch targets
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '1rem',
          fontWeight: 600,
        },
        sizeLarge: {
          minHeight: 48,
          padding: '12px 24px',
          fontSize: '1.0625rem',
        },
        sizeSmall: {
          minHeight: 36,
          padding: '6px 16px',
          fontSize: '0.875rem',
        },
      },
    },

    // Icon buttons - larger touch targets
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 12,
          '&.MuiIconButton-sizeLarge': {
            padding: 16,
          },
          '&.MuiIconButton-sizeSmall': {
            padding: 8,
          },
        },
      },
    },

    // Cards - mobile-optimized
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },

    // Card content - better mobile spacing
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },

    // List items - larger touch targets
    MuiListItem: {
      styleOverrides: {
        root: {
          minHeight: 56,
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
    },

    // List item button - better touch feedback
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 56,
          '&:active': {
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },

    // Text fields - prevent iOS zoom
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input': {
            fontSize: '1rem',
          },
        },
      },
    },

    // Input base - mobile-friendly
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
        },
        input: {
          minHeight: 44,
          padding: '12px 14px',
        },
      },
    },

    // Bottom navigation - mobile-specific
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 64,
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },

    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 60,
          padding: '6px 12px 8px',
          '&.Mui-selected': {
            paddingTop: 6,
          },
        },
        label: {
          fontSize: '0.75rem',
          marginTop: 4,
          '&.Mui-selected': {
            fontSize: '0.75rem',
          },
        },
      },
    },

    // Chip - mobile-optimized
    MuiChip: {
      styleOverrides: {
        root: {
          height: 28,
          fontSize: '0.8125rem',
        },
        sizeSmall: {
          height: 24,
          fontSize: '0.75rem',
        },
      },
    },

    // Avatar - mobile sizes
    MuiAvatar: {
      styleOverrides: {
        root: {
          width: 40,
          height: 40,
          fontSize: '1rem',
        },
      },
    },

    // Badge - mobile-optimized
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontSize: '0.625rem',
          minWidth: 18,
          height: 18,
          padding: '0 4px',
        },
      },
    },

    // Dialog - full screen on mobile
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 768px)': {
            margin: 0,
            maxHeight: '100%',
            maxWidth: '100%',
            width: '100%',
            height: '100%',
            borderRadius: 0,
          },
        },
      },
    },

    // Drawer - full width on mobile
    MuiDrawer: {
      styleOverrides: {
        paper: {
          '@media (max-width: 768px)': {
            width: '85%',
            maxWidth: 320,
          },
        },
      },
    },

    // Fab - mobile positioning
    MuiFab: {
      styleOverrides: {
        root: {
          width: 56,
          height: 56,
        },
      },
    },

    // Snackbar - mobile positioning
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            bottom: 80, // Above bottom nav
            left: 16,
            right: 16,
          },
        },
      },
    },
  },
};

/**
 * Create mobile theme
 * Can be merged with base theme or used standalone
 */
export const createMobileTheme = (baseTheme?: ThemeOptions) => {
  return createTheme({
    ...baseTheme,
    ...mobileThemeOptions,
    // Deep merge components
    components: {
      ...baseTheme?.components,
      ...mobileThemeOptions.components,
    },
  });
};
