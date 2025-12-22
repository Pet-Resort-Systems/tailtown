import React from "react";
import { Box, Tooltip } from "@mui/material";

export type SpecialRequirement =
  | "HAS_MEDICATION"
  | "MEDICAL_MONITORING"
  | "ALLERGIES"
  | "HEAT_SENSITIVE"
  | "NO_POOL"
  | "NO_LEASH_ON_NECK"
  | "BLIND"
  | "DEAF"
  | "SPECIAL_NEEDS"
  | "SEIZURE_WATCH"
  | "HEART_ISSUE"
  | "CONTROLLED_SUBSTANCE"
  | "NEEDS_EXTRA_BEDDING"
  | "SEPARATE_FEEDING"
  | "POOP_EATER"
  | "STRONG_PULLER"
  | "CHEWER"
  | "NO_BEDDING"
  | "EXCESSIVE_MOUNTER"
  | "LOVES_POOL"
  | "RUNNER"
  | "NO_COT"
  | "EXCESSIVE_DRINKER"
  | "TOY_AGGRESSIVE"
  | "LEASH_AGGRESSIVE"
  | "BITER"
  | "USE_CAUTION"
  | "FENCE_FIGHTER"
  | "ROOM_AGGRESSIVE"
  | "MALE_AGGRESSIVE"
  | "GENERAL_AGGRESSION"
  | "PREFERRED_GROOMER"
  | "GROOMING_NOTES"
  | "PERMANENT_RUN_CARD"
  | "SENIOR_DISCOUNT"
  | "DO_NOT_BOOK";

interface RequirementConfig {
  icon: string;
  label: string;
  color: string;
  priority: number; // Higher priority shows first
}

export const SPECIAL_REQUIREMENT_CONFIG: Record<
  SpecialRequirement,
  RequirementConfig
> = {
  // Critical Safety (Red - Priority 10)
  BITER: { icon: "🦷", label: "Biter", color: "#d32f2f", priority: 10 },
  USE_CAUTION: {
    icon: "⚠️",
    label: "Use Caution",
    color: "#d32f2f",
    priority: 10,
  },
  GENERAL_AGGRESSION: {
    icon: "⚡",
    label: "General Aggression",
    color: "#d32f2f",
    priority: 10,
  },
  DO_NOT_BOOK: {
    icon: "🚫",
    label: "Do Not Book",
    color: "#d32f2f",
    priority: 10,
  },

  // Aggression Types (Orange - Priority 9)
  TOY_AGGRESSIVE: {
    icon: "🎾",
    label: "Toy Aggressive",
    color: "#f57c00",
    priority: 9,
  },
  LEASH_AGGRESSIVE: {
    icon: "🔗",
    label: "Leash Aggressive",
    color: "#f57c00",
    priority: 9,
  },
  FENCE_FIGHTER: {
    icon: "🏃",
    label: "Fence Fighter",
    color: "#f57c00",
    priority: 9,
  },
  ROOM_AGGRESSIVE: {
    icon: "🚪",
    label: "Room Aggressive",
    color: "#f57c00",
    priority: 9,
  },
  MALE_AGGRESSIVE: {
    icon: "♂️",
    label: "Male Aggressive",
    color: "#f57c00",
    priority: 9,
  },

  // Medical Critical (Red - Priority 8)
  SEIZURE_WATCH: {
    icon: "🚨",
    label: "Seizure Watch",
    color: "#d32f2f",
    priority: 8,
  },
  HEART_ISSUE: {
    icon: "💔",
    label: "Heart Issue",
    color: "#d32f2f",
    priority: 8,
  },
  CONTROLLED_SUBSTANCE: {
    icon: "💊",
    label: "Controlled Substance",
    color: "#d32f2f",
    priority: 8,
  },

  // Medical Important (Purple - Priority 7)
  HAS_MEDICATION: {
    icon: "💊",
    label: "Has Medication",
    color: "#7b1fa2",
    priority: 7,
  },
  MEDICAL_MONITORING: {
    icon: "🩺",
    label: "Medical Monitoring",
    color: "#7b1fa2",
    priority: 7,
  },
  ALLERGIES: { icon: "🤧", label: "Allergies", color: "#7b1fa2", priority: 7 },

  // Physical Limitations (Blue - Priority 6)
  BLIND: { icon: "👁️", label: "Blind", color: "#1976d2", priority: 6 },
  DEAF: { icon: "👂", label: "Deaf", color: "#1976d2", priority: 6 },
  SPECIAL_NEEDS: {
    icon: "♿",
    label: "Special Needs",
    color: "#1976d2",
    priority: 6,
  },
  HEAT_SENSITIVE: {
    icon: "🌡️",
    label: "Heat Sensitive",
    color: "#1976d2",
    priority: 6,
  },
  SENIOR_DISCOUNT: {
    icon: "🐕",
    label: "Senior Dog - Contract Required",
    color: "#1976d2",
    priority: 6,
  },

  // Behavioral (Yellow - Priority 5)
  RUNNER: { icon: "🏃", label: "Runner", color: "#f9a825", priority: 5 },
  STRONG_PULLER: {
    icon: "💪",
    label: "Strong Puller",
    color: "#f9a825",
    priority: 5,
  },
  CHEWER: { icon: "🦴", label: "Chewer", color: "#f9a825", priority: 5 },
  EXCESSIVE_MOUNTER: {
    icon: "🐕",
    label: "Excessive Mounter",
    color: "#f9a825",
    priority: 5,
  },
  POOP_EATER: {
    icon: "💩",
    label: "Poop Eater",
    color: "#f9a825",
    priority: 5,
  },
  EXCESSIVE_DRINKER: {
    icon: "💧",
    label: "Excessive Drinker",
    color: "#f9a825",
    priority: 5,
  },

  // Care Instructions (Green - Priority 4)
  SEPARATE_FEEDING: {
    icon: "🍽️",
    label: "Separate Feeding",
    color: "#388e3c",
    priority: 4,
  },
  NO_POOL: { icon: "🏊", label: "No Pool", color: "#388e3c", priority: 4 },
  LOVES_POOL: {
    icon: "🏊",
    label: "Loves Pool",
    color: "#00897b",
    priority: 4,
  },
  NO_LEASH_ON_NECK: {
    icon: "🔗",
    label: "No Leash on Neck",
    color: "#388e3c",
    priority: 4,
  },
  NEEDS_EXTRA_BEDDING: {
    icon: "🛏️",
    label: "Needs Extra Bedding",
    color: "#388e3c",
    priority: 4,
  },
  NO_BEDDING: {
    icon: "🚫",
    label: "No Bedding",
    color: "#388e3c",
    priority: 4,
  },
  NO_COT: { icon: "🛏️", label: "No Cot", color: "#388e3c", priority: 4 },

  // Administrative (Gray - Priority 3)
  PERMANENT_RUN_CARD: {
    icon: "🎫",
    label: "Permanent Run Card",
    color: "#616161",
    priority: 3,
  },
  PREFERRED_GROOMER: {
    icon: "✂️",
    label: "Preferred Groomer",
    color: "#616161",
    priority: 3,
  },
  GROOMING_NOTES: {
    icon: "📝",
    label: "Grooming Notes",
    color: "#616161",
    priority: 3,
  },
};

interface SpecialRequirementIconsProps {
  requirements: SpecialRequirement[];
  maxDisplay?: number;
  size?: "small" | "medium";
}

export const SpecialRequirementIcons: React.FC<
  SpecialRequirementIconsProps
> = ({ requirements, maxDisplay = 5, size = "small" }) => {
  if (!requirements || requirements.length === 0) {
    return null;
  }

  // Sort by priority (highest first)
  const sortedRequirements = [...requirements].sort((a, b) => {
    const configA = SPECIAL_REQUIREMENT_CONFIG[a];
    const configB = SPECIAL_REQUIREMENT_CONFIG[b];
    return (configB?.priority || 0) - (configA?.priority || 0);
  });

  const displayRequirements = sortedRequirements.slice(0, maxDisplay);
  const remainingCount = sortedRequirements.length - maxDisplay;

  const fontSize = size === "small" ? "0.9rem" : "1.1rem";
  const padding = size === "small" ? "2px 4px" : "4px 6px";

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        alignItems: "center",
      }}
    >
      {displayRequirements.map((req) => {
        const config = SPECIAL_REQUIREMENT_CONFIG[req];
        if (!config) return null;

        return (
          <Tooltip key={req} title={config.label} arrow>
            <Box
              sx={{
                fontSize,
                padding,
                borderRadius: "4px",
                backgroundColor: "rgba(0,0,0,0.08)",
                border: `1px solid ${config.color}`,
                cursor: "default",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: config.color,
                  transform: "scale(1.1)",
                },
              }}
            >
              {config.icon}
            </Box>
          </Tooltip>
        );
      })}
      {remainingCount > 0 && (
        <Tooltip
          title={`${remainingCount} more: ${sortedRequirements
            .slice(maxDisplay)
            .map((req) => SPECIAL_REQUIREMENT_CONFIG[req]?.label)
            .join(", ")}`}
          arrow
        >
          <Box
            sx={{
              fontSize: size === "small" ? "0.75rem" : "0.9rem",
              padding,
              borderRadius: "4px",
              backgroundColor: "rgba(0,0,0,0.08)",
              color: "text.secondary",
              cursor: "default",
            }}
          >
            +{remainingCount}
          </Box>
        </Tooltip>
      )}
    </Box>
  );
};
