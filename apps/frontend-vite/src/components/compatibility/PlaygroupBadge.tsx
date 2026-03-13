import React from "react";
import { Chip, Tooltip } from "@mui/material";
import {
  Groups,
  Person,
  SupervisorAccount,
  HelpOutline,
} from "@mui/icons-material";

export type PlaygroupCompatibility =
  | "LARGE_DOG"
  | "MEDIUM_DOG"
  | "SMALL_DOG"
  | "NON_COMPATIBLE"
  | "SENIOR_STAFF_REQUIRED"
  | "UNKNOWN"
  | null;

interface PlaygroupBadgeProps {
  compatibility: PlaygroupCompatibility;
  size?: "small" | "medium";
  showIcon?: boolean;
}

const PLAYGROUP_CONFIG = {
  LARGE_DOG: {
    label: "Large Group",
    color: "#8dc7a0",
    icon: Groups,
    description: "Suitable for large dog playgroup",
  },
  MEDIUM_DOG: {
    label: "Medium Group",
    color: "#c04de8",
    icon: Groups,
    description: "Suitable for medium dog playgroup",
  },
  SMALL_DOG: {
    label: "Small Group",
    color: "#697db0",
    icon: Groups,
    description: "Suitable for small dog playgroup",
  },
  NON_COMPATIBLE: {
    label: "Solo Only",
    color: "#ff4a81",
    icon: Person,
    description: "Not compatible with playgroups - individual care only",
  },
  SENIOR_STAFF_REQUIRED: {
    label: "Senior Staff",
    color: "#d1b41e",
    icon: SupervisorAccount,
    description: "Requires senior staff supervision",
  },
  UNKNOWN: {
    label: "Unknown",
    color: "#f77c0a",
    icon: HelpOutline,
    description: "Compatibility not yet determined",
  },
};

export const PlaygroupBadge: React.FC<PlaygroupBadgeProps> = ({
  compatibility,
  size = "small",
  showIcon = true,
}) => {
  if (!compatibility) return null;

  const config = PLAYGROUP_CONFIG[compatibility];
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <Tooltip title={config.description} arrow>
      <Chip
        icon={
          showIcon ? (
            <IconComponent sx={{ color: "white !important" }} />
          ) : undefined
        }
        label={config.label}
        size={size}
        sx={{
          backgroundColor: config.color,
          color: "white",
          fontWeight: 500,
          "& .MuiChip-icon": {
            color: "white",
          },
        }}
      />
    </Tooltip>
  );
};
