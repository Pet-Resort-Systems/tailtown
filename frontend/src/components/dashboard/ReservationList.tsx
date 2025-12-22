import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  List,
  ListItem,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import PetNameWithIcons from "../pets/PetNameWithIcons";
import KennelCard from "../kennels/KennelCard";
import { PlaygroupBadge } from "../compatibility";
import {
  formatGingrTime,
  formatGingrDate,
  parseGingrDate,
} from "../../utils/dateUtils";

interface Reservation {
  id: string;
  customer?: {
    firstName?: string;
    lastName?: string;
  };
  pet?: {
    id: string;
    name: string;
    type?: string;
    breed?: string;
    profilePhoto?: string;
    petIcons?: any; // JSON array of icon IDs
    playgroupCompatibility?:
      | "LARGE_DOG"
      | "MEDIUM_DOG"
      | "SMALL_DOG"
      | "NON_COMPATIBLE"
      | "SENIOR_STAFF_REQUIRED"
      | "UNKNOWN"
      | null;
    aggressionFlags?: any[];
    specialRequirements?: string[];
  };
  startDate: string;
  endDate: string;
  status: string;
  service?: {
    name?: string;
    serviceCategory?: string;
  };
  resource?: {
    name?: string;
    type?: string;
  };
}

interface ReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  filter: "in" | "out" | "all";
  onFilterChange: (filter: "in" | "out" | "all") => void;
}

/**
 * ReservationList Component
 *
 * Displays upcoming reservations in a compact, scrollable list optimized for high-volume operations.
 * Designed to handle 200+ daily reservations efficiently.
 *
 * Features:
 * - Compact list layout (~60px per item)
 * - Scrollable container (500px max height)
 * - Pet avatars with profile photos
 * - Pet icons (medical/behavioral/dietary alerts)
 * - Filter buttons (All, Check-Ins, Check-Outs)
 * - Reservation count badge
 * - Status chips with color coding
 * - Hover effects for better UX
 *
 * @param reservations - Array of reservation objects to display
 * @param loading - Loading state indicator
 * @param error - Error message if data fetch failed
 * @param filter - Current filter ('in' | 'out' | 'all')
 * @param onFilterChange - Callback to change filter
 *
 * @example
 * <ReservationList
 *   reservations={filteredReservations}
 *   loading={loading}
 *   error={error}
 *   filter="in"
 *   onFilterChange={(filter) => setFilter(filter)}
 * />
 */
const ReservationList: React.FC<ReservationListProps> = ({
  reservations,
  loading,
  error,
  filter,
  onFilterChange,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [printingReservationId, setPrintingReservationId] = useState<
    string | null
  >(null);

  // Filter reservations based on search query
  const filteredReservations = useMemo(() => {
    if (!searchQuery.trim()) {
      return reservations;
    }

    const query = searchQuery.toLowerCase();
    return reservations.filter((reservation) => {
      const petName = reservation.pet?.name?.toLowerCase() || "";
      const customerFirstName =
        reservation.customer?.firstName?.toLowerCase() || "";
      const customerLastName =
        reservation.customer?.lastName?.toLowerCase() || "";
      const customerFullName =
        `${customerFirstName} ${customerLastName}`.trim();
      const kennelName = reservation.resource?.name?.toLowerCase() || "";
      const serviceName = reservation.service?.name?.toLowerCase() || "";

      return (
        petName.includes(query) ||
        customerFirstName.includes(query) ||
        customerLastName.includes(query) ||
        customerFullName.includes(query) ||
        kennelName.includes(query) ||
        serviceName.includes(query)
      );
    });
  }, [reservations, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  /**
   * Print a single kennel card for a reservation
   */
  const handlePrintKennelCard = (reservation: Reservation) => {
    setPrintingReservationId(reservation.id);

    // Small delay to ensure the component renders
    setTimeout(() => {
      window.print();
      setPrintingReservationId(null);
    }, 100);
  };

  /**
   * Maps reservation status to Material-UI chip color
   * @param status - Reservation status string
   * @returns Chip color variant
   */
  const getStatusColor = (
    status: string
  ): "success" | "warning" | "info" | "error" | "default" => {
    switch (status) {
      case "CONFIRMED":
        return "success";
      case "PENDING":
        return "warning";
      case "CHECKED_IN":
        return "info";
      case "CANCELLED":
        return "error";
      default:
        return "default";
    }
  };

  /**
   * Gets background color based on service category
   * DAYCARE = orange tint, BOARDING = blue tint, GROOMING = purple tint
   */
  const getServiceColor = (serviceCategory?: string) => {
    if (serviceCategory === "DAYCARE") {
      return "rgba(255, 152, 0, 0.08)"; // Orange tint
    }
    if (serviceCategory === "GROOMING") {
      return "rgba(156, 39, 176, 0.08)"; // Purple tint
    }
    return "rgba(25, 118, 210, 0.08)"; // Blue tint (default)
  };

  /**
   * Gets hover color based on service category
   */
  const getServiceHoverColor = (serviceCategory?: string) => {
    if (serviceCategory === "DAYCARE") {
      return "rgba(255, 152, 0, 0.15)"; // Orange hover
    }
    if (serviceCategory === "GROOMING") {
      return "rgba(156, 39, 176, 0.15)"; // Purple hover
    }
    return "rgba(25, 118, 210, 0.15)"; // Blue hover (default)
  };

  /**
   * Format time from ISO string using timezone-safe Gingr date parsing
   * This correctly handles dates stored as local time with 'Z' suffix
   */
  const formatTime = (dateString: string) => {
    return formatGingrTime(dateString);
  };

  /**
   * Format date from ISO string using timezone-safe Gingr date parsing
   */
  const formatDate = (dateString: string) => {
    return formatGingrDate(dateString, { month: "short", day: "numeric" });
  };

  const getFilterTitle = () => {
    switch (filter) {
      case "in":
        return "Check-Ins Today";
      case "out":
        return "Check-Outs Today";
      default:
        return "Upcoming Appointments";
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {getFilterTitle()}
            {reservations.length > 0 && (
              <Chip
                label={
                  searchQuery
                    ? `${filteredReservations.length} of ${reservations.length}`
                    : reservations.length
                }
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        }
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant={filter === "all" ? "contained" : "outlined"}
              onClick={() => onFilterChange("all")}
            >
              All
            </Button>
            <Button
              size="small"
              variant={filter === "in" ? "contained" : "outlined"}
              onClick={() => onFilterChange("in")}
            >
              Check-Ins
            </Button>
            <Button
              size="small"
              variant={filter === "out" ? "contained" : "outlined"}
              onClick={() => onFilterChange("out")}
            >
              Check-Outs
            </Button>
          </Box>
        }
      />
      <CardContent>
        {/* Search Bar */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search by pet name, customer name, kennel, or service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : reservations.length === 0 ? (
          <Typography color="text.secondary">
            No{" "}
            {filter === "in"
              ? "check-ins"
              : filter === "out"
              ? "check-outs"
              : "appointments"}{" "}
            scheduled
          </Typography>
        ) : filteredReservations.length === 0 ? (
          <Typography color="text.secondary">
            No reservations match your search "{searchQuery}"
          </Typography>
        ) : (
          <List
            sx={{
              maxHeight: 500,
              overflow: "auto",
              p: 0,
              "& .MuiListItem-root": {
                borderBottom: 1,
                borderColor: "divider",
                "&:last-child": {
                  borderBottom: 0,
                },
              },
            }}
          >
            {filteredReservations.map((reservation) => (
              <ListItem
                key={reservation.id}
                sx={{
                  py: 1,
                  px: 2,
                  bgcolor: getServiceColor(
                    reservation.service?.serviceCategory
                  ),
                  "&:hover": {
                    bgcolor: getServiceHoverColor(
                      reservation.service?.serviceCategory
                    ),
                  },
                }}
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    <Tooltip title="Print Kennel Card">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintKennelCard(reservation);
                        }}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {filter === "in" && reservation.status === "CONFIRMED" ? (
                      <Tooltip title="Start Check-In">
                        <IconButton
                          edge="end"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/check-in/${reservation.id}`);
                          }}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Chip
                        label={reservation.status}
                        color={getStatusColor(reservation.status)}
                        size="small"
                      />
                    )}
                  </Box>
                }
              >
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.25,
                    cursor: "pointer",
                  }}
                  onClick={() => navigate(`/reservations/${reservation.id}`)}
                >
                  {/* Row 1: Pet Name, Customer Name, Playgroup Badge & Warnings */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <PetNameWithIcons
                      petName={reservation.pet?.name || "Unknown Pet"}
                      petIcons={reservation.pet?.petIcons}
                      profilePhoto={reservation.pet?.profilePhoto}
                      showPhoto={true}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.8rem" }}
                    >
                      • {reservation.customer?.firstName || ""}{" "}
                      {reservation.customer?.lastName || "Unknown"}
                    </Typography>
                    {reservation.pet?.playgroupCompatibility && (
                      <PlaygroupBadge
                        compatibility={reservation.pet.playgroupCompatibility}
                        size="small"
                      />
                    )}
                  </Box>
                  {/* Row 2: Kennel, Service, Time */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    {reservation.resource?.name && (
                      <>
                        <Chip
                          label={
                            reservation.resource.name.length > 1
                              ? reservation.resource.name.slice(0, -1) +
                                " " +
                                reservation.resource.name.slice(-1)
                              : reservation.resource.name
                          }
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 18,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: "white",
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                      </>
                    )}
                    {reservation.service?.name && (
                      <>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {reservation.service.serviceCategory ===
                            "GROOMING" && (
                            <ContentCutIcon
                              sx={{
                                fontSize: "0.875rem",
                                color: "#9c27b0",
                              }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {reservation.service.name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                      </>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {reservation.service?.serviceCategory === "BOARDING" ? (
                        // Show date range for boarding reservations
                        <>
                          {formatDate(reservation.startDate)}{" "}
                          {formatTime(reservation.startDate)} →{" "}
                          {formatDate(reservation.endDate)}{" "}
                          {formatTime(reservation.endDate)}
                        </>
                      ) : (
                        // Show just time for daycare
                        formatTime(reservation.startDate)
                      )}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
        {reservations.length > 0 && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Button
              component={Link}
              to="/calendar"
              variant="outlined"
              size="small"
            >
              View All Reservations
            </Button>
          </Box>
        )}
      </CardContent>

      {/* Hidden kennel card for printing */}
      {printingReservationId && (
        <Box sx={{ display: "none", "@media print": { display: "block" } }}>
          {(() => {
            const reservation = reservations.find(
              (r) => r.id === printingReservationId
            );
            if (!reservation || !reservation.pet || !reservation.customer)
              return null;

            return (
              <KennelCard
                kennelNumber={reservation.resource?.name || "N/A"}
                suiteType={reservation.resource?.type || "STANDARD"}
                petName={reservation.pet.name}
                petBreed={reservation.pet.breed}
                petIconIds={reservation.pet.petIcons || []}
                petType={reservation.pet.type as "DOG" | "CAT" | "OTHER"}
                ownerName={`${reservation.customer.firstName || ""} ${
                  reservation.customer.lastName || ""
                }`.trim()}
                startDate={parseGingrDate(reservation.startDate) || new Date()}
                endDate={parseGingrDate(reservation.endDate) || new Date()}
              />
            );
          })()}
        </Box>
      )}
    </Card>
  );
};

export default ReservationList;
