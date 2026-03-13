import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Badge,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  notificationCount?: number;
  userAvatar?: string;
  userName?: string;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onBack?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack = false,
  showNotifications = true,
  showMenu = false,
  notificationCount = 0,
  userAvatar,
  userName,
  onMenuClick,
  onNotificationsClick,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleNotificationsClick = () => {
    if (onNotificationsClick) {
      onNotificationsClick();
    } else {
      // Default: navigate to chat page (where messages/notifications are)
      navigate('/mobile/chat');
    }
  };

  const handleProfileClick = () => {
    navigate('/mobile/profile');
  };

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar
        sx={{
          minHeight: 56,
          px: 1,
        }}
      >
        {/* Left side - Back button or Menu */}
        {showBack && (
          <IconButton
            edge="start"
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            <BackIcon />
          </IconButton>
        )}
        {showMenu && (
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Center - Title */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            fontSize: '1.125rem',
          }}
        >
          {title}
        </Typography>

        {/* Right side - Notifications and Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showNotifications && (
            <IconButton onClick={handleNotificationsClick}>
              <Badge badgeContent={notificationCount} color="error" max={99}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          )}
          
          {userAvatar || userName ? (
            <IconButton 
              onClick={handleProfileClick}
              sx={{ p: 0.5 }}
            >
              <Avatar
                src={userAvatar}
                alt={userName}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {!userAvatar && userName ? userName.charAt(0).toUpperCase() : null}
              </Avatar>
            </IconButton>
          ) : null}
        </Box>
      </Toolbar>
    </AppBar>
  );
};
