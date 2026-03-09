import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AnnouncementModalProps {
  open: boolean;
  announcements: Announcement[];
  onClose: () => void;
  onDismiss: (id: string) => void;
  isAuthenticated?: boolean;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  open,
  announcements,
  onClose,
  onDismiss,
  isAuthenticated = false,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const currentAnnouncement = announcements[currentIndex];
  const hasMultiple = announcements.length > 1;

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDismiss = () => {
    if (currentAnnouncement) {
      onDismiss(currentAnnouncement.id);

      // Move to next announcement or close if this was the last one
      if (currentIndex < announcements.length - 1) {
        setCurrentIndex(currentIndex);
      } else if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        onClose();
      }
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "WARNING":
        return <WarningIcon />;
      case "SUCCESS":
        return <CheckCircleIcon />;
      case "ERROR":
        return <ErrorIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getTypeSeverity = (
    type: string
  ): "info" | "warning" | "success" | "error" => {
    switch (type) {
      case "WARNING":
        return "warning";
      case "SUCCESS":
        return "success";
      case "ERROR":
        return "error";
      default:
        return "info";
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

  if (!currentAnnouncement) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: 4,
          borderColor: getPriorityColor(currentAnnouncement.priority) + ".main",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {getTypeIcon(currentAnnouncement.type)}
          <Typography variant="h6" component="span">
            {currentAnnouncement.title}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {currentAnnouncement.priority !== "NORMAL" && (
            <Chip
              label={currentAnnouncement.priority}
              color={getPriorityColor(currentAnnouncement.priority) as any}
              size="small"
            />
          )}
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert
          severity={getTypeSeverity(currentAnnouncement.type)}
          sx={{ mb: 2 }}
        >
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {currentAnnouncement.message}
          </Typography>
        </Alert>

        {hasMultiple && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 1 }}
          >
            Announcement {currentIndex + 1} of {announcements.length}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Box>
          {hasMultiple && (
            <>
              <Button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                size="small"
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentIndex === announcements.length - 1}
                size="small"
              >
                Next
              </Button>
            </>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={handleClose} variant="contained" color="primary">
            Close
          </Button>
          {isAuthenticated && (
            <Button
              onClick={handleDismiss}
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
            >
              Dismiss Forever
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default AnnouncementModal;
