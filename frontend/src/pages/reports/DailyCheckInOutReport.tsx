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
      const dateStr = format(date, "yyyy-MM-dd");

      // Fetch all reservations for the selected date (API handles date filtering)
      const response = await reservationService.getAllReservations(
        1,
        1000,
        "startDate",
        "asc",
        undefined,
        dateStr
      );

      const allReservations = response.data || [];

      // Filter for boarding and daycamp only
      const todaysReservations = allReservations.filter((r: any) => {
        const serviceCategory = r.service?.serviceCategory?.toUpperCase();
        return serviceCategory === "BOARDING" || serviceCategory === "DAYCAMP";
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

          const playgroup =
            r.pet?.playgroupCompatibility &&
            playgroupMap[r.pet.playgroupCompatibility]
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
            onChange={(e) => {
              const [year, month, day] = e.target.value.split("-").map(Number);
              setDate(new Date(year, month - 1, day));
            }}
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
            {/* Group by size - each group on its own page */}
            {Array.from(new Set(dogs.map((d) => d.groupSize))).map(
              (groupSize, groupIndex) => {
                const groupDogs = dogs.filter((d) => d.groupSize === groupSize);
                return (
                  <Box
                    key={groupSize}
                    sx={{
                      "@media print": {
                        pageBreakAfter:
                          groupIndex <
                          Array.from(new Set(dogs.map((d) => d.groupSize)))
                            .length -
                            1
                            ? "always"
                            : "auto",
                      },
                    }}
                  >
                    {/* Group Header */}
                    <Box
                      sx={{
                        mb: 2,
                        mt: groupIndex > 0 ? 3 : 0,
                        display: "flex",
                        alignItems: "baseline",
                        gap: 2,
                      }}
                    >
                      <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                        {groupSize} Play Group
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {format(date, "M/d/yyyy")}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: "auto" }}
                      >
                        {groupDogs.length} dog
                        {groupDogs.length !== 1 ? "s" : ""}
                      </Typography>
                    </Box>

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
                            <TableCell
                              sx={{ fontWeight: "bold", width: "40%" }}
                            >
                              Dog (Owner)
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: "bold", width: "15%" }}
                            >
                              Room
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: "bold",
                                width: "22.5%",
                                borderLeft: "2px solid #ddd",
                              }}
                            >
                              In
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: "bold",
                                width: "22.5%",
                                borderLeft: "2px solid #ddd",
                              }}
                            >
                              Out
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {groupDogs.map((dog, index) => (
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
                                <strong>{dog.dogName}</strong> (
                                {dog.customerLastName})
                              </TableCell>
                              <TableCell>{dog.roomNumber}</TableCell>
                              <TableCell sx={{ borderLeft: "2px solid #ddd" }}>
                                &nbsp;
                              </TableCell>
                              <TableCell sx={{ borderLeft: "2px solid #ddd" }}>
                                &nbsp;
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                );
              }
            )}

            {/* Summary - only show on screen */}
            <Box
              sx={{
                mt: 3,
                textAlign: "right",
                "@media print": { display: "none" },
              }}
            >
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
            /* Hide navigation and other UI elements */
            nav,
            aside,
            .MuiDrawer-root,
            header,
            [role="navigation"],
            .sidebar {
              display: none !important;
            }
            
            /* Make content full width */
            body {
              margin: 0;
              padding: 0;
            }
            
            main {
              margin: 0 !important;
              padding: 0 !important;
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
