import React from 'react';
import {
  Box,
  FormControl,
  TextField,
  Typography,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import { getRequiredVaccines } from '../utils/vaccineUtils';

interface VaccineInfo {
  status: 'CURRENT' | 'EXPIRED' | 'PENDING';
  lastGiven?: string;
  notes?: string;
}

interface VaccineExpirations {
  [key: string]: string; // ISO date string
}

interface VaccinationStatusProps {
  vaccinationStatus: { [key: string]: VaccineInfo | string } | undefined;
  vaccineExpirations: VaccineExpirations | undefined;
  onVaccinationStatusChange: (key: string, value: VaccineInfo | string) => void;
  onVaccineExpirationChange: (key: string, value: string) => void;
  petType?: string; // Add petType to determine which vaccines to show
}

export const VaccinationStatus: React.FC<VaccinationStatusProps> = ({
  vaccinationStatus,
  vaccineExpirations,
  onVaccinationStatusChange,
  onVaccineExpirationChange,
  petType = 'DOG', // Default to DOG if not provided
}) => {
  // Get required vaccines based on pet type (returns lowercase names)
  const requiredVaccinesLower = getRequiredVaccines(petType);
  
  // Convert to capitalized format to match existing data structure
  const VACCINE_TYPES = requiredVaccinesLower.map(vaccine => 
    vaccine.charAt(0).toUpperCase() + vaccine.slice(1).toLowerCase()
  ).map(vaccine => {
    // Special case for DHPP and FVRCP which should be all caps
    if (vaccine === 'Dhpp') return 'DHPP';
    if (vaccine === 'Fvrcp') return 'FVRCP';
    return vaccine;
  });
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Vaccination Status
      </Typography>
      {VACCINE_TYPES.map((vaccineType) => (
        <Box
          key={vaccineType}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <Typography variant="subtitle1">{vaccineType}</Typography>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={(() => {
                if (!vaccinationStatus || !vaccinationStatus[vaccineType]) return 'pending';
                const value = vaccinationStatus[vaccineType];
                // Handle both string format and object format
                if (typeof value === 'string') {
                  return value.toLowerCase();
                }
                return value.status?.toLowerCase() || 'pending';
              })()}
              label="Status"
              onChange={(e) => {
                // Save as lowercase string for consistency with backend
                onVaccinationStatusChange(vaccineType, e.target.value);
              }}
            >
              <MenuItem value="current">Current</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Expiration Date"
            type="date"
            value={(vaccineExpirations && vaccineExpirations[vaccineType]?.split('T')[0]) || ''}
            onChange={(e) => {
              if (e.target.value) {
                onVaccineExpirationChange(
                  vaccineType,
                  new Date(e.target.value).toISOString()
                );
              }
            }}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
          />
        </Box>
      ))}
    </Box>
  );
};

export default VaccinationStatus;
