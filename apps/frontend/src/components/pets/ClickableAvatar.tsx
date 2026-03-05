import React, { useState } from 'react';
import { Avatar, Dialog, DialogContent, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ClickableAvatarProps {
  src?: string;
  alt: string;
  size: number;
  fontSize?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * ClickableAvatar Component
 * 
 * An avatar that opens a full-size photo modal when clicked.
 * If no photo is provided, shows initials and doesn't open modal.
 * 
 * Features:
 * - Click to view full-size photo
 * - Modal with close button
 * - Hover effect to indicate clickability
 * - Falls back to initials if no photo
 * 
 * @param src - URL of the photo
 * @param alt - Alt text (typically pet name)
 * @param size - Avatar size in pixels
 * @param fontSize - Font size for initials
 * @param onClick - Optional click handler (called before opening modal)
 */
const ClickableAvatar: React.FC<ClickableAvatarProps> = ({
  src,
  alt,
  size,
  fontSize,
  onClick
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleAvatarClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent triggering parent click handlers
    e.stopPropagation();
    
    // Call optional onClick handler
    if (onClick) {
      onClick(e);
    }
    
    // Only open modal if there's a photo
    if (src) {
      setModalOpen(true);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  return (
    <>
      <Avatar
        src={src}
        alt={alt}
        onClick={handleAvatarClick}
        sx={{
          width: size,
          height: size,
          fontSize: fontSize,
          cursor: src ? 'pointer' : 'default',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': src ? {
            transform: 'scale(1.1)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          } : {}
        }}
      >
        {alt.charAt(0).toUpperCase()}
      </Avatar>

      {/* Full-size photo modal */}
      <Dialog
        open={modalOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogContent sx={{ position: 'relative', p: 0, bgcolor: 'black' }}>
          {/* Close button */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              },
              zIndex: 1
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Full-size image */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
              maxHeight: '80vh',
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClickableAvatar;
