/**
 * CustomerDashboard - Customer account management portal
 *
 * Features:
 * - View upcoming reservations
 * - View past reservations
 * - Update pet information
 * - View/purchase daycare passes
 * - View account balance
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  History as HistoryIcon,
  Pets as PetsIcon,
  CardGiftcard as PassIcon,
  AccountBalance as BalanceIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  CustomerAuthProvider,
  useCustomerAuth,
} from '../../contexts/CustomerAuthContext';
import CustomerAuth from './CustomerAuth';

// Tab components
import UpcomingReservations from './account/UpcomingReservations';
import PastReservations from './account/PastReservations';
import MyPets from './account/MyPets';
import DaycarePasses from './account/DaycarePasses';
import AccountBalance from './account/AccountBalance';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CustomerDashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { customer, isAuthenticated, isLoading, logout } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/book');
  };

  const handleNewBooking = () => {
    navigate('/book');
  };

  // Show loading
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show auth if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Sign In | My Account</title>
        </Helmet>
        <CustomerAuth onSuccess={() => {}} />
      </>
    );
  }

  const tabs = [
    {
      label: 'Upcoming',
      icon: <CalendarIcon />,
      component: <UpcomingReservations />,
    },
    {
      label: 'History',
      icon: <HistoryIcon />,
      component: <PastReservations />,
    },
    { label: 'My Pets', icon: <PetsIcon />, component: <MyPets /> },
    { label: 'Passes', icon: <PassIcon />, component: <DaycarePasses /> },
    { label: 'Balance', icon: <BalanceIcon />, component: <AccountBalance /> },
  ];

  return (
    <>
      <Helmet>
        <title>My Account | Tailtown Pet Resort</title>
        <meta
          name="description"
          content="Manage your reservations, pets, and account at Tailtown Pet Resort"
        />
      </Helmet>

      {/* App Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/book')}
            sx={{ mr: 2 }}
          >
            <HomeIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Account
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewBooking}
            sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
          >
            New Booking
          </Button>

          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              {customer?.firstName?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {customer?.firstName} {customer?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {customer?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate('/book');
              }}
            >
              <AddIcon sx={{ mr: 1 }} /> New Booking
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> Sign Out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Welcome Message */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            Welcome back, {customer?.firstName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your reservations, pets, and account details
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper elevation={2} sx={{ borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.9rem',
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                id={`account-tab-${index}`}
                aria-controls={`account-tabpanel-${index}`}
              />
            ))}
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {tabs.map((tab, index) => (
              <TabPanel key={index} value={activeTab} index={index}>
                {tab.component}
              </TabPanel>
            ))}
          </Box>
        </Paper>

        {/* Mobile New Booking Button */}
        <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 3 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<AddIcon />}
            onClick={handleNewBooking}
          >
            Make a New Booking
          </Button>
        </Box>
      </Container>
    </>
  );
};

// Wrapper with auth provider
const CustomerDashboard: React.FC = () => {
  return (
    <CustomerAuthProvider>
      <CustomerDashboardContent />
    </CustomerAuthProvider>
  );
};

export default CustomerDashboard;
