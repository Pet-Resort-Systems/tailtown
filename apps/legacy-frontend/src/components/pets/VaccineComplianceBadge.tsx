import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  Typography,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import vaccineService from '../../services/vaccineService';
import { PetVaccineCompliance } from '../../types/vaccine';

interface VaccineComplianceBadgeProps {
  petId: string;
  serviceType?: 'BOARDING' | 'DAYCARE' | 'GROOMING';
  showDetails?: boolean;
}

const VaccineComplianceBadge: React.FC<VaccineComplianceBadgeProps> = ({
  petId,
  serviceType,
  showDetails = false,
}) => {
  const [compliance, setCompliance] = useState<PetVaccineCompliance | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadCompliance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, serviceType]);

  const loadCompliance = async () => {
    try {
      setLoading(true);
      const data = await vaccineService.checkCompliance(petId, serviceType);
      setCompliance(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to check vaccine compliance');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="inline-flex" alignItems="center">
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (error || !compliance) {
    return (
      <Tooltip title={error || 'Unable to check compliance'}>
        <Chip
          icon={<WarningIcon />}
          label="Unknown"
          size="small"
          color="default"
        />
      </Tooltip>
    );
  }

  const getStatusColor = () => {
    if (compliance.isFullyCompliant) return 'success';
    if (compliance.summary.expired > 0) return 'error';
    if (compliance.summary.expiringSoon > 0) return 'warning';
    if (compliance.summary.missing > 0) return 'error';
    return 'default';
  };

  const getStatusIcon = () => {
    if (compliance.isFullyCompliant) return <CheckIcon />;
    if (compliance.summary.expired > 0 || compliance.summary.missing > 0)
      return <ErrorIcon />;
    if (compliance.summary.expiringSoon > 0) return <WarningIcon />;
    return undefined;
  };

  const getStatusLabel = () => {
    if (compliance.isFullyCompliant) return 'Compliant';
    if (compliance.summary.missing > 0)
      return `${compliance.summary.missing} Missing`;
    if (compliance.summary.expired > 0)
      return `${compliance.summary.expired} Expired`;
    if (compliance.summary.expiringSoon > 0)
      return `${compliance.summary.expiringSoon} Expiring Soon`;
    return 'Check Required';
  };

  const getTooltipText = () => {
    const parts = [];
    if (compliance.summary.missing > 0) {
      parts.push(`${compliance.summary.missing} missing`);
    }
    if (compliance.summary.expired > 0) {
      parts.push(`${compliance.summary.expired} expired`);
    }
    if (compliance.summary.expiringSoon > 0) {
      parts.push(`${compliance.summary.expiringSoon} expiring soon`);
    }
    if (parts.length === 0) {
      return 'All required vaccines are current';
    }
    return `Vaccine issues: ${parts.join(', ')}`;
  };

  return (
    <Box>
      <Tooltip title={getTooltipText()}>
        <Chip
          icon={getStatusIcon()}
          label={getStatusLabel()}
          size="small"
          color={getStatusColor()}
          onClick={showDetails ? () => setExpanded(!expanded) : undefined}
          sx={{ cursor: showDetails ? 'pointer' : 'default' }}
        />
      </Tooltip>

      {showDetails && (
        <Collapse in={expanded}>
          <Box
            sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Vaccine Compliance Details
            </Typography>

            {compliance.missingRequired.length > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  Missing Required Vaccines:
                </Typography>
                <Typography variant="body2">
                  {compliance.missingRequired.join(', ')}
                </Typography>
              </Alert>
            )}

            {compliance.complianceResults.map((result) => (
              <Box
                key={result.requirementId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="body2">
                    {result.vaccineName}
                    {result.isRequired && (
                      <Chip
                        label="Required"
                        size="small"
                        color="error"
                        sx={{ ml: 1, height: 18 }}
                      />
                    )}
                  </Typography>
                  {result.expirationDate && (
                    <Typography variant="caption" color="text.secondary">
                      Expires:{' '}
                      {new Date(result.expirationDate).toLocaleDateString()}
                      {result.daysUntilExpiration !== null &&
                        result.daysUntilExpiration !== undefined &&
                        result.daysUntilExpiration > 0 && (
                          <> ({result.daysUntilExpiration} days)</>
                        )}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={result.status.replace('_', ' ')}
                  size="small"
                  color={
                    result.status === 'CURRENT'
                      ? 'success'
                      : result.status === 'EXPIRED'
                        ? 'error'
                        : result.status === 'EXPIRING_SOON'
                          ? 'warning'
                          : 'default'
                  }
                />
              </Box>
            ))}

            <Box
              sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}
            >
              <Typography variant="caption" color="text.secondary">
                Total: {compliance.summary.total} vaccines
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Compliant: {compliance.summary.compliant}/
                {compliance.summary.required} required
              </Typography>
            </Box>
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default VaccineComplianceBadge;
