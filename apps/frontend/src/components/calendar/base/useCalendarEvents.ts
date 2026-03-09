import { useState, useCallback, useEffect } from 'react';
import { Reservation, reservationService } from '../../../services/reservationService';
import { CalendarEvent, STATUS_COLORS } from './types';
import { formatDateToYYYYMMDD } from '../../../utils/dateUtils';

/**
 * Hook options for useCalendarEvents
 */
interface UseCalendarEventsOptions {
  /**
   * Filter reservations by service categories
   */
  serviceCategories?: string[];
  
  /**
   * Event transformation function
   */
  transformEvent?: (reservation: any) => CalendarEvent;
  
  /**
   * Initial date for the calendar
   */
  initialDate?: Date;
  
  /**
   * Default status filter
   */
  statusFilter?: string;
}

/**
 * Custom hook for managing calendar events with standardized loading and filtering
 */
export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(options.initialDate || new Date());
  const [refreshToken, setRefreshToken] = useState<number>(0);

  /**
   * Default event transformation function
   */
  const defaultTransformEvent = useCallback((reservation: any): CalendarEvent => {
    return {
      id: reservation.id,
      title: `${reservation.pet?.name || 'Pet'} - ${reservation.service?.name || 'Service'}`,
      start: reservation.startDate,
      end: reservation.endDate,
      backgroundColor: STATUS_COLORS[reservation.status] || STATUS_COLORS.default,
      borderColor: STATUS_COLORS[reservation.status] || STATUS_COLORS.default,
      textColor: '#ffffff',
      extendedProps: {
        reservation
      }
    };
  }, []);

  /**
   * Get the status color for a reservation status
   */
  const getStatusColor = useCallback((status: string): string => {
    return STATUS_COLORS[status] || STATUS_COLORS.default;
  }, []);

  /**
   * Refresh the calendar events
   */
  const refreshEvents = useCallback(() => {
    setRefreshToken(prev => prev + 1);
  }, []);

  /**
   * Load reservations from the API with optional filtering
   */
  const loadEvents = useCallback(async (date?: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      const targetDate = date || currentDate;
      
      // Build status filter
      const statusFilter = options.statusFilter || 'PENDING,CONFIRMED,CHECKED_IN';
      
      // Get all reservations for the selected date
      const response = await reservationService.getAllReservations(
        1, // page
        100, // limit - increased to show more reservations
        'startDate', // sortBy
        'asc', // sortOrder
        statusFilter,
        formatDateToYYYYMMDD(targetDate) // date filter
      );
      
      if (response?.status === 'success' && Array.isArray((response as any)?.data?.reservations)) {
        // Get the reservations from the response
        let filteredReservations = (response as any).data.reservations;
        
        // Filter reservations by service category if specified
        if (options.serviceCategories && options.serviceCategories.length > 0) {
          filteredReservations = filteredReservations.filter((reservation: any) => {
            // Check if the reservation's service category matches any of the specified categories
            if (!reservation.service || typeof reservation.service !== 'object') {
              return false;
            }
            
            const serviceObj = reservation.service as any;
            if (!serviceObj.serviceCategory) {
              return false;
            }
            
            return options.serviceCategories?.some(category => serviceObj.serviceCategory === category) || false;
          });
          
        }
        
        // Transform reservations to calendar events
        const transformFn = options.transformEvent || defaultTransformEvent;
        const calendarEvents = filteredReservations.map(transformFn);
        
        setEvents(calendarEvents);
      } else {
        console.warn('Invalid response format or no reservations found');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, options.serviceCategories, options.statusFilter, options.transformEvent, defaultTransformEvent]);

  // Load events when component mounts or when dependencies change
  useEffect(() => {
    loadEvents();
  }, [loadEvents, refreshToken]);

  // Listen for reservation completion event
  useEffect(() => {
    const handleReservationComplete = () => {
      refreshEvents();
    };
    
    document.addEventListener('reservationComplete', handleReservationComplete);
    window.addEventListener('reservation-created', handleReservationComplete);
    
    return () => {
      document.removeEventListener('reservationComplete', handleReservationComplete);
      window.removeEventListener('reservation-created', handleReservationComplete);
    };
  }, [refreshEvents]);

  return {
    events,
    loading,
    error,
    currentDate,
    setCurrentDate,
    loadEvents,
    refreshEvents,
    getStatusColor
  };
}

export default useCalendarEvents;
