import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import SearchIcon from "@mui/icons-material/Search";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import PetsIcon from "@mui/icons-material/Pets";
import { resourceService, type Resource } from "../../services/resourceService";
import { formatDateToYYYYMMDD } from "../../utils/dateUtils";
import { determineSuiteStatus } from "../../utils/suiteUtils";

/**
 * Extended Resource type that includes reservations
 */
interface ResourceWithReservations extends Resource {
  reservations?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    pet?: {
      id: string;
      name: string;
      breed?: string;
      customer?: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

// Room sizes for kennels
enum RoomSize {
  JUNIOR = "JUNIOR",
  QUEEN = "QUEEN",
  KING = "KING",
  VIP = "VIP",
}

// Room size colors
const roomSizeColors = {
  [RoomSize.JUNIOR]: "#E0E0E0",
  [RoomSize.QUEEN]: "#BBDEFB",
  [RoomSize.KING]: "#90CAF9",
  [RoomSize.VIP]: "#FFECB3",
};

// Suite colors for different statuses
const statusColors = {
  AVAILABLE: "#81C784",
  OCCUPIED: "#FF8A65",
  MAINTENANCE: "#9E9E9E",
  RESERVED: "#FFD54F",
};

interface SuiteBoardProps {
  onSelectSuite?: (suiteId: string, suiteData?: any) => void;
  reloadTrigger?: number;
  filterDate?: Date;
  onFilterDateChange?: (date: Date) => void;
  suites?: ResourceWithReservations[];
}

const SuiteBoard: React.FC<SuiteBoardProps> = ({
  onSelectSuite,
  reloadTrigger,
  filterDate,
  onFilterDateChange,
  suites: propSuites,
}) => {
  // Use ref to track previous filter state to prevent unnecessary API calls
  const prevFilter = React.useRef<any>(null);
  const [suites, setSuites] = useState<
    Array<{
      id: string;
      name: string;
      suiteNumber: string | number;
      suiteType: string;
      status: string;
      pet: any;
      owner: any;
      notes: string;
      lastCleaned?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    suiteType: "all",
    status: "all",
    search: "",
    date: filterDate || new Date(),
  });

  useEffect(() => {
    loadSuites();
    // Reload suites when reloadTrigger changes (or on mount)
    // No timer-based auto-refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTrigger]); // loadSuites defined below, stable function

  // Update filter date when filterDate prop changes
  useEffect(() => {
    if (filterDate) {
      setFilter((prev) => ({ ...prev, date: filterDate }));
      // Don't call loadSuites() here as it will use the previous filter state
      // The filter state update will trigger the next useEffect
    }
  }, [filterDate]);

  // Load suites whenever filter changes
  useEffect(() => {
    // Deep comparison of filter objects to prevent unnecessary API calls
    const filterChanged =
      JSON.stringify(filter) !== JSON.stringify(prevFilter.current);
    if (filterChanged) {
      loadSuites();
      prevFilter.current = { ...filter };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.suiteType, filter.status, filter.search, filter.date]); // loadSuites defined below, stable function

  const loadSuites = async () => {
    // Prevent function from being called during render
    if (!filter) return;

    try {
      setLoading(true);
      setError(null);

      // Format date as YYYY-MM-DD for API using our utility function
      const formattedDate =
        formatDateToYYYYMMDD(filter.date) || formatDateToYYYYMMDD(new Date());

      // Get all suites regardless of status, we'll filter client-side
      // This ensures we have all the data needed to determine status accurately
      const response = await resourceService.getSuites(
        filter.suiteType !== "all" ? filter.suiteType : undefined,
        undefined, // Don't use backend status filtering
        undefined, // Don't pass search parameter to API
        formattedDate
      );
      if (response?.status === "success" && Array.isArray(response?.data)) {
        const suites = response.data
          .map((suite: ResourceWithReservations) => {
            // Safely extract pet and owner info
            let pet = null;
            let owner = null;

            if (suite.reservations && suite.reservations.length > 0) {
              const reservation = suite.reservations[0];
              if (reservation.pet) {
                pet = reservation.pet;
                // Try to get owner from pet.customer if available
                if (reservation.pet.customer) {
                  owner = reservation.pet.customer;
                }
              }

              // If no owner from pet.customer, try reservation.customer
              if (!owner && reservation.customer) {
                owner = reservation.customer;
              }
            }

            // Use the utility function to determine the suite status
            const status = determineSuiteStatus(suite);

            // Use the suite.size for room size, fallback to JUNIOR if not set
            const roomSize = suite.size || "JUNIOR";

            return {
              id: suite.id,
              name: suite.name,
              suiteNumber: suite.attributes?.suiteNumber || suite.name || "N/A",
              suiteType: roomSize, // Use room size instead of old suite type
              status: status,
              pet: pet,
              owner: owner,
              notes: suite.notes || "",
              lastCleaned: suite.attributes?.lastCleaned,
            };
          })
          .sort(
            (
              a: { suiteNumber: string | number },
              b: { suiteNumber: string | number }
            ) => {
              // Handle string comparison for suite numbers like "A01", "A02"
              const aNum = String(a.suiteNumber);
              const bNum = String(b.suiteNumber);
              return aNum.localeCompare(bNum, undefined, {
                numeric: true,
                sensitivity: "base",
              });
            }
          );

        // Apply client-side status filtering if needed
        let filteredResults = suites;
        if (filter.status !== "all") {
          filteredResults = suites.filter(
            (suite) => suite.status === filter.status
          );
        }

        setSuites(filteredResults);
        setError(null);
      } else {
        setError("Could not load suites: Unexpected response format.");
        setSuites([]);
        console.error("Suites API response:", response);
      }
    } catch (error: any) {
      let msg = "Could not load suites.";
      if (error?.response) {
        msg += ` Server responded with status ${error.response.status}: ${
          error.response.data?.message || error.response.statusText
        }`;
      } else if (error?.message) {
        msg += ` ${error.message}`;
      }
      setError(msg);
      setSuites([]);
      console.error("Error loading suites:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced client-side search with detailed logging
  const filteredSuites = suites.filter((suite) => {
    // If there's no search term, include all suites
    if (!filter.search) return true;

    const searchTerm = filter.search.toLowerCase();

    // Search in suite name and number
    if (suite.name.toLowerCase().includes(searchTerm)) {
      return true;
    }

    if (String(suite.suiteNumber).includes(searchTerm)) {
      return true;
    }

    // Search in pet info if available
    if (suite.pet?.name?.toLowerCase().includes(searchTerm)) {
      return true;
    }

    if (suite.pet?.type?.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in owner info if available
    if (suite.owner?.firstName?.toLowerCase().includes(searchTerm)) {
      return true;
    }

    if (suite.owner?.lastName?.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // No match found
    return false;
  });

  const handleCleanSuite = (suiteId: string) => {
    // Implementation would call API to mark suite as cleaned
  };

  const renderSuiteCard = (suite: {
    id: string;
    name: string;
    suiteNumber: string | number;
    suiteType: string;
    status: string;
    pet: any;
    owner: any;
    notes?: string;
    lastCleaned?: string | Date | null;
  }) => {
    const bgColor = roomSizeColors[suite.suiteType as RoomSize] || "#E0E0E0";
    const statusColor =
      statusColors[suite.status as keyof typeof statusColors] || "#E0E0E0";

    return (
      <Card
        key={suite.id}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          borderLeft: `8px solid ${statusColor}`,
          "&:hover": {
            boxShadow: 3,
            transform: "translateY(-4px)",
            transition: "transform 0.2s",
          },
        }}
        data-suite-id={suite.id}
        data-status={suite.status}
        onClick={() => {
          if (onSelectSuite) {
            // Just pass the suite ID and status directly
            onSelectSuite(suite.id, suite.status);
          }
        }}
      >
        <CardContent sx={{ p: 1, flexGrow: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="h6" component="div">
              {suite.suiteNumber}
            </Typography>
            <Chip
              label={suite.suiteType}
              size="small"
              color={
                suite.suiteType === RoomSize.VIP
                  ? "warning"
                  : suite.suiteType === RoomSize.KING
                  ? "info"
                  : "default"
              }
            />
          </Box>

          {suite.pet ? (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mb: 0.5,
                }}
              >
                <PetsIcon fontSize="small" color="primary" />
                <Typography variant="body2" fontWeight="medium">
                  {suite.pet.name} ({suite.pet.type})
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <span style={{ fontWeight: "bold", marginRight: "4px" }}>
                    Owner:
                  </span>
                  {suite.owner
                    ? `${suite.owner.firstName} ${suite.owner.lastName}`
                    : "Unknown"}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ height: "40px", display: "flex", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {suite.status === "MAINTENANCE"
                  ? "Under Maintenance"
                  : "Available"}
              </Typography>
            </Box>
          )}
        </CardContent>

        {suite.status !== "OCCUPIED" && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 0.5 }}>
            <Tooltip title="Mark as cleaned">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCleanSuite(suite.id);
                }}
              >
                <CleaningServicesIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Card>
    );
  };

  return (
    <Box>
      {error && (
        <Box sx={{ mb: 2 }}>
          <Paper sx={{ p: 2, bgcolor: "#ffebee", color: "#b71c1c" }}>
            <Typography variant="body1">{error}</Typography>
          </Paper>
        </Box>
      )}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        <TextField
          placeholder="Search suite, pet, or owner"
          size="small"
          value={filter.search}
          onChange={(e) => {
            setFilter({ ...filter, search: e.target.value });
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: "200px" }}
        />

        <FormControl size="small" sx={{ minWidth: "150px" }}>
          <InputLabel>Suite Type</InputLabel>
          <Select
            value={filter.suiteType}
            label="Suite Type"
            onChange={(e) => {
              setFilter({ ...filter, suiteType: e.target.value });
            }}
          >
            <MenuItem value="all">All Sizes</MenuItem>
            <MenuItem value={RoomSize.JUNIOR}>Junior (1)</MenuItem>
            <MenuItem value={RoomSize.QUEEN}>Queen (2)</MenuItem>
            <MenuItem value={RoomSize.KING}>King (3)</MenuItem>
            <MenuItem value={RoomSize.VIP}>VIP (4)</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: "150px" }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filter.status}
            label="Status"
            onChange={(e) => {
              setFilter({ ...filter, status: e.target.value });
            }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="AVAILABLE">Available</MenuItem>
            <MenuItem value="OCCUPIED">Occupied</MenuItem>
            <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            <MenuItem value="RESERVED">Reserved</MenuItem>
          </Select>
        </FormControl>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Filter Date"
            value={filter.date}
            onChange={(newDate) => {
              if (newDate) {
                // Update the filter with the new date
                setFilter({ ...filter, date: newDate });
                // Notify parent component about date change
                if (onFilterDateChange) {
                  onFilterDateChange(newDate);
                }
                // loadSuites will be called by the filter useEffect
              }
            }}
            slotProps={{
              textField: {
                size: "small",
                sx: { minWidth: "150px" },
              },
            }}
          />
        </LocalizationProvider>
      </Box>

      <Grid container spacing={2}>
        {loading ? (
          <Grid item xs={12}>
            <Typography>Loading suites...</Typography>
          </Grid>
        ) : filteredSuites.length === 0 ? (
          <Grid item xs={12}>
            <Typography>No suites match your filter criteria.</Typography>
          </Grid>
        ) : (
          filteredSuites.map((suite) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={suite.id}>
              {renderSuiteCard(suite)}
            </Grid>
          ))
        )}
      </Grid>
      <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: statusColors.AVAILABLE,
              borderRadius: "50%",
            }}
          />
          <Typography variant="body2">Available</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: statusColors.OCCUPIED,
              borderRadius: "50%",
            }}
          />
          <Typography variant="body2">Occupied</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: statusColors.MAINTENANCE,
              borderRadius: "50%",
            }}
          />
          <Typography variant="body2">Maintenance</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: statusColors.RESERVED,
              borderRadius: "50%",
            }}
          />
          <Typography variant="body2">Reserved</Typography>
        </Box>
        <Typography variant="caption" sx={{ ml: 2, alignSelf: "center" }}>
          The colored bar on the left of each card indicates its status
        </Typography>
      </Box>
    </Box>
  );
};

export default SuiteBoard;
