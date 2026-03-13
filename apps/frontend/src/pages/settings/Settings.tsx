import React, { useState, useEffect } from "react";
import {
  getApiBaseUrl } from "../../services/api";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useNavigate } from "react-router-dom";
import {
  LocalOffer as ServicesIcon,
  Inventory as ResourcesIcon,
  Schedule as ScheduleIcon,
  People as UsersIcon,
  AttachMoney as PriceRulesIcon,
  Campaign as MarketingIcon,
  Assignment as CheckInIcon,
  ChecklistRtl as ChecklistIcon,
  Vaccines as VaccineIcon,
  ContentCut as GroomingIcon,
  School as TrainingIcon,
  EmojiEmotions as IconsIcon,
  ShoppingCart as ProductsIcon,
  Payment as PaymentIcon,
  Business as BusinessIcon,
  CardGiftcard as LoyaltyIcon,
  ConfirmationNumber as CouponIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Work as OperationsIcon,
  Group as CustomersIcon,
  Storefront as SalesIcon,
  Palette as BrandingIcon,
  Description as AgreementIcon,
} from "@mui/icons-material";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | false>("business-setup");
  const [productCount, setProductCount] = useState<number>(0);

  useEffect(() => {
    const fetchProductCount = async () => {
      try {
        const apiUrl = getApiBaseUrl();
        const tenantId = localStorage.getItem("tailtown_tenant_id") || "dev";
        const response = await fetch(`${apiUrl}/api/products`, {
          headers: { "x-tenant-id": tenantId },
        });
        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.data)) {
          setProductCount(data.data.length);
        }
      } catch (error) {
        console.error("Error fetching product count:", error);
      }
    };
    fetchProductCount();
  }, []);

  const handleAccordionChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const categories = [
    {
      id: "business-setup",
      title: "Business Setup",
      subtitle: "Core settings and configuration",
      icon: <SettingsIcon sx={{ fontSize: 28, color: "primary.main" }} />,
      color: "primary.main",
      sections: [
        {
          title: "Business Settings",
          description: "Upload your business logo and customize branding",
          icon: <BusinessIcon sx={{ fontSize: 40, color: "primary.main" }} />,
          path: "/settings/business",
          stats: "Customize Logo",
        },
        {
          title: "Services",
          description:
            "Manage boarding, daycare, grooming, and training services",
          icon: <ServicesIcon sx={{ fontSize: 40, color: "primary.main" }} />,
          path: "/services",
          stats: "Active Services: 12",
        },
        {
          title: "Resources",
          description: "Manage suites, equipment, and facility resources",
          icon: <ResourcesIcon sx={{ fontSize: 40, color: "info.main" }} />,
          path: "/resources",
          stats: "Total Resources: 173",
        },
        {
          title: "Payment Methods",
          description:
            "Configure accepted payment methods and CardConnect integration",
          icon: <PaymentIcon sx={{ fontSize: 40, color: "success.main" }} />,
          path: "/settings/payment-methods",
          stats: "Active Methods: 3",
        },
        {
          title: "Daycare Passes",
          description:
            "Configure multi-day pass packages with discounted pricing",
          icon: <CouponIcon sx={{ fontSize: 40, color: "secondary.main" }} />,
          path: "/admin/daycare-passes",
          stats: "Pass Packages",
        },
      ],
    },
    {
      id: "operations",
      title: "Daily Operations",
      subtitle: "Scheduling, appointments, and workflows",
      icon: <OperationsIcon sx={{ fontSize: 28, color: "warning.main" }} />,
      color: "warning.main",
      sections: [
        {
          title: "Staff Scheduling",
          description: "Manage employee schedules and work assignments",
          icon: <ScheduleIcon sx={{ fontSize: 40, color: "warning.main" }} />,
          path: "/staff/scheduling",
          stats: "Active Staff: 8",
        },
        {
          title: "Check-In Templates",
          description:
            "Configure check-in questionnaires, fields, and pre-populated options",
          icon: <CheckInIcon sx={{ fontSize: 40, color: "success.main" }} />,
          path: "/admin/check-in-templates",
          stats: "Templates: 1",
        },
        {
          title: "Service Agreements",
          description:
            "Create and manage service agreement templates with digital signature capture",
          icon: <AgreementIcon sx={{ fontSize: 40, color: "primary.main" }} />,
          path: "/settings/service-agreements",
          stats: "Agreement Templates",
        },
        {
          title: "Checklist Templates",
          description:
            "Manage operational checklists for kennel check-in/out, grooming, and facility tasks",
          icon: <ChecklistIcon sx={{ fontSize: 40, color: "info.main" }} />,
          path: "/admin/checklist-templates",
          stats: "Active Templates: 0",
        },
        {
          title: "Groomer Appointments",
          description:
            "Manage grooming appointments, schedules, and groomer assignments",
          icon: <GroomingIcon sx={{ fontSize: 40, color: "secondary.main" }} />,
          path: "/grooming/appointments",
          stats: "Appointments: 0",
        },
        {
          title: "Training Classes",
          description:
            "Manage training classes, enrollments, sessions, and certificates",
          icon: <TrainingIcon sx={{ fontSize: 40, color: "info.main" }} />,
          path: "/training/classes",
          stats: "Classes: 0",
        },
        {
          title: "Vaccine Requirements",
          description:
            "Configure required vaccines per pet type and service, track compliance and expirations",
          icon: <VaccineIcon sx={{ fontSize: 40, color: "error.main" }} />,
          path: "/admin/vaccine-requirements",
          stats: "Active Requirements: 8",
        },
      ],
    },
    {
      id: "customers",
      title: "Customer Management",
      subtitle: "Users, loyalty, and promotions",
      icon: <CustomersIcon sx={{ fontSize: 28, color: "info.main" }} />,
      color: "info.main",
      sections: [
        {
          title: "Users",
          description: "Manage employee accounts and permissions",
          icon: <UsersIcon sx={{ fontSize: 40, color: "info.main" }} />,
          path: "/settings/users",
          stats: "Active Users: 5",
        },
        {
          title: "Loyalty Program",
          description:
            "Configure rewards, points, tiers, and redemption options",
          icon: <LoyaltyIcon sx={{ fontSize: 40, color: "secondary.main" }} />,
          path: "/admin/loyalty",
          stats: "Rewards System",
        },
        {
          title: "Coupons",
          description:
            "Create and manage discount coupons with percentage or fixed amounts",
          icon: <CouponIcon sx={{ fontSize: 40, color: "success.main" }} />,
          path: "/admin/coupons",
          stats: "Active Coupons: 2",
        },
        {
          title: "Price Rules",
          description: "Configure discount rules and pricing policies",
          icon: (
            <PriceRulesIcon sx={{ fontSize: 40, color: "secondary.main" }} />
          ),
          path: "/settings/price-rules",
          stats: "Active Rules: 3",
        },
      ],
    },
    {
      id: "products-sales",
      title: "Products & Sales",
      subtitle: "Inventory and point-of-sale",
      icon: <SalesIcon sx={{ fontSize: 28, color: "success.main" }} />,
      color: "success.main",
      sections: [
        {
          title: "Products & POS",
          description: "Manage retail products, inventory, and point-of-sale",
          icon: <ProductsIcon sx={{ fontSize: 40, color: "success.main" }} />,
          path: "/products",
          stats: `Products: ${productCount}`,
        },
      ],
    },
    {
      id: "marketing-branding",
      title: "Marketing & Branding",
      subtitle: "Campaigns, icons, and customization",
      icon: <BrandingIcon sx={{ fontSize: 28, color: "secondary.main" }} />,
      color: "secondary.main",
      sections: [
        {
          title: "Marketing",
          description:
            "Manage SMS and email marketing campaigns with Twilio and SendGrid",
          icon: <MarketingIcon sx={{ fontSize: 40, color: "purple" }} />,
          path: "/admin/marketing",
          stats: "Campaigns: 0",
        },
        {
          title: "Custom Icons",
          description: "Upload and manage custom icons for customers and pets",
          icon: <IconsIcon sx={{ fontSize: 40, color: "warning.main" }} />,
          path: "/admin/custom-icons",
          stats: "Custom Icons: 0",
        },
      ],
    },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
          Admin Panel
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Manage system settings, users, and administrative functions.
        </Typography>

        <Box sx={{ mb: 3 }}>
          {categories.map((category) => (
            <Accordion
              key={category.id}
              expanded={expanded === category.id}
              onChange={handleAccordionChange(category.id)}
              sx={{ mb: 1, "&:before": { display: "none" } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: "background.paper",
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", width: "100%" }}
                >
                  <Box sx={{ mr: 2, display: "flex", alignItems: "center" }}>
                    {category.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, fontSize: "1.1rem" }}
                    >
                      {category.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.subtitle}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${category.sections.length} items`}
                    size="small"
                    sx={{ mr: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 2, pb: 2 }}>
                <Grid container spacing={1.5}>
                  {category.sections.map((section, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                      <Card
                        sx={{
                          height: "100%",
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: 3,
                          },
                        }}
                        onClick={() => navigate(section.path)}
                      >
                        <CardContent
                          sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                mr: 1,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {React.cloneElement(
                                section.icon as React.ReactElement,
                                {
                                  sx: {
                                    fontSize: 28,
                                    color: (section.icon as any).props.sx.color,
                                  },
                                }
                              )}
                            </Box>
                            <Typography
                              variant="subtitle2"
                              component="h2"
                              sx={{ fontWeight: 600, lineHeight: 1.2 }}
                            >
                              {section.title}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5, lineHeight: 1.3 }}
                          >
                            {section.description}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="primary.main"
                            sx={{ fontWeight: "medium", fontSize: "0.7rem" }}
                          >
                            {section.stats}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default Settings;
