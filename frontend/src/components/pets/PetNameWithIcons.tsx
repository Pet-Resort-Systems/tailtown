import React, { memo, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../services/api";
import { Box, Typography, Tooltip, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ClickableAvatar from "./ClickableAvatar";

interface PetNameWithIconsProps {
  petName: string;
  petIcons?: string[];
  iconNotes?: { [iconId: string]: string };
  petType?: "DOG" | "CAT" | "OTHER";
  profilePhoto?: string | null;
  size?: "small" | "medium" | "large";
  showLabels?: boolean;
  showPhoto?: boolean;
  nameVariant?: "body1" | "body2" | "subtitle1" | "subtitle2" | "h6";
  nameColor?: string;
  direction?: "row" | "column";
  gap?: number;
}

/**
 * Optimized component that displays a pet name with associated icons
 * Used throughout the application for consistent pet identification
 * Memoized to prevent unnecessary re-renders
 */
const PetNameWithIcons: React.FC<PetNameWithIconsProps> = memo(
  ({
    petName,
    petIcons = [],
    iconNotes: _iconNotes = {},
    petType: _petType,
    profilePhoto,
    size = "small",
    showLabels: _showLabels = false,
    showPhoto = true,
    nameVariant = "body2",
    nameColor,
    direction = "row",
    gap = 1,
  }) => {
    const [photoModalOpen, setPhotoModalOpen] = useState(false);

    // Disable old petIcons system - we now use SpecialRequirementIcons instead
    const emojiIcons = useMemo(() => [], []);
    const hasIcons = useMemo(() => false, []);

    // Memoized size mapping for avatars
    const avatarSize = useMemo(() => {
      const sizeMap = { small: 24, medium: 32, large: 40 };
      return sizeMap[size];
    }, [size]);

    // Memoized profile photo URL
    const photoUrl = useMemo(() => {
      if (!profilePhoto) return undefined;
      // If profilePhoto is already a full URL, use it as-is
      if (profilePhoto.startsWith("http")) return profilePhoto;
      // Otherwise, use current origin for relative paths
      const baseUrl = getApiBaseUrl();
      return `${baseUrl}${profilePhoto}`;
    }, [profilePhoto]);

    // Add photo icon to display icons if pet has a photo
    const displayIcons = useMemo(() => {
      if (photoUrl) {
        return ["📷", ...emojiIcons];
      }
      return emojiIcons;
    }, [photoUrl, emojiIcons]);

    const hasDisplayIcons = displayIcons.length > 0;

    const handleIconClick = (icon: string, e: React.MouseEvent) => {
      if (icon === "📷" && photoUrl) {
        e.stopPropagation();
        setPhotoModalOpen(true);
      }
    };

    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: direction,
            alignItems: direction === "row" ? "center" : "flex-start",
            gap: gap,
          }}
        >
          {showPhoto && (
            <ClickableAvatar
              src={photoUrl}
              alt={petName}
              size={avatarSize}
              fontSize={
                size === "small"
                  ? "0.75rem"
                  : size === "medium"
                  ? "0.875rem"
                  : "1rem"
              }
            />
          )}

          <Typography
            variant={nameVariant}
            color={nameColor}
            sx={{
              fontWeight: hasDisplayIcons ? 500 : "normal",
              minWidth: "fit-content",
            }}
          >
            {petName}
          </Typography>

          {hasDisplayIcons && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                alignItems: "center",
              }}
            >
              {displayIcons.slice(0, 5).map((icon, index) => (
                <Tooltip
                  key={`${icon}-${index}`}
                  title={icon === "📷" ? "View Photo" : ""}
                  arrow
                >
                  <Box
                    onClick={(e) => handleIconClick(icon, e)}
                    sx={{
                      cursor: icon === "📷" ? "pointer" : "default",
                      fontSize: size === "small" ? "0.9rem" : "1.1rem",
                      padding: "2px 4px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(0,0,0,0.08)",
                      "&:hover":
                        icon === "📷"
                          ? {
                              backgroundColor: "rgba(25, 118, 210, 0.2)",
                              transform: "scale(1.1)",
                            }
                          : {},
                      transition: "all 0.2s",
                    }}
                  >
                    {icon}
                  </Box>
                </Tooltip>
              ))}
              {displayIcons.length > 5 && (
                <Box
                  sx={{
                    fontSize: size === "small" ? "0.75rem" : "0.9rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(0,0,0,0.08)",
                    color: "text.secondary",
                  }}
                >
                  +{displayIcons.length - 5}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Photo Modal */}
        <Dialog
          open={photoModalOpen}
          onClose={(e: React.SyntheticEvent) => {
            e.stopPropagation();
            setPhotoModalOpen(false);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          maxWidth="md"
          PaperProps={{
            sx: {
              backgroundColor: "transparent",
              boxShadow: "none",
              overflow: "visible",
            },
          }}
        >
          <Box
            sx={{ position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setPhotoModalOpen(false);
              }}
              sx={{
                position: "absolute",
                top: -40,
                right: 0,
                color: "white",
                backgroundColor: "rgba(0,0,0,0.5)",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}
            >
              <CloseIcon />
            </IconButton>
            {photoUrl && (
              <img
                src={photoUrl}
                alt={petName}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
            )}
            <Typography
              variant="h6"
              sx={{
                textAlign: "center",
                color: "white",
                mt: 1,
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              {petName}
            </Typography>
          </Box>
        </Dialog>
      </>
    );
  }
);

PetNameWithIcons.displayName = "PetNameWithIcons";

export default PetNameWithIcons;
