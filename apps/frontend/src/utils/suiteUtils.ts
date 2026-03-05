/**
 * Utility functions for suite status determination
 */
import { Resource } from '../services/resourceService';

/**
 * Extended Resource type that includes reservations
 */
interface ResourceWithReservations extends Resource {
  reservations?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

/**
 * Determine the status of a suite based on maintenance status and reservations
 * @param suite The suite resource object
 * @returns Status string: 'OCCUPIED', 'MAINTENANCE', or 'AVAILABLE'
 */
export const determineSuiteStatus = (suite: ResourceWithReservations): 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' => {
  // Check if suite is in maintenance
  if (suite.attributes?.maintenanceStatus === 'MAINTENANCE') {
    return 'MAINTENANCE';
  }
  
  // Check if suite has active reservations
  if (suite.reservations && suite.reservations.length > 0) {
    // Check for active reservations (PENDING, CONFIRMED or CHECKED_IN)
    const hasActiveReservation = suite.reservations.some((res: { status: string }) => 
      ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(res.status)
    );
    
    if (hasActiveReservation) {
      return 'OCCUPIED';
    }
    
    // Check for upcoming reservation (not yet checked in)
    const hasUpcomingReservation = suite.reservations.some((res: { status: string; startDate: string }) => 
      res.status === 'CONFIRMED' && new Date(res.startDate) > new Date()
    );
    
    if (hasUpcomingReservation) {
      return 'RESERVED';
    }
  }
  
  // Default status
  return 'AVAILABLE';
};

/**
 * Check if a suite is occupied based on its reservations
 * @param suite The suite resource object
 * @returns Boolean indicating if the suite is occupied
 */
export const isSuiteOccupied = (suite: ResourceWithReservations): boolean => {
  return determineSuiteStatus(suite) === 'OCCUPIED';
};
