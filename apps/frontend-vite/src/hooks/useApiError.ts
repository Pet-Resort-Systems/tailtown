import { useState, useCallback } from 'react';
import { AppError, handleApiError } from '../utils/errorHandling';

/**
 * Hook for standardized API error handling in React components
 * @param initialError - Optional initial error state
 * @returns Error state and handler functions
 */
export function useApiError(initialError?: string | null) {
  // Error message to display to the user
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  
  // Error details for debugging or advanced error displays
  const [errorDetails, setErrorDetails] = useState<AppError | null>(null);
  
  /**
   * Handle API errors consistently
   * @param error - The error that occurred
   * @param context - The context in which the error occurred
   * @returns The handled error object
   */
  const handleError = useCallback((error: unknown, context: string = 'api'): AppError => {
    // Use our standardized error handling util
    const handledError = handleApiError(error, context);
    
    // Update state with the error information
    setErrorMessage(handledError.message);
    setErrorDetails(handledError);
    
    return handledError;
  }, []);
  
  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setErrorMessage(null);
    setErrorDetails(null);
  }, []);
  
  return {
    errorMessage,
    errorDetails,
    handleError,
    clearError,
    setErrorMessage
  };
}

export default useApiError;
