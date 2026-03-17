import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Block as InvalidateIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import serviceAgreementService, {
  ServiceAgreement,
} from '../../services/serviceAgreementService';

interface CustomerAgreementHistoryProps {
  customerId: string;
  showTitle?: boolean;
  compact?: boolean;
}

const CustomerAgreementHistory: React.FC<CustomerAgreementHistoryProps> = ({
  customerId,
  showTitle = true,
  compact = false,
}) => {
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [invalidateDialogOpen, setInvalidateDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] =
    useState<ServiceAgreement | null>(null);
  const [invalidateReason, setInvalidateReason] = useState('');
  const [invalidating, setInvalidating] = useState(false);

  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const result =
        await serviceAgreementService.getCustomerAgreements(customerId);
      setAgreements(result.agreements);
      setTotal(result.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      loadAgreements();
    }
  }, [customerId, loadAgreements]);

  const handleView = (agreement: ServiceAgreement) => {
    setSelectedAgreement(agreement);
    setViewDialogOpen(true);
  };

  const handleOpenInvalidate = (agreement: ServiceAgreement) => {
    setSelectedAgreement(agreement);
    setInvalidateReason('');
    setInvalidateDialogOpen(true);
  };

  const handleInvalidate = async () => {
    if (!selectedAgreement || !invalidateReason.trim()) return;

    try {
      setInvalidating(true);
      await serviceAgreementService.invalidateAgreement(
        selectedAgreement.id,
        invalidateReason
      );
      setInvalidateDialogOpen(false);
      loadAgreements();
    } catch (err: any) {
      setError(err.message || 'Failed to invalidate agreement');
    } finally {
      setInvalidating(false);
    }
  };

  const getStatusChip = (agreement: ServiceAgreement) => {
    if (!agreement.isValid) {
      return (
        <Chip
          icon={<InvalidIcon />}
          label="Invalidated"
          color="error"
          size="small"
        />
      );
    }

    if (agreement.expiresAt && new Date(agreement.expiresAt) < new Date()) {
      return <Chip label="Expired" color="warning" size="small" />;
    }

    return (
      <Chip icon={<ValidIcon />} label="Valid" color="success" size="small" />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (agreements.length === 0) {
    return (
      <Box py={2}>
        {showTitle && (
          <Typography variant="subtitle1" gutterBottom>
            Agreement History
          </Typography>
        )}
        <Typography color="textSecondary">
          No service agreements on file.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {showTitle && (
        <Typography variant="subtitle1" gutterBottom>
          Agreement History ({total})
        </Typography>
      )}

      <TableContainer component={compact ? Box : Paper}>
        <Table size={compact ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Date Signed</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Signed By</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements.map((agreement) => (
              <TableRow key={agreement.id}>
                <TableCell>
                  {format(new Date(agreement.signedAt), 'MMM d, yyyy h:mm a')}
                </TableCell>
                <TableCell>
                  {agreement.template?.name || 'Unknown Template'}
                  {agreement.templateVersion && (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      display="block"
                    >
                      v{agreement.templateVersion}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{agreement.signedBy}</TableCell>
                <TableCell>{getStatusChip(agreement)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View Agreement">
                    <IconButton
                      size="small"
                      onClick={() => handleView(agreement)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {agreement.isValid && (
                    <Tooltip title="Invalidate">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenInvalidate(agreement)}
                        color="error"
                      >
                        <InvalidateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Agreement Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Service Agreement
          <Typography variant="subtitle2" color="textSecondary">
            Signed on{' '}
            {selectedAgreement &&
              format(
                new Date(selectedAgreement.signedAt),
                'MMMM d, yyyy at h:mm a'
              )}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAgreement && (
            <Box>
              {/* Status Banner */}
              {!selectedAgreement.isValid && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Agreement Invalidated
                  </Typography>
                  <Typography variant="body2">
                    Reason:{' '}
                    {selectedAgreement.invalidReason || 'No reason provided'}
                  </Typography>
                  {selectedAgreement.invalidatedAt && (
                    <Typography variant="caption">
                      Invalidated on{' '}
                      {format(
                        new Date(selectedAgreement.invalidatedAt),
                        'MMM d, yyyy'
                      )}
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Agreement Content */}
              <Paper
                variant="outlined"
                sx={{ p: 3, mb: 3, maxHeight: '300px', overflow: 'auto' }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedAgreement.agreementText,
                  }}
                />
              </Paper>

              {/* Initials */}
              {selectedAgreement.initials &&
                Array.isArray(selectedAgreement.initials) &&
                selectedAgreement.initials.length > 0 && (
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      Section Acknowledgments
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {selectedAgreement.initials.map((initial, index) => (
                        <Box
                          key={index}
                          display="flex"
                          justifyContent="space-between"
                          py={0.5}
                        >
                          <Typography variant="body2">
                            {initial.section}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {initial.initials}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                )}

              {/* Question Responses */}
              {selectedAgreement.questionResponses &&
                Array.isArray(selectedAgreement.questionResponses) &&
                selectedAgreement.questionResponses.length > 0 && (
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      Question Responses
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {selectedAgreement.questionResponses.map((qr, index) => (
                        <Box
                          key={index}
                          sx={{
                            mb:
                              index <
                              selectedAgreement.questionResponses!.length - 1
                                ? 1.5
                                : 0,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {qr.question}
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {typeof qr.response === 'boolean'
                              ? qr.response
                                ? 'Yes'
                                : 'No'
                              : String(qr.response || 'No response')}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                )}

              {/* Signature */}
              {selectedAgreement.signature && (
                <Box mb={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Signature
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, display: 'inline-block' }}
                  >
                    <img
                      src={selectedAgreement.signature}
                      alt="Signature"
                      style={{ maxWidth: '300px', maxHeight: '100px' }}
                    />
                  </Paper>
                </Box>
              )}

              {/* Signer Info */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Signed By
                </Typography>
                <Typography>{selectedAgreement.signedBy}</Typography>
                {selectedAgreement.ipAddress && (
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    display="block"
                  >
                    IP: {selectedAgreement.ipAddress}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Invalidate Dialog */}
      <Dialog
        open={invalidateDialogOpen}
        onClose={() => setInvalidateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invalidate Agreement</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The customer will need to sign a new
            agreement.
          </Alert>
          <TextField
            label="Reason for Invalidation"
            value={invalidateReason}
            onChange={(e) => setInvalidateReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            required
            placeholder="e.g., Customer requested changes, policy updated, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setInvalidateDialogOpen(false)}
            disabled={invalidating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInvalidate}
            color="error"
            variant="contained"
            disabled={!invalidateReason.trim() || invalidating}
          >
            {invalidating ? 'Invalidating...' : 'Invalidate Agreement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerAgreementHistory;
