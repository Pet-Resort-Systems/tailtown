/**
 * ServiceSelection - Step 1: Choose service type
 * Mobile-first design with card-based selection
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Avatar,
} from "@mui/material";
import {
  Hotel as BoardingIcon,
  WbSunny as DaycareIcon,
  ContentCut as GroomingIcon,
  School as TrainingIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { serviceManagement } from "../../../services/serviceManagement";

interface Service {
  id: string;
  name: string;
  description: string;
  serviceCategory: string;
  price: number;
  duration?: number;
}

interface ServiceSelectionProps {
  bookingData: any;
  onNext: () => void;
  onUpdate: (data: any) => void;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({
  bookingData,
  onNext,
  onUpdate,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadServices();
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await serviceManagement.getAllServices();

      // Handle different response formats
      const serviceData = response.data?.data || response.data || [];
      setServices(serviceData);

      // Pre-select if serviceId provided
      if (bookingData.serviceId) {
        const preSelected = serviceData.find(
          (s: Service) => s.id === bookingData.serviceId
        );
        if (preSelected) {
          setSelectedService(preSelected);
        }
      }

      setError("");
    } catch (err: any) {
      console.error("Error loading services:", err);
      setError("Unable to load services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    onUpdate({
      serviceId: service.id,
      serviceName: service.name,
      serviceCategory: service.serviceCategory,
      servicePrice: service.price,
    });
    // Auto-advance to next step after brief delay for visual feedback
    setTimeout(() => {
      onNext();
    }, 300);
  };

  // handleContinue removed - auto-advance on selection

  const getServiceIcon = (category: string) => {
    switch (category.toUpperCase()) {
      case "BOARDING":
        return <BoardingIcon sx={{ fontSize: { xs: 40, sm: 48 } }} />;
      case "DAYCARE":
        return <DaycareIcon sx={{ fontSize: { xs: 40, sm: 48 } }} />;
      case "GROOMING":
        return <GroomingIcon sx={{ fontSize: { xs: 40, sm: 48 } }} />;
      case "TRAINING":
        return <TrainingIcon sx={{ fontSize: { xs: 40, sm: 48 } }} />;
      default:
        return <BoardingIcon sx={{ fontSize: { xs: 40, sm: 48 } }} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toUpperCase()) {
      case "BOARDING":
        return "#1976d2";
      case "DAYCARE":
        return "#ff9800";
      case "GROOMING":
        return "#9c27b0";
      case "TRAINING":
        return "#4caf50";
      default:
        return "#757575";
    }
  };

  const groupServicesByCategory = () => {
    const grouped: { [key: string]: Service[] } = services.reduce(
      (acc, service) => {
        const category = service.serviceCategory;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(service);
        return acc;
      },
      {} as Record<string, Service[]>
    );

    // Define category order for display - Boarding and Daycare first
    const categoryOrder = ["BOARDING", "DAYCARE", "GROOMING", "TRAINING"];

    return categoryOrder.reduce((acc, category) => {
      if (grouped[category]) {
        acc.push([category, grouped[category]]);
      }
      return acc;
    }, [] as [string, Service[]][]);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
        <Button onClick={loadServices} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const groupedServices = groupServicesByCategory();

  return (
    <Box>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
          fontWeight: 600,
          mb: 3,
        }}
      >
        What service would you like to book?
      </Typography>

      {groupedServices.map(([category, categoryServices]) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Box sx={{ color: getCategoryColor(category), mr: 1 }}>
              {getServiceIcon(category)}
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "1rem", sm: "1.25rem" },
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {category.toLowerCase()}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {categoryServices.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <Card
                  elevation={selectedService?.id === service.id ? 8 : 2}
                  sx={{
                    height: "100%",
                    border:
                      selectedService?.id === service.id
                        ? "3px solid"
                        : "1px solid",
                    borderColor:
                      selectedService?.id === service.id
                        ? "primary.main"
                        : "divider",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        sx={{
                          width: { xs: 36, sm: 40 },
                          height: { xs: 36, sm: 40 },
                          bgcolor: getCategoryColor(service.serviceCategory),
                          fontSize: { xs: "1.1rem", sm: "1.25rem" },
                        }}
                      >
                        {getServiceIcon(service.serviceCategory)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          component="h3"
                          sx={{
                            fontSize: { xs: "0.875rem", sm: "0.95rem" },
                            fontWeight: 600,
                            lineHeight: 1.2,
                            mb: 0.25,
                          }}
                        >
                          {service.name}
                        </Typography>
                        {service.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.7rem", sm: "0.75rem" },
                              lineHeight: 1.3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {service.description}
                          </Typography>
                        )}
                      </Box>
                      {selectedService?.id === service.id && (
                        <CheckCircleIcon
                          color="primary"
                          sx={{ fontSize: { xs: 20, sm: 24 }, flexShrink: 0 }}
                        />
                      )}
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="h6"
                          color="primary"
                          fontWeight={700}
                          sx={{ fontSize: { xs: "0.95rem", sm: "1.1rem" } }}
                        >
                          ${service.price.toFixed(2)}
                        </Typography>
                        {service.duration && (
                          <Chip
                            label={`${service.duration} min`}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: { xs: 18, sm: 20 },
                              fontSize: { xs: "0.6rem", sm: "0.65rem" },
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                        )}
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        size="small"
                        onClick={() => handleServiceSelect(service)}
                        sx={{
                          py: { xs: 0.5, sm: 0.75 },
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          fontWeight: 600,
                          textTransform: "none",
                        }}
                      >
                        Reserve Now
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default ServiceSelection;
