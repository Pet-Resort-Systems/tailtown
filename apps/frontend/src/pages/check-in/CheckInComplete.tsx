import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrintIcon from '@mui/icons-material/Print';
import LabelIcon from '@mui/icons-material/Label';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import checkInService, {
  CheckInBelonging,
} from '../../services/checkInService';
import BelongingsForm from '../../components/check-in/BelongingsForm';
import KennelLabelPrint from '../../components/labels/KennelLabelPrint';

// Map PlayGroupType enum to display-friendly group size
const mapPlayGroupToSize = (playGroup?: string): string => {
  if (!playGroup) return 'Medium';
  const group = playGroup.toUpperCase();
  if (group.includes('SMALL')) return 'Small';
  if (group.includes('LARGE')) return 'Large';
  return 'Medium';
};

const CheckInComplete: React.FC = () => {
  const { checkInId } = useParams<{ checkInId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit belongings state
  const [editingBelongings, setEditingBelongings] = useState(false);
  const [belongings, setBelongings] = useState<CheckInBelonging[]>([]);
  const [savingBelongings, setSavingBelongings] = useState(false);

  // Label printing state
  const [showLabelPrint, setShowLabelPrint] = useState(false);

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadCheckIn();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkInId]
  );

  const loadCheckIn = async () => {
    try {
      setLoading(true);
      const response = await checkInService.getCheckInById(checkInId!);
      setCheckIn(response.data);
    } catch (err: any) {
      console.error('Error loading check-in:', err);
      setError(
        err.response?.data?.message || 'Failed to load check-in details'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenEditBelongings = () => {
    setBelongings(checkIn?.belongings || []);
    setEditingBelongings(true);
  };

  const handleSaveBelongings = async () => {
    try {
      setSavingBelongings(true);
      await checkInService.updateCheckIn(checkInId!, { belongings });
      setCheckIn({ ...checkIn, belongings });
      setEditingBelongings(false);
    } catch (err) {
      console.error('Error saving belongings:', err);
    } finally {
      setSavingBelongings(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
            Return to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
          <CheckCircleIcon
            sx={{ fontSize: 80, color: 'success.main', mb: 2 }}
          />
          <Typography variant="h4" gutterBottom>
            Check-In Complete!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {checkIn?.pet?.name} has been successfully checked in.
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Check-In Summary
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Pet Name
              </Typography>
              <Typography variant="body1">{checkIn?.pet?.name}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Pet Type
              </Typography>
              <Typography variant="body1">{checkIn?.pet?.type}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Check-In Time
              </Typography>
              <Typography variant="body1">
                {new Date(checkIn?.checkInTime).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Checked In By
              </Typography>
              <Typography variant="body1">
                {checkIn?.checkInBy || 'Staff'}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Medications
              </Typography>
              <Typography variant="h6" color="primary.main">
                {checkIn?.medications?.length || 0}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Belongings
              </Typography>
              <Typography variant="h6" color="primary.main">
                {checkIn?.belongings?.length || 0}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Agreement
              </Typography>
              <Typography variant="h6" color="success.main">
                {checkIn?.agreement ? '✓ Signed' : '✗ Not Signed'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {checkIn?.medications && checkIn.medications.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Medications ({checkIn.medications.length})
            </Typography>
            <Divider sx={{ my: 2 }} />
            {checkIn.medications.map((med: any, index: number) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {med.medicationName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dosage: {med.dosage} | Frequency: {med.frequency}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Method: {med.administrationMethod.replace(/_/g, ' ')}
                  {med.timeOfDay && ` | Time: ${med.timeOfDay}`}
                  {med.withFood && ' | Give with food'}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Belongings ({checkIn?.belongings?.length || 0})
            </Typography>
            <IconButton
              size="small"
              onClick={handleOpenEditBelongings}
              sx={{ '@media print': { display: 'none' } }}
            >
              <EditIcon />
            </IconButton>
          </Box>
          <Divider sx={{ my: 2 }} />
          {checkIn?.belongings && checkIn.belongings.length > 0 ? (
            checkIn.belongings.map((item: any, index: number) => (
              <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                • {item.quantity}x {item.itemType} - {item.description}
                {item.color && ` (${item.color})`}
              </Typography>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No belongings recorded. Click the edit button to add items.
            </Typography>
          )}
        </Paper>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            mt: 4,
            '@media print': { display: 'none' },
          }}
        >
          <Button
            variant="outlined"
            startIcon={<LabelIcon />}
            onClick={() => setShowLabelPrint(true)}
          >
            Print Kennel Label
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Summary
          </Button>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </Box>

        {/* Edit Belongings Dialog */}
        <Dialog
          open={editingBelongings}
          onClose={() => setEditingBelongings(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Edit Belongings</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <BelongingsForm
                belongings={belongings}
                onChange={setBelongings}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingBelongings(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveBelongings}
              disabled={savingBelongings}
            >
              {savingBelongings ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Kennel Label Print Dialog */}
        <KennelLabelPrint
          open={showLabelPrint}
          onClose={() => setShowLabelPrint(false)}
          initialData={{
            dogName: checkIn?.pet?.name || '',
            customerLastName:
              checkIn?.reservation?.customer?.lastName ||
              checkIn?.pet?.Customer?.lastName ||
              '',
            kennelNumber: checkIn?.reservation?.resource?.name || '',
            groupSize: mapPlayGroupToSize(checkIn?.pet?.idealPlayGroup),
          }}
        />
      </Box>
    </Container>
  );
};

export default CheckInComplete;
