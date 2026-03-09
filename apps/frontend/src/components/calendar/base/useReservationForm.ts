import { useState, useCallback } from 'react';
import { Reservation, reservationService } from '../../../services/reservationService';

/**
 * Form data structure for reservation creation/editing
 */
export interface ReservationFormData {
  customerId: string;
  petId: string;
  serviceId: string;
  startDate: Date | string;
  endDate: Date | string;
  status?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  notes?: string;
  staffNotes?: string;
  resourceId?: string;
  suiteType?: string;
  [key: string]: any;
}

/**
 * Options for the useReservationForm hook
 */
interface UseReservationFormOptions {
  /**
   * Callback when reservation is created or updated
   */
  onReservationChange?: (reservation: Reservation) => void;
  
  /**
   * Callback when form is submitted
   */
  onSubmitSuccess?: (response: any) => void;
  
  /**
   * Callback when form submission fails
   */
  onSubmitError?: (error: any) => void;
  
  /**
   * Whether to close the form after successful submission
   */
  closeOnSubmit?: boolean;
  
  /**
   * Whether to show add-ons dialog for new reservations
   */
  showAddOns?: boolean;
}

/**
 * Custom hook for managing reservation forms
 */
export function useReservationForm(options: UseReservationFormOptions = {}) {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedDate, setSelectedDate] = useState<{ start: Date; end: Date } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Open the form for creating a new reservation
   */
  const openNewReservationForm = useCallback((dateRange: { start: Date; end: Date }) => {
    setSelectedReservation(null);
    setSelectedDate(dateRange);
    setError(null);
    setIsFormOpen(true);
  }, []);

  /**
   * Open the form for editing an existing reservation
   */
  const openEditReservationForm = useCallback(async (reservationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the full reservation data
      const reservation = await reservationService.getReservationById(reservationId);
      
      if (reservation) {
        setSelectedReservation(reservation);
        setSelectedDate({
          start: new Date(reservation.startDate),
          end: new Date(reservation.endDate)
        });
        setIsFormOpen(true);
      } else {
        setError('Failed to load reservation data');
      }
    } catch (error) {
      console.error('Error loading reservation:', error);
      setError('Failed to load reservation data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Close the form
   */
  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setSelectedReservation(null);
    setSelectedDate(null);
    setError(null);
  }, []);

  /**
   * Handle form submission
   */
  const handleFormSubmit = useCallback(async (formData: ReservationFormData): Promise<{reservationId?: string} | void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine if this is a new reservation or an update
      const isNewReservation = !selectedReservation;
      
      // Convert dates to strings if they are Date objects
      const processedFormData = {
        ...formData,
        startDate: formData.startDate instanceof Date ? formData.startDate.toISOString() : formData.startDate,
        endDate: formData.endDate instanceof Date ? formData.endDate.toISOString() : formData.endDate
      };
      
      // Call API to create or update reservation
      let result: any;
      let updatedReservation: any = null;
      
      if (isNewReservation) {
        // Create a new reservation
        result = await reservationService.createReservation(processedFormData as any);
      } else if (selectedReservation) {
        // Update an existing reservation
        result = await reservationService.updateReservation(selectedReservation.id, processedFormData as any);
      } else {
        throw new Error('No reservation selected for update');
      }
      
      // Process the response to extract the updated reservation
      if (result && typeof result === 'object') {
        if ('data' in result) {
          updatedReservation = result.data?.reservation ?? result.data;
        } else if ('reservation' in result) {
          updatedReservation = result.reservation;
        } else {
          updatedReservation = result;
        }
      } else {
        updatedReservation = result;
      }
      
      // Process the result
      if (updatedReservation && (updatedReservation.id || updatedReservation._id)) {
        // Call the onReservationChange callback
        if (options.onReservationChange) {
          options.onReservationChange(updatedReservation as Reservation);
        }
        
        // Call the onSubmitSuccess callback
        if (options.onSubmitSuccess) {
          options.onSubmitSuccess(updatedReservation);
        }
        
        // Close the form if specified
        if (options.closeOnSubmit || !isNewReservation || !options.showAddOns) {
          closeForm();
        }
        
        // Extract the reservation ID
        const reservationId = updatedReservation.id || updatedReservation._id;
        
        // Return the reservation ID for add-ons if this is a new reservation
        if (isNewReservation && options.showAddOns) {
          return { reservationId };
        }
      } else {
        throw new Error('Failed to create/update reservation');
      }
    } catch (error: any) {
      console.error('Error creating/updating reservation:', error);
      
      // Set error message
      const errorMessage = error.message || 'Failed to save reservation';
      setError(errorMessage);
      
      // Call the onSubmitError callback
      if (options.onSubmitError) {
        options.onSubmitError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedReservation, closeForm, options]);

  return {
    isFormOpen,
    selectedReservation,
    selectedDate,
    loading,
    error,
    openNewReservationForm,
    openEditReservationForm,
    closeForm,
    handleFormSubmit,
    setError
  };
}

export default useReservationForm;
