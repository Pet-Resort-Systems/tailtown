/**
 * useCapacityCheck Hook
 * 
 * Hook for checking capacity before booking and showing waitlist prompt
 */

import { useState } from 'react';
import { checkCapacity, CapacityCheckRequest, CapacityCheckResponse } from '../services/capacityService';

export const useCapacityCheck = () => {
  const [checking, setChecking] = useState(false);
  const [capacityData, setCapacityData] = useState<CapacityCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkServiceCapacity = async (request: CapacityCheckRequest): Promise<CapacityCheckResponse | null> => {
    setChecking(true);
    setError(null);
    
    try {
      const response = await checkCapacity(request);
      setCapacityData(response);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to check capacity';
      setError(errorMessage);
      return null;
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setCapacityData(null);
    setError(null);
  };

  return {
    checking,
    capacityData,
    error,
    checkServiceCapacity,
    reset,
    // Helper flags
    isAvailable: capacityData?.available ?? true,
    shouldShowWaitlist: capacityData?.waitlistRecommended ?? false
  };
};
