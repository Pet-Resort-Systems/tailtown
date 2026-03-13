import { useState, useEffect, useCallback, useRef } from 'react';
import { resourceService, type Resource } from '../services/resourceService';
import { formatDateToYYYYMMDD } from '../utils/dateUtils';

/**
 * Extended Resource type that includes reservations
 */
interface ResourceWithReservations extends Resource {
  maintenanceStatus?: string;
  reservations?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    pet?: {
      id: string;
      name: string;
      breed?: string;
      customer?: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface SuiteStats {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  needsCleaning: number;
  occupancyRate: number;
}

interface UseSuiteDataReturn {
  suites: ResourceWithReservations[];
  stats: SuiteStats | null;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  updateDate: (date: Date) => void;
}

/**
 * Custom hook to manage suite data and stats efficiently
 * Prevents duplicate API calls by centralizing data fetching
 */
export const useSuiteData = (initialDate: Date = new Date()): UseSuiteDataReturn => {
  const [suites, setSuites] = useState<ResourceWithReservations[]>([]);
  const [stats, setStats] = useState<SuiteStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(initialDate);
  
  // Use ref to prevent multiple simultaneous requests
  const isLoadingRef = useRef(false);

  const calculateStats = useCallback((suitesData: ResourceWithReservations[]): SuiteStats => {
    let total = 0;
    let available = 0;
    let occupied = 0;
    let reserved = 0;
    let maintenance = 0;
    let needsCleaning = 0;

    suitesData.forEach(suite => {
      total++;
      
      // Determine status based on reservations and maintenance
      const hasActiveReservations = suite.reservations?.some(reservation => 
        ['CONFIRMED', 'CHECKED_IN'].includes(reservation.status)
      ) || false;
      
      if (suite.maintenanceStatus === 'MAINTENANCE') {
        maintenance++;
      } else if (suite.maintenanceStatus === 'NEEDS_CLEANING') {
        needsCleaning++;
      } else if (hasActiveReservations) {
        occupied++;
      } else {
        available++;
      }
    });

    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return {
      total,
      available,
      occupied,
      reserved,
      maintenance,
      needsCleaning,
      occupancyRate
    };
  }, []);

  const fetchData = useCallback(async (date: Date) => {
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      const formattedDate = formatDateToYYYYMMDD(date);
      console.log('Fetching suite data for date:', formattedDate);

      const response = await resourceService.getSuites(undefined, undefined, undefined, formattedDate);
      
      if (response.status === 'success' && Array.isArray(response.data)) {
        const suitesData = response.data as ResourceWithReservations[];
        setSuites(suitesData);
        
        // Calculate stats from the same data
        const calculatedStats = calculateStats(suitesData);
        setStats(calculatedStats);
        
        console.log('Suite data loaded successfully:', {
          suitesCount: suitesData.length,
          stats: calculatedStats
        });
      } else {
        throw new Error('Failed to fetch suite data');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load suite data';
      setError(errorMessage);
      console.error('Error fetching suite data:', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [calculateStats]);

  const refreshData = useCallback(() => {
    fetchData(currentDate);
  }, [fetchData, currentDate]);

  const updateDate = useCallback((date: Date) => {
    setCurrentDate(date);
    fetchData(date);
  }, [fetchData]);

  // Initial data load
  useEffect(() => {
    fetchData(currentDate);
  }, []); // Only run on mount

  return {
    suites,
    stats,
    loading,
    error,
    refreshData,
    updateDate
  };
};

export default useSuiteData;
