import React from "react";
import {
  Box,
  Chip,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ExpandMore,
  HealthAndSafety,
  Pets,
  Warning,
  ContentCut,
} from "@mui/icons-material";

interface FlagData {
  icon: string;
  color: string;
  title: string;
  content: string;
  category: string;
}

interface CompatibilityFlagsProps {
  healthFlags?: FlagData[];
  behaviorFlags?: FlagData[];
  aggressionFlags?: FlagData[];
  specialRequirements?: string[];
  compact?: boolean;
}

const CATEGORY_CONFIG = {
  health: {
    label: "Health & Medical",
    icon: HealthAndSafety,
    color: "#e617dd",
  },
  behavior: {
    label: "Behavior",
    icon: Pets,
    color: "#4bb4d2",
  },
  aggression: {
    label: "Aggression Warnings",
    icon: Warning,
    color: "#f2212e",
  },
  grooming: {
    label: "Grooming",
    icon: ContentCut,
    color: "#f1c232",
  },
};

const formatRequirement = (req: string): string => {
  return req
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

export const CompatibilityFlags: React.FC<CompatibilityFlagsProps> = ({
  healthFlags = [],
  behaviorFlags = [],
  aggressionFlags = [],
  specialRequirements = [],
  compact = false,
}) => {
  const hasAnyFlags =
    healthFlags.length > 0 ||
    behaviorFlags.length > 0 ||
    aggressionFlags.length > 0 ||
    specialRequirements.length > 0;

  if (!hasAnyFlags) {
    return compact ? null : (
      <Typography variant="body2" color="text.secondary">
        No special requirements
      </Typography>
    );
  }

  if (compact) {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {healthFlags.map((flag, idx) => (
          <Tooltip
            key={`health-${idx}`}
            title={flag.content || flag.title}
            arrow
          >
            <Chip
              label={flag.title}
              size="small"
              sx={{
                backgroundColor: flag.color,
                color: "white",
                fontSize: "0.7rem",
              }}
            />
          </Tooltip>
        ))}
        {behaviorFlags.map((flag, idx) => (
          <Tooltip
            key={`behavior-${idx}`}
            title={flag.content || flag.title}
            arrow
          >
            <Chip
              label={flag.title}
              size="small"
              sx={{
                backgroundColor: flag.color,
                color: "white",
                fontSize: "0.7rem",
              }}
            />
          </Tooltip>
        ))}
        {aggressionFlags.map((flag, idx) => (
          <Tooltip
            key={`aggression-${idx}`}
            title={flag.content || flag.title}
            arrow
          >
            <Chip
              label={flag.title}
              size="small"
              sx={{
                backgroundColor: flag.color,
                color: "white",
                fontSize: "0.7rem",
              }}
            />
          </Tooltip>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {healthFlags.length > 0 && (
        <Accordion defaultExpanded={aggressionFlags.length > 0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HealthAndSafety sx={{ color: CATEGORY_CONFIG.health.color }} />
              <Typography variant="subtitle2">
                {CATEGORY_CONFIG.health.label} ({healthFlags.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {healthFlags.map((flag, idx) => (
                <Tooltip key={idx} title={flag.content || ""} arrow>
                  <Chip
                    label={flag.title}
                    size="small"
                    sx={{
                      backgroundColor: flag.color,
                      color: "white",
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {behaviorFlags.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Pets sx={{ color: CATEGORY_CONFIG.behavior.color }} />
              <Typography variant="subtitle2">
                {CATEGORY_CONFIG.behavior.label} ({behaviorFlags.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {behaviorFlags.map((flag, idx) => (
                <Tooltip key={idx} title={flag.content || ""} arrow>
                  <Chip
                    label={flag.title}
                    size="small"
                    sx={{
                      backgroundColor: flag.color,
                      color: "white",
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {aggressionFlags.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Warning sx={{ color: CATEGORY_CONFIG.aggression.color }} />
              <Typography
                variant="subtitle2"
                sx={{
                  color: CATEGORY_CONFIG.aggression.color,
                  fontWeight: 600,
                }}
              >
                {CATEGORY_CONFIG.aggression.label} ({aggressionFlags.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {aggressionFlags.map((flag, idx) => (
                <Tooltip key={idx} title={flag.content || ""} arrow>
                  <Chip
                    label={flag.title}
                    size="small"
                    sx={{
                      backgroundColor: flag.color,
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {specialRequirements.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Special Requirements
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {specialRequirements.map((req, idx) => (
              <Chip
                key={idx}
                label={formatRequirement(req)}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
