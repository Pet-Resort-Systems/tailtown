import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { format } from "date-fns";
import { reservationService } from "../../services/reservationService";

interface DogEntry {
  dogName: string;
  customerLastName: string;
  roomNumber: string;
  groupSize: string;
  groupSizeOrder: number;
}

const DailyCheckInOutReport: React.FC = () => {
  const [date, setDate] = useState(new Date());
  const [dogs, setDogs] = useState<DogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await reservationService.getAllReservations();

      // Filter for reservations on the selected date
      const dateStr = format(date, "yyyy-MM-dd");
      const allReservations = response.data || [];

      console.log("Total reservations:", allReservations.length);
      console.log("Sample reservation:", allReservations[0]);

      const todaysReservations = allReservations.filter((r: any) => {
        const startDate = r.startDate?.split("T")[0];
        const endDate = r.endDate?.split("T")[0];
        const isInDateRange = startDate <= dateStr && endDate >= dateStr;

        // Only include boarding and daycamp reservations
        // Check multiple possible field names and formats
        const serviceType =
          r.serviceType?.toLowerCase() ||
          r.service?.type?.toLowerCase() ||
          r.type?.toLowerCase();
        const serviceName = r.service?.name?.toLowerCase() || "";

        const isBoardingOrDaycamp =
          serviceType === "boarding" ||
          serviceType === "daycamp" ||
          serviceName.includes("boarding") ||
          serviceName.includes("daycamp") ||
          serviceName.includes("day camp");

        if (isInDateRange) {
          console.log("Reservation in date range:", {
            pet: r.pet?.name,
            serviceType,
            serviceName,
            isBoardingOrDaycamp,
          });
        }

        return isInDateRange && isBoardingOrDaycamp;
      });

      // Map to dog entries
      const entries: DogEntry[] = todaysReservations
        .filter((r: any) => r.pet?.name)
        .map((r: any) => {
          const playgroupMap: Record<string, { label: string; order: number }> =
            {
              LARGE_DOG: { label: "Large", order: 1 },
              MEDIUM_DOG: { label: "Medium", order: 2 },
              SMALL_DOG: { label: "Small", order: 3 },
              SOLO_ONLY: { label: "Solo", order: 4 },
            };

          const playgroup = r.pet?.playgroupCompatibility
            ? playgroupMap[r.pet.playgroupCompatibility]
            : { label: "Unknown", order: 5 };

          return {
            dogName: r.pet.name,
            customerLastName: r.customer?.lastName || "",
            roomNumber: r.resource?.name || "___",
            groupSize: playgroup.label,
            groupSizeOrder: playgroup.order,
          };
        });

      // Sort by group size, then by dog name
      entries.sort((a, b) => {
        if (a.groupSizeOrder !== b.groupSizeOrder) {
          return a.groupSizeOrder - b.groupSizeOrder;
        }
        return a.dogName.localeCompare(b.dogName);
      });

      setDogs(entries);
    } catch (error) {
      console.error("Failed to load reservations:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Controls - hidden when printing */}
      <Box sx={{ mb: 3, "@media print": { display: "none" } }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="Report Date"
            type="date"
            value={format(date, "yyyy-MM-dd")}
            onChange={(e) => setDate(new Date(e.target.value))}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          />
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={loading}
          >
            Print Report
          </Button>
        </Box>
      </Box>

      {/* Report content */}
      <Paper
        sx={{
          p: 3,
          "@media print": {
            boxShadow: "none",
            p: 0,
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box sx={{ mb: 3, textAlign: "center" }}>
              <Typography variant="h4" gutterBottom>
                Daily Check-In/Out Report
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {format(date, "MMMM d, yyyy")}
              </Typography>
            </Box>

            {/* Table */}
            <TableContainer>
              <Table
                sx={{
                  "@media print": {
                    "& td, & th": {
                      fontSize: "12pt",
                      padding: "8px",
                    },
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", width: "40%" }}>
                      Dog (Owner)
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", width: "15%" }}>
                      Room
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", width: "15%" }}>
                      Group Size
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        width: "15%",
                        borderLeft: "2px solid #ddd",
                      }}
                    >
                      In
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        width: "15%",
                        borderLeft: "2px solid #ddd",
                      }}
                    >
                      Out
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dogs.map((dog, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        "&:nth-of-type(odd)": {
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                        },
                        "@media print": {
                          pageBreakInside: "avoid",
                        },
                      }}
                    >
                      <TableCell>
                        <strong>{dog.dogName}</strong> ({dog.customerLastName})
                      </TableCell>
                      <TableCell>{dog.roomNumber}</TableCell>
                      <TableCell>{dog.groupSize}</TableCell>
                      <TableCell
                        sx={{
                          borderLeft: "2px solid #ddd",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        __________
                      </TableCell>
                      <TableCell
                        sx={{
                          borderLeft: "2px solid #ddd",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        __________
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary */}
            <Box sx={{ mt: 3, textAlign: "right" }}>
              <Typography variant="body2" color="text.secondary">
                Total Dogs: {dogs.length}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* Print styles */}
      <style>
        {`
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              size: letter;
              margin: 0.5in;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default DailyCheckInOutReport;
