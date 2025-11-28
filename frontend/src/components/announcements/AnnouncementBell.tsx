import React, { useState } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import InfoIcon from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AddIcon from "@mui/icons-material/Add";
import { Announcement } from "./AnnouncementModal";

interface AnnouncementBellProps {
  announcements: Announcement[];
  onAnnouncementClick: () => void;
  onCreateClick?: () => void;
}

const AnnouncementBell: React.FC<AnnouncementBellProps> = ({
  announcements,
  onAnnouncementClick,
  onCreateClick,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewAll = () => {
    handleClose();
    onAnnouncementClick();
  };

  const handleCreate = () => {
    handleClose();
    if (onCreateClick) {
      onCreateClick();
    }
  };

  const getTypeIcon = (type: string) => {
    const iconProps = { fontSize: "small" as const };
    switch (type) {
      case "WARNING":
        return <WarningIcon {...iconProps} color="warning" />;
      case "SUCCESS":
        return <CheckCircleIcon {...iconProps} color="success" />;
      case "ERROR":
        return <ErrorIcon {...iconProps} color="error" />;
      default:
        return <InfoIcon {...iconProps} color="info" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "error";
      case "HIGH":
        return "warning";
      case "NORMAL":
        return "primary";
      default:
        return "default";
    }
  };

  const urgentCount = announcements.filter(
    (a) => a.priority === "URGENT"
  ).length;
  const badgeColor = urgentCount > 0 ? "error" : "primary";

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="announcements"
        sx={{ ml: 1 }}
      >
        <Badge badgeContent={announcements.length} color={badgeColor}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 360,
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" component="div">
            Announcements
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {announcements.length}{" "}
            {announcements.length === 1 ? "announcement" : "announcements"}
          </Typography>
        </Box>

        {announcements.length === 0
          ? [
              <MenuItem key="no-announcements" disabled>
                <ListItemText
                  primary="No announcements"
                  secondary="You're all caught up!"
                />
              </MenuItem>,
              ...(onCreateClick
                ? [
                    <Divider key="divider-create" />,
                    <MenuItem
                      key="create"
                      onClick={handleCreate}
                      sx={{
                        py: 1.5,
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": {
                          backgroundColor: "primary.dark",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                        <AddIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Create Announcement
                          </Typography>
                        }
                      />
                    </MenuItem>,
                  ]
                : []),
            ]
          : [
              ...announcements.slice(0, 5).map((announcement) => (
                <MenuItem
                  key={announcement.id}
                  onClick={handleViewAll}
                  sx={{
                    py: 1.5,
                    borderLeft: 3,
                    borderColor:
                      getPriorityColor(announcement.priority) + ".main",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getTypeIcon(announcement.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, flex: 1 }}
                        >
                          {announcement.title}
                        </Typography>
                        {announcement.priority !== "NORMAL" && (
                          <Chip
                            label={announcement.priority}
                            size="small"
                            color={
                              getPriorityColor(announcement.priority) as any
                            }
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {announcement.message}
                      </Typography>
                    }
                  />
                </MenuItem>
              )),
              ...(announcements.length > 5
                ? [
                    <Divider key="divider-1" />,
                    <MenuItem key="view-all" onClick={handleViewAll}>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            color="primary"
                            sx={{ textAlign: "center" }}
                          >
                            View all {announcements.length} announcements
                          </Typography>
                        }
                      />
                    </MenuItem>,
                  ]
                : []),
              ...(onCreateClick
                ? [
                    <Divider key="divider-2" />,
                    <MenuItem
                      key="create"
                      onClick={handleCreate}
                      sx={{
                        py: 1.5,
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": {
                          backgroundColor: "primary.dark",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                        <AddIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Create Announcement
                          </Typography>
                        }
                      />
                    </MenuItem>,
                  ]
                : []),
            ]}
      </Menu>
    </>
  );
};

export default AnnouncementBell;
