import React from 'react';
import {
  Chip,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Pet } from '../../services/petService';
import { recalculateVaccineStatus, getRequiredVaccines } from '../../utils/vaccineUtils';

interface SimpleVaccinationBadgeProps {
  pet: Pet;
  showDetails?: boolean;
}

/**
 * Simple vaccination badge that uses pet's actual vaccination data
 * instead of making external API calls
 * 
 * IMPORTANT: Recalculates vaccine status based on TODAY's date to ensure
 * expired vaccines are properly detected even if the database hasn't been updated
 */
const SimpleVaccinationBadge: React.FC<SimpleVaccinationBadgeProps> = ({
  pet,
  showDetails = false,
}) => {
  const requiredVaccines = getRequiredVaccines(pet.type || 'DOG');
  
  // Recalculate vaccine status based on current date
  const vaccinationStatus = recalculateVaccineStatus(
    pet.vaccinationStatus,
    pet.vaccineExpirations
  );
  
  // Count vaccination status
  let expiredCount = 0;
  let missingCount = 0;
  let currentCount = 0;

  requiredVaccines.forEach(vaccine => {
    const vaccineRecord = vaccinationStatus[vaccine];
    if (!vaccineRecord) {
      missingCount++;
    } else if (vaccineRecord.status === 'EXPIRED') {
      expiredCount++;
    } else if (vaccineRecord.status === 'CURRENT') {
      currentCount++;
    } else {
      missingCount++;
    }
  });

  // Determine status and color - based on expired OR missing vaccines
  const getStatusColor = () => {
    const needsAttention = expiredCount + missingCount;
    if (needsAttention === 0) return 'success';
    if (expiredCount > 0) return 'error'; // Red if any are expired
    return 'warning'; // Orange if only missing
  };

  const getStatusIcon = () => {
    const needsAttention = expiredCount + missingCount;
    if (needsAttention === 0) return <CheckIcon />;
    if (expiredCount > 0) return <ErrorIcon />; // Error icon if expired
    return <WarningIcon />; // Warning icon if only missing
  };

  const getStatusLabel = () => {
    // Count both expired AND missing vaccines as needing attention
    const needsAttention = expiredCount + missingCount;
    
    if (needsAttention === 0) return 'Current';
    if (needsAttention === 1) return '1 Due';
    return `${needsAttention} Due`;
  };

  const getTooltipText = () => {
    const parts = [];
    if (expiredCount > 0) parts.push(`${expiredCount} expired`);
    if (missingCount > 0) parts.push(`${missingCount} due`);
    if (currentCount > 0) parts.push(`${currentCount} current`);
    
    if (parts.length === 0) {
      return 'All required vaccines are current';
    }
    return `Vaccine status: ${parts.join(', ')}`;
  };

  // Get detailed vaccine info for tooltip
  const getDetailedTooltip = () => {
    const vaccineDetails: string[] = [];
    
    requiredVaccines.forEach(vaccine => {
      const vaccineRecord = vaccinationStatus[vaccine];
      const vaccineName = vaccine.charAt(0).toUpperCase() + vaccine.slice(1);
      
      if (!vaccineRecord) {
        vaccineDetails.push(`${vaccineName}: Missing`);
      } else if (vaccineRecord.status === 'EXPIRED') {
        const expiredDate = vaccineRecord.expiration ? 
          new Date(vaccineRecord.expiration).toLocaleDateString() : 'Unknown';
        vaccineDetails.push(`${vaccineName}: Expired (${expiredDate})`);
      } else if (vaccineRecord.status === 'CURRENT') {
        const expireDate = vaccineRecord.expiration ? 
          new Date(vaccineRecord.expiration).toLocaleDateString() : 'Unknown';
        vaccineDetails.push(`${vaccineName}: Current (expires ${expireDate})`);
      }
    });
    
    return vaccineDetails.join('\n');
  };

  return (
    <Tooltip title={showDetails ? getDetailedTooltip() : getTooltipText()}>
      <Chip
        icon={getStatusIcon()}
        label={getStatusLabel()}
        size="small"
        color={getStatusColor()}
        variant="outlined"
        sx={{ fontSize: '0.7rem', height: '20px' }}
      />
    </Tooltip>
  );
};

export default SimpleVaccinationBadge;
