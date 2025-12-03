import React, { memo, useMemo } from "react";
import { getApiBaseUrl } from "../../services/api";
import { Box, Typography } from "@mui/material";
import EmojiIconDisplay from "../customers/EmojiIconDisplay";
import ClickableAvatar from "./ClickableAvatar";
import { mapPetIconsToEmojis } from "../../utils/petIconMapping";

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
    iconNotes = {},
    petType,
    profilePhoto,
    size = "small",
    showLabels = false,
    showPhoto = true,
    nameVariant = "body2",
    nameColor,
    direction = "row",
    gap = 1,
  }) => {
    // Convert icon IDs to emojis
    const emojiIcons = useMemo(() => mapPetIconsToEmojis(petIcons), [petIcons]);
    const hasIcons = useMemo(
      () => emojiIcons && emojiIcons.length > 0,
      [emojiIcons]
    );

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

    return (
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
            fontWeight: hasIcons ? 500 : "normal",
            minWidth: "fit-content",
          }}
        >
          {petName}
        </Typography>

        {hasIcons && (
          <EmojiIconDisplay
            icons={emojiIcons}
            size={size === "large" ? "medium" : size}
            maxDisplay={5}
          />
        )}
      </Box>
    );
  }
);

PetNameWithIcons.displayName = "PetNameWithIcons";

export default PetNameWithIcons;
