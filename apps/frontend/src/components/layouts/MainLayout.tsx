import React, { useState, useEffect } from 'react';
import { SvgIconComponent } from '@mui/icons-material';
import {
  Outlet,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import logoImage from '../../assets/images/tail town logo.jpg';
import {
  AppBar,
  Box,
  CircularProgress,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Pets as PetsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Hotel as SuitesIcon,
  ContentCut as GroomingIcon,
  FitnessCenter as TrainingIcon,
  Home as DaycareIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Print as PrintIcon,
  InsertChart as AnalyticsIcon,
  CreditCard as PaymentIcon,
  AssessmentOutlined as ReportIcon,
  ShoppingCart as ShoppingCartIcon,
  PhotoCamera as ReportCardIcon,
  NotificationsActive as WaitlistIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessSettings } from '../../utils/permissions';
import ImpersonationBanner from '../super-admin/ImpersonationBanner';
import AnnouncementBell from '../announcements/AnnouncementBell';
import AnnouncementModal from '../announcements/AnnouncementModal';
import announcementService from '../../services/announcementService';
import type { Announcement } from '../announcements/AnnouncementModal';
import { useHelp } from '../../contexts/HelpContext';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const drawerWidth = 240;

interface NavItem {
  path: string;
  label: string;
  icon: SvgIconComponent;
  children?: NavItem[];
}

/**
 * Safely construct profile photo URL with error handling
 * @param profilePhoto - Relative path to profile photo
 * @returns Full URL to profile photo or undefined if invalid
 */
const getProfilePhotoUrl = (
  profilePhoto: string | null | undefined,
): string | undefined => {
  if (!profilePhoto) return undefined;

  try {
    const envUrl = process.env.REACT_APP_API_URL;
    const baseUrl =
      envUrl && envUrl.length > 0 ? envUrl : window.location.origin;

    // Ensure profilePhoto starts with /
    const path = profilePhoto.startsWith('/')
      ? profilePhoto
      : `/${profilePhoto}`;
    return `${baseUrl}${path}`;
  } catch (error) {
    console.error('Error constructing profile photo URL:', error);
    return undefined;
  }
};

const MainLayout = ({ children }: { children?: React.ReactNode }) => {
  // 1. All hooks must be called unconditionally at the top level
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  // Don't initialize from cache - always fetch fresh to ensure correct tenant logo
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const { user, logout, isLoading } = useAuth();
  const { openHelp } = useHelp();
  const location = useLocation();
  const navigate = useNavigate();

  // Load announcements and business settings on mount
  useEffect(() => {
    loadAnnouncements();
    loadBusinessSettings();
  }, []);

  // Reload announcements when modal opens to catch any new announcements
  useEffect(() => {
    if (showAnnouncementModal) {
      loadAnnouncements();
    }
  }, [showAnnouncementModal]);

  // Reload announcements when navigating back from admin pages
  useEffect(() => {
    loadAnnouncements();
  }, [location.pathname]);

  const loadAnnouncements = async () => {
    const data = await announcementService.getActiveAnnouncements();
    setAnnouncements(data);
  };

  const loadBusinessSettings = async () => {
    try {
      // Use dynamic API URL based on environment
      const envUrl = process.env.REACT_APP_API_URL;
      const API_URL =
        envUrl && envUrl.length > 0 ? envUrl : window.location.origin;
      const tenantId =
        localStorage.getItem('tailtown_tenant_id') ||
        localStorage.getItem('tenantId');
      const token =
        localStorage.getItem('accessToken') || localStorage.getItem('token');
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Add tenant subdomain header if available (backend expects x-tenant-subdomain)
      if (tenantId) {
        headers['x-tenant-subdomain'] = tenantId;
      }

      const response = await fetch(`${API_URL}/api/business-settings`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.logoUrl) {
          const logoUrl = `${API_URL}${data.logoUrl}`;
          setCustomLogo(logoUrl);
          // Cache in localStorage to prevent flash on reload
          localStorage.setItem('businessLogo', logoUrl);
        } else {
          // No custom logo, remove from cache
          localStorage.removeItem('businessLogo');
        }
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  const handleDismissAnnouncement = async (id: string) => {
    try {
      await announcementService.dismissAnnouncement(id);
      // Only remove if dismiss was successful
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      console.log('Announcement dismissed successfully');
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
      // Don't remove from state if dismiss failed
      alert('Unable to dismiss announcement. Please try again later.');
    }
  };

  // 2. Event handlers
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 3. Early returns for loading and unauthenticated states
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleSubMenuToggle = (label: string) => {
    setOpenSubMenu(openSubMenu === label ? null : label);
  };

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { path: '/calendar', label: 'Boarding & Daycare', icon: DaycareIcon },
    { path: '/calendar/grooming', label: 'Grooming', icon: GroomingIcon },
    { path: '/calendar/training', label: 'Training', icon: TrainingIcon },
    { path: '/customers', label: 'Customers', icon: PeopleIcon },
    { path: '/pets', label: 'Pets', icon: PetsIcon },
    { path: '/report-cards', label: 'Report Cards', icon: ReportCardIcon },
    { path: '/waitlist', label: 'Waitlist', icon: WaitlistIcon },
    { path: '/products', label: 'Products & POS', icon: ShoppingCartIcon },
    {
      path: '/suites',
      label: 'Kennels',
      icon: SuitesIcon,
      children: [
        { path: '/suites', label: 'Kennel Board', icon: SuitesIcon },
        {
          path: '/kennels/print-cards',
          label: 'Print Kennel Cards',
          icon: PrintIcon,
        },
      ],
    },
    // Hidden while building calendar-integrated ordering functionality
    // { path: '/reservations', label: 'Reservations', icon: EventNoteIcon },
    // { path: '/orders/new', label: 'New Order', icon: OrdersIcon },
    {
      path: '/reports',
      label: 'Reports',
      icon: AnalyticsIcon,
      children: [
        { path: '/reports', label: 'All Reports', icon: ReportIcon },
        { path: '/analytics', label: 'Sales Dashboard', icon: ReportIcon },
        {
          path: '/analytics/customers',
          label: 'Customer Value',
          icon: PaymentIcon,
        },
      ],
    },
  ];

  const drawer = (
    <div>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 2,
          px: 1,
        }}
      >
        <Box
          sx={{
            width: '140px',
            height: '140px',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src={customLogo || logoImage}
            alt="Business Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: customLogo ? 'scale(1)' : 'scale(1.2)',
            }}
          />
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) =>
          item.children ? (
            <React.Fragment key={item.path}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleSubMenuToggle(item.label)}
                  selected={location.pathname.startsWith(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  {openSubMenu === item.label ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </ListItemButton>
              </ListItem>
              {openSubMenu === item.label && (
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.path} disablePadding>
                      <ListItemButton
                        component={Link}
                        to={child.path}
                        selected={location.pathname === child.path}
                        onClick={handleDrawerToggle}
                        sx={{
                          pl: 4,
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                            '&:hover': {
                              backgroundColor: 'primary.main',
                            },
                            '& .MuiListItemIcon-root': {
                              color: 'primary.contrastText',
                            },
                          },
                        }}
                      >
                        <ListItemIcon>
                          <child.icon />
                        </ListItemIcon>
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </React.Fragment>
          ) : (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                onClick={handleDrawerToggle}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <item.icon />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ),
        )}
      </List>
      {/* Admin link - only visible to Managers and Administrators */}
      {canAccessSettings(user?.role) && (
        <>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/settings">
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Admin" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Announcement Modal */}
      <AnnouncementModal
        open={showAnnouncementModal}
        announcements={announcements}
        onClose={() => setShowAnnouncementModal(false)}
        onDismiss={handleDismissAnnouncement}
        isAuthenticated={!!user}
      />

      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navItems.find((item) => item.path === location.pathname)?.label ||
              'Dashboard'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="body2"
                sx={{ textAlign: 'right', lineHeight: 1.2 }}
              >
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography
                variant="caption"
                color="inherit"
                sx={{ opacity: 0.8 }}
              >
                {user?.role || 'Staff'}
              </Typography>
            </Box>
            <AnnouncementBell
              announcements={announcements}
              onAnnouncementClick={() => setShowAnnouncementModal(true)}
              onCreateClick={() => navigate('/admin/announcements')}
            />
            <IconButton
              color="inherit"
              onClick={() => openHelp()}
              aria-label="help"
              sx={{ ml: 1 }}
            >
              <HelpOutlineIcon />
            </IconButton>
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
            >
              <Avatar
                src={getProfilePhotoUrl((user as any)?.profilePhoto)}
                sx={{
                  bgcolor: 'secondary.main',
                  border: '2px solid white',
                }}
              >
                {!(user as any)?.profilePhoto && (user?.firstName?.[0] || 'U')}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem
              onClick={() => {
                handleProfileMenuClose();
                navigate('/profile');
              }}
            >
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation menu"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {/* Show impersonation banner if active */}
        {localStorage.getItem('impersonationSession') && (
          <ImpersonationBanner onExit={() => {}} />
        )}
        {children || <Outlet />}
      </Box>
    </Box>
  );
};

export default MainLayout;
