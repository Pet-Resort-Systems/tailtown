/**
 * Waitlist Dashboard
 *
 * Staff dashboard for managing waitlist entries
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Hotel as HotelIcon,
  Pets as PetsIcon,
  ContentCut as GroomingIcon,
  School as TrainingIcon,
} from '@mui/icons-material';
import { waitlistService, WaitlistEntry } from '../../services/waitlistService';
import { format } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`waitlist-tabpanel-${index}`}
      aria-labelledby={`waitlist-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const WaitlistDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [grouped, setGrouped] = useState<Record<string, WaitlistEntry[]>>({});
  const [summary, setSummary] = useState<any>(null);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(
    null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWaitlist();
  }, []);

  const loadWaitlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await waitlistService.listEntries();
      setEntries(data.entries);
      setGrouped(data.grouped);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewDetails = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setDetailsOpen(true);
  };

  const handleNotify = async (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setNotifyDialogOpen(true);
  };

  const handleCancelEntry = async (id: string) => {
    try {
      await waitlistService.updateEntry(id, { status: 'CANCELLED' });
      await loadWaitlist();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel entry');
    }
  };

  const getServiceIcon = (serviceType: string) => {
    const icons: Record<string, React.ReactElement> = {
      BOARDING: <HotelIcon />,
      DAYCARE: <PetsIcon />,
      GROOMING: <GroomingIcon />,
      TRAINING: <TrainingIcon />,
    };
    return icons[serviceType] || <InfoIcon />;
  };

  const renderEntryCard = (entry: WaitlistEntry) => (
    <Card key={entry.id} sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ mr: 1 }}>{getServiceIcon(entry.serviceType)}</Box>
              <Typography variant="h6">
                {entry.customer?.firstName} {entry.customer?.lastName}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Pet: {entry.pet?.name} ({entry.pet?.type})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Requested:{' '}
              {format(new Date(entry.requestedStartDate), 'MMM dd, yyyy')}
              {entry.requestedEndDate &&
                ` - ${format(
                  new Date(entry.requestedEndDate),
                  'MMM dd, yyyy'
                )}`}
            </Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                #{entry.position}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Position in Queue
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip
                label={waitlistService.formatStatus(entry.status)}
                color={waitlistService.getStatusColor(entry.status)}
                size="small"
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<NotificationsIcon />}
                onClick={() => handleNotify(entry)}
                disabled={entry.status !== 'ACTIVE'}
              >
                Notify
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => handleViewDetails(entry)}
              >
                Details
              </Button>
            </Box>
          </Grid>
        </Grid>

        {entry.customerNotes && (
          <Box
            sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              Customer Notes:
            </Typography>
            <Typography variant="body2">{entry.customerNotes}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Card>
        <CardHeader
          title="Waitlist Management"
          subheader={`${summary?.total || 0} total entries`}
          action={
            <Button
              variant="contained"
              startIcon={<NotificationsIcon />}
              onClick={loadWaitlist}
            >
              Refresh
            </Button>
          }
        />

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="waitlist tabs"
          >
            <Tab label={`All (${summary?.total || 0})`} />
            <Tab label={`Boarding (${grouped.BOARDING?.length || 0})`} />
            <Tab label={`Daycare (${grouped.DAYCARE?.length || 0})`} />
            <Tab label={`Grooming (${grouped.GROOMING?.length || 0})`} />
            <Tab label={`Training (${grouped.TRAINING?.length || 0})`} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {entries.length === 0 ? (
            <Alert severity="info">No waitlist entries</Alert>
          ) : (
            entries.map(renderEntryCard)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {grouped.BOARDING?.length === 0 ? (
            <Alert severity="info">No boarding waitlist entries</Alert>
          ) : (
            grouped.BOARDING?.map(renderEntryCard)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {grouped.DAYCARE?.length === 0 ? (
            <Alert severity="info">No daycare waitlist entries</Alert>
          ) : (
            grouped.DAYCARE?.map(renderEntryCard)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {grouped.GROOMING?.length === 0 ? (
            <Alert severity="info">No grooming waitlist entries</Alert>
          ) : (
            grouped.GROOMING?.map(renderEntryCard)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {grouped.TRAINING?.length === 0 ? (
            <Alert severity="info">No training waitlist entries</Alert>
          ) : (
            grouped.TRAINING?.map(renderEntryCard)
          )}
        </TabPanel>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Waitlist Entry Details</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.customer?.firstName}{' '}
                    {selectedEntry.customer?.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEntry.customer?.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEntry.customer?.phone}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Pet
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.pet?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEntry.pet?.type} - {selectedEntry.pet?.breed}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Service Type
                  </Typography>
                  <Typography variant="body1">
                    {waitlistService.formatServiceType(
                      selectedEntry.serviceType
                    )}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={waitlistService.formatStatus(selectedEntry.status)}
                    color={waitlistService.getStatusColor(selectedEntry.status)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Requested Dates
                  </Typography>
                  <Typography variant="body1">
                    {format(
                      new Date(selectedEntry.requestedStartDate),
                      'MMM dd, yyyy'
                    )}
                    {selectedEntry.requestedEndDate &&
                      ` - ${format(
                        new Date(selectedEntry.requestedEndDate),
                        'MMM dd, yyyy'
                      )}`}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Position
                  </Typography>
                  <Typography variant="body1">
                    #{selectedEntry.position}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Flexible Dates
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.flexibleDates
                      ? `Yes (±${selectedEntry.dateFlexibilityDays} days)`
                      : 'No'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notifications Sent
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.notificationsSent}
                  </Typography>
                </Grid>

                {selectedEntry.customerNotes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Customer Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedEntry.customerNotes}
                    </Typography>
                  </Grid>
                )}

                {selectedEntry.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Staff Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedEntry.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          {selectedEntry && selectedEntry.status === 'ACTIVE' && (
            <>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  handleCancelEntry(selectedEntry.id);
                  setDetailsOpen(false);
                }}
              >
                Cancel Entry
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setDetailsOpen(false);
                  handleNotify(selectedEntry);
                }}
              >
                Notify Customer
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog
        open={notifyDialogOpen}
        onClose={() => setNotifyDialogOpen(false)}
      >
        <DialogTitle>Notify Customer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will send a notification to the customer that a spot is
            available.
          </Typography>
          {selectedEntry && (
            <Alert severity="info">
              Customer: {selectedEntry.customer?.firstName}{' '}
              {selectedEntry.customer?.lastName}
              <br />
              Email: {selectedEntry.customer?.email}
              <br />
              Phone: {selectedEntry.customer?.phone}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              // TODO: Implement notification sending
              setNotifyDialogOpen(false);
              alert('Notification feature coming soon!');
            }}
          >
            Send Notification
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WaitlistDashboard;
