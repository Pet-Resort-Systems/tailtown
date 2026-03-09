import React, { memo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import ReservationForm from '../../reservations/ReservationForm';
import { ExtendedResource, Reservation } from '../../../hooks/useKennelData';

interface ReservationFormWrapperProps {
  selectedKennel: ExtendedResource | null;
  selectedDate: { start: Date; end: Date } | null;
  selectedReservation: Reservation | null;
  onSubmit: (formData: any) => Promise<{reservationId?: string} | void>;
  onClose?: () => void;
  error?: string | null;
}

/**
 * Wrapper component for the reservation form to prevent unnecessary re-renders
 * Memoized to optimize performance when parent component updates
 */
const ReservationFormWrapper: React.FC<ReservationFormWrapperProps> = memo(({ 
  selectedKennel, 
  selectedDate, 
  selectedReservation, 
  onSubmit,
  onClose,
  error
}) => {
  // If we don't have the required data, show loading
  if (!selectedKennel || !selectedDate) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Create the initial data object for the form
  const formInitialData = selectedReservation ? {
    ...selectedReservation,
    // Preserve existing reservation data
    customerId: selectedReservation.customerId,
    petId: selectedReservation.petId,
    serviceId: selectedReservation.serviceId,
    // Include resourceId/kennelId for kennel assignment
    resourceId: selectedReservation.resourceId || selectedReservation.resource?.id,
    kennelId: selectedReservation.resourceId || selectedReservation.resource?.id,
  } : {
    // For new reservations, pre-populate with the selected kennel
    suiteNumber: selectedKennel.suiteNumber || '',
    suiteName: selectedKennel.name || '',
    suiteType: selectedKennel.type || selectedKennel.attributes?.suiteType || 'STANDARD_SUITE',
    startDate: selectedDate.start,
    endDate: selectedDate.end,
    kennelId: selectedKennel.id
  };
  
  return (
    <ReservationForm
      onSubmit={onSubmit}
      initialData={formInitialData}
      defaultDates={selectedDate}
      showAddOns={true}
      serviceCategories={['BOARDING', 'DAYCARE']}
      onClose={onClose}
    />
  );
});

ReservationFormWrapper.displayName = 'ReservationFormWrapper';

export default ReservationFormWrapper;
