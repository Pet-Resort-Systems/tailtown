/**
 * Bulk Report Card Dashboard
 *
 * Staff dashboard for creating and sending multiple report cards at once
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Badge,
} from "@mui/material";
import {
  Send,
  PhotoCamera,
  CheckCircle,
  Edit,
  Visibility,
} from "@mui/icons-material";
import {
  reportCardService,
  CreateReportCardRequest,
} from "../../services/reportCardService";

interface PetReportRow {
  petId: string;
  petName: string;
  customerId: string;
  customerName: string;
  reservationId?: string;
  serviceType: "BOARDING" | "DAYCARE" | "GROOMING" | "TRAINING";
  photoCount: number;
  hasReport: boolean;
  reportId?: string;
}

const BulkReportCardDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pets, setPets] = useState<PetReportRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  // Template settings
  const [templateType, setTemplateType] = useState<
    "DAYCARE_DAILY" | "BOARDING_DAILY"
  >("DAYCARE_DAILY");
  const [defaultMood, setDefaultMood] = useState(4);
  const [defaultEnergy, setDefaultEnergy] = useState(4);
  const [defaultAppetite, setDefaultAppetite] = useState(4);
  const [defaultSocial, setDefaultSocial] = useState(4);
  const [defaultActivities, setDefaultActivities] = useState<string[]>([
    "Morning playtime",
    "Lunch",
    "Afternoon nap",
    "Evening play session",
  ]);

  useEffect(() => {
    loadTodaysPets();
  }, []);

  const loadTodaysPets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      // Fetch today's reservations with CHECKED_IN status
      const response = await fetch(
        `/api/reservations?date=${dateStr}&status=CHECKED_IN&limit=500`,
        {
          headers: {
            "x-tenant-id": localStorage.getItem("tailtown_tenant_id") || "dev",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }

      const data = await response.json();
      const reservations = data.data || [];

      // Fetch existing report cards for today
      const reportCardsResponse = await fetch(
        `/api/report-cards?date=${dateStr}&limit=500`,
        {
          headers: {
            "x-tenant-id": localStorage.getItem("tailtown_tenant_id") || "dev",
          },
        }
      );

      const reportCardsData = await reportCardsResponse.json();
      const reportCards = reportCardsData.data || [];

      // Create a map of petId -> report card for quick lookup
      const reportCardMap = new Map();
      reportCards.forEach((rc: any) => {
        reportCardMap.set(rc.petId, rc);
      });

      // Transform reservations into PetReportRow format
      const petRows: PetReportRow[] = reservations.map((res: any) => {
        const existingReport = reportCardMap.get(res.petId);

        return {
          petId: res.petId,
          petName: res.pet?.name || "Unknown Pet",
          customerId: res.customerId,
          customerName: res.customer
            ? `${res.customer.firstName} ${res.customer.lastName}`
            : "Unknown Customer",
          reservationId: res.id,
          serviceType: res.service?.serviceCategory || "DAYCARE",
          photoCount: existingReport?.photos?.length || 0,
          hasReport: !!existingReport,
          reportId: existingReport?.id,
        };
      });

      setPets(petRows);
    } catch (err: any) {
      setError(err.message || "Failed to load today's pets");
      console.error("Error loading pets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selected.size === pets.filter((p) => !p.hasReport).length) {
      setSelected(new Set());
    } else {
      const allIds = pets.filter((p) => !p.hasReport).map((p) => p.petId);
      setSelected(new Set(allIds));
    }
  };

  const handleSelectOne = (petId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(petId)) {
      newSelected.delete(petId);
    } else {
      newSelected.add(petId);
    }
    setSelected(newSelected);
  };

  const handleApplyTemplate = async () => {
    try {
      setLoading(true);
      setError(null);

      const reportCards: CreateReportCardRequest[] = Array.from(selected).map(
        (petId) => {
          const pet = pets.find((p) => p.petId === petId)!;
          return {
            petId: pet.petId,
            customerId: pet.customerId,
            reservationId: pet.reservationId,
            serviceType: pet.serviceType,
            templateType,
            title: `${pet.petName}'s Day at Tailtown`,
            summary: `${pet.petName} had a wonderful day!`,
            moodRating: defaultMood,
            energyRating: defaultEnergy,
            appetiteRating: defaultAppetite,
            socialRating: defaultSocial,
            activities: defaultActivities,
            highlights: ["Had a great time!"],
          };
        }
      );

      const result = await reportCardService.bulkCreateReportCards(reportCards);

      setSuccess(`Created ${result.created} report cards successfully!`);
      setTemplateDialogOpen(false);
      await loadTodaysPets();
    } catch (err: any) {
      setError(err.message || "Failed to create report cards");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSend = async () => {
    try {
      setLoading(true);
      setError(null);

      const reportIds = pets
        .filter((p) => selected.has(p.petId) && p.reportId)
        .map((p) => p.reportId!);

      if (reportIds.length === 0) {
        setError("No reports to send. Create reports first.");
        return;
      }

      const result = await reportCardService.bulkSendReportCards(reportIds, {
        sendEmail: true,
        sendSMS: true,
      });

      setSuccess(`Sent ${result.sent} report cards successfully!`);
      setSendDialogOpen(false);
      setSelected(new Set());
      await loadTodaysPets();
    } catch (err: any) {
      setError(err.message || "Failed to send report cards");
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selected.size;
  const selectedWithReports = pets.filter(
    (p) => selected.has(p.petId) && p.hasReport
  ).length;
  const selectedWithoutReports = pets.filter(
    (p) => selected.has(p.petId) && !p.hasReport
  ).length;

  return (
    <Box>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h5">Bulk Report Cards</Typography>
              <Typography variant="body2" color="text.secondary">
                Today's Daycare ({pets.length} pets)
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => setTemplateDialogOpen(true)}
                disabled={selectedWithoutReports === 0}
              >
                Apply Template ({selectedWithoutReports})
              </Button>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => setSendDialogOpen(true)}
                disabled={selectedWithReports === 0}
              >
                Send Selected ({selectedWithReports})
              </Button>
            </Stack>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        selected.size > 0 &&
                        selected.size ===
                          pets.filter((p) => !p.hasReport).length
                      }
                      indeterminate={
                        selected.size > 0 &&
                        selected.size < pets.filter((p) => !p.hasReport).length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Pet</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell align="center">Photos</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pets.map((pet) => (
                  <TableRow key={pet.petId} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(pet.petId)}
                        onChange={() => handleSelectOne(pet.petId)}
                        disabled={pet.hasReport}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {pet.petName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {pet.customerName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={reportCardService.formatServiceType(
                          pet.serviceType
                        )}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Badge badgeContent={pet.photoCount} color="primary">
                        <PhotoCamera color="action" />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pet.hasReport ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="Report Created"
                          size="small"
                          color="success"
                        />
                      ) : (
                        <Chip label="No Report" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {pet.hasReport ? (
                        <>
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                          <IconButton size="small">
                            <Edit />
                          </IconButton>
                        </>
                      ) : (
                        <Button size="small" variant="outlined">
                          Create
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Template Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Apply Template to {selectedWithoutReports} Reports
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              select
              label="Template"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as any)}
              fullWidth
            >
              <MenuItem value="DAYCARE_DAILY">Daycare Daily</MenuItem>
              <MenuItem value="BOARDING_DAILY">Boarding Daily</MenuItem>
              <MenuItem value="BOARDING_CHECKOUT">Boarding Checkout</MenuItem>
            </TextField>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Default Ratings
              </Typography>
              <Stack spacing={2}>
                <TextField
                  type="number"
                  label="Mood"
                  value={defaultMood}
                  onChange={(e) => setDefaultMood(Number(e.target.value))}
                  inputProps={{ min: 1, max: 5 }}
                  fullWidth
                />
                <TextField
                  type="number"
                  label="Energy"
                  value={defaultEnergy}
                  onChange={(e) => setDefaultEnergy(Number(e.target.value))}
                  inputProps={{ min: 1, max: 5 }}
                  fullWidth
                />
                <TextField
                  type="number"
                  label="Appetite"
                  value={defaultAppetite}
                  onChange={(e) => setDefaultAppetite(Number(e.target.value))}
                  inputProps={{ min: 1, max: 5 }}
                  fullWidth
                />
                <TextField
                  type="number"
                  label="Social"
                  value={defaultSocial}
                  onChange={(e) => setDefaultSocial(Number(e.target.value))}
                  inputProps={{ min: 1, max: 5 }}
                  fullWidth
                />
              </Stack>
            </Box>

            <Alert severity="info">
              This will create report cards with default values. You can edit
              individual reports before sending.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyTemplate}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Apply Template"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Dialog */}
      <Dialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send {selectedWithReports} Report Cards</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="info">
              This will send report cards via email and SMS to all selected
              customers.
            </Alert>
            <Typography variant="body2">
              Selected reports: {selectedWithReports}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Email notifications will be sent
              <br />
              • SMS notifications will be sent (if phone number available)
              <br />• Customers can view full reports with photos
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleBulkSend}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            Send Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkReportCardDashboard;
