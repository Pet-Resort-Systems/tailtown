import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LabelIcon from '@mui/icons-material/Label';
import PrintIcon from '@mui/icons-material/Print';
import {
  KennelLabelData,
  printKennelLabelsBatch,
} from '../../services/labelPrintService';

type PrintMethod = 'local' | 'browser' | 'server' | 'usb' | 'download';

type ReservationLike = {
  id: string;
  startDate: string;
  status?: string;
  customer?: { lastName?: string };
  pet?: {
    name?: string;
    playgroupCompatibility?: string;
  };
  service?: { serviceCategory?: string };
  resource?: { name?: string };
};

interface BatchLabelPrintDialogProps {
  open: boolean;
  onClose: () => void;
  reservations: ReservationLike[];
  selectedDate: Date;
}

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDateString = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLabelData = (r: ReservationLike): KennelLabelData | null => {
  const dogName = r.pet?.name?.trim() || '';
  const customerLastName = r.customer?.lastName?.trim() || '';
  const kennelNumber = r.resource?.name?.trim() || undefined;

  // Only require dog name - kennel and group can be blank
  if (!dogName) return null;

  // Map playgroupCompatibility enum to display labels
  const playgroupMap: Record<string, string> = {
    LARGE_DOG: 'Large',
    MEDIUM_DOG: 'Medium',
    SMALL_DOG: 'Small',
    SOLO_ONLY: 'Solo',
  };

  const groupSize = r.pet?.playgroupCompatibility
    ? playgroupMap[r.pet.playgroupCompatibility]
    : undefined;

  return {
    dogName,
    customerLastName,
    kennelNumber,
    groupSize,
  };
};

const BatchLabelPrintDialog: React.FC<BatchLabelPrintDialogProps> = ({
  open,
  onClose,
  reservations,
  selectedDate,
}) => {
  const [method, setMethod] = useState<PrintMethod>('local');
  const [printing, setPrinting] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [enrichedReservations, setEnrichedReservations] =
    useState<ReservationLike[]>(reservations);
  const [loading, setLoading] = useState(false);

  const selectedDateStr = useMemo(
    () => formatDateLocal(selectedDate),
    [selectedDate]
  );

  const checkInsForDay = useMemo(() => {
    return (reservations || []).filter((r) => {
      if (!r?.startDate) return false;
      const startDateStr = getLocalDateString(r.startDate);
      if (startDateStr !== selectedDateStr) return false;

      const status = r.status?.toUpperCase();
      return status !== 'CANCELLED' && status !== 'NO_SHOW';
    });
  }, [reservations, selectedDateStr]);

  const daycareReservations = useMemo(() => {
    return checkInsForDay.filter(
      (r) => r.service?.serviceCategory?.toUpperCase() === 'DAYCARE'
    );
  }, [checkInsForDay]);

  const boardingReservations = useMemo(() => {
    return checkInsForDay.filter(
      (r) => r.service?.serviceCategory?.toUpperCase() === 'BOARDING'
    );
  }, [checkInsForDay]);

  const computeBatch = (batchReservations: ReservationLike[]) => {
    const labels: KennelLabelData[] = [];
    const skipped: ReservationLike[] = [];

    for (const r of batchReservations) {
      const label = toLabelData(r);
      if (label) {
        labels.push(label);
      } else {
        skipped.push(r);
      }
    }

    return { labels, skipped };
  };

  const daycareBatch = useMemo(
    () => computeBatch(daycareReservations),
    [daycareReservations]
  );
  const boardingBatch = useMemo(
    () => computeBatch(boardingReservations),
    [boardingReservations]
  );

  const handlePrintBatch = async (
    batchName: string,
    labels: KennelLabelData[]
  ) => {
    setPrinting(true);
    setError(null);
    setSuccess(null);
    setProgressText(null);

    try {
      if (labels.length === 0) {
        setError(
          `No printable ${batchName} labels (missing kennel assignment or pet name).`
        );
        return;
      }

      const result = await printKennelLabelsBatch(labels, method, {
        delayMs: 250,
        onProgress: ({ index, total, label }) => {
          setProgressText(
            `Printing ${batchName}: ${index + 1}/${total} (${label.dogName} #${
              label.kennelNumber
            })`
          );
        },
      });

      if (result.failureCount > 0) {
        setError(
          `${batchName} printed with issues: ${result.successCount} succeeded, ${result.failureCount} failed.`
        );
      } else {
        setSuccess(
          `${batchName} printed: ${result.successCount} label(s) sent.`
        );
      }
    } catch (e: any) {
      setError(e?.message || `Failed to print ${batchName} labels`);
    } finally {
      setPrinting(false);
      setProgressText(null);
    }
  };

  const batchSummaryLine = (
    title: string,
    totalReservations: number,
    printable: number,
    skipped: number
  ) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {printable}/{totalReservations} printable
        {skipped > 0 ? ` (${skipped} missing kennel/name)` : ''}
      </Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LabelIcon />
            <Typography variant="h6">Batch Print Kennel Labels</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Check-in date: {selectedDateStr}
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Print Method</InputLabel>
          <Select
            value={method}
            label="Print Method"
            onChange={(e) => setMethod(e.target.value as PrintMethod)}
            disabled={printing}
          >
            <MenuItem value="local">Local Agent (automatic)</MenuItem>
            <MenuItem value="browser">Browser Print</MenuItem>
            <MenuItem value="download">Download ZPL</MenuItem>
            <MenuItem value="usb">USB Direct (requires setup)</MenuItem>
            <MenuItem value="server">Server Print</MenuItem>
          </Select>
        </FormControl>

        {printing && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            {progressText && (
              <Typography variant="caption" color="text.secondary">
                {progressText}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            {batchSummaryLine(
              'Daycare',
              daycareReservations.length,
              daycareBatch.labels.length,
              daycareBatch.skipped.length
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => handlePrintBatch('Daycare', daycareBatch.labels)}
                disabled={printing}
              >
                Print Daycare Labels
              </Button>
            </Box>
          </Box>

          <Divider />

          <Box>
            {batchSummaryLine(
              'Boarding',
              boardingReservations.length,
              boardingBatch.labels.length,
              boardingBatch.skipped.length
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() =>
                  handlePrintBatch('Boarding', boardingBatch.labels)
                }
                disabled={printing}
              >
                Print Boarding Labels
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={printing}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchLabelPrintDialog;
