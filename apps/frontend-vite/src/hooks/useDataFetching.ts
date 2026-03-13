import { useState, useEffect, useCallback } from 'react';
import { AppError, handleApiError } from '../utils/errorHandling';
import { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Options for the useDataFetching hook
 */
export interface UseDataFetchingOptions<T> {
  /**
   * Function to fetch the data
   */
  fetchFn?: () => Promise<T>;
  
  /**
   * API client instance (e.g., customerApiClient, reservationApiClient)
   */
  apiClient?: AxiosInstance;
  
  /**
   * API endpoint
   */
  endpoint?: string;
  
  /**
   * Axios request configuration
   */
  requestConfig?: AxiosRequestConfig;
  
  /**
   * Initial state for the data
   */
  initialData?: T;
  
  /**
   * Whether to fetch data automatically on mount
   */
  autoFetch?: boolean;
  
  /**
   * Custom error handler
   */
  onError?: (error: AppError) => void;
  
  /**
   * Dependencies array for the useEffect hook
   */
  dependencies?: any[];
  
  /**
   * Context for error messages
   */
  context?: string;
  
  /**
   * Data extraction function
   * Some APIs return data nested in a response object, e.g., { status: 'success', data: { ... } }
   * This function extracts the actual data from the response
   */
  extractData?: (response: any) => T;
}

/**
 * Custom hook for data fetching with standardized error handling
 */
export function useDataFetching<T = any>(options: UseDataFetchingOptions<T>) {
  const {
    fetchFn,
    apiClient,
    endpoint,
    requestConfig = {},
    initialData,
    autoFetch = true,
    onError,
    dependencies = [],
    context = 'api',
    extractData = (response) => {
      // Default extraction function handles common response formats
      if (response?.data?.data) {
        return response.data.data;
      } else if (response?.data) {
        return response.data;
      } else {
        return response;
      }
    }
  } = options;
  
  // State
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<AppError | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);
  
  /**
   * Validate that we have a way to fetch data
   */
  const validateFetchMethod = useCallback(() => {
    if (!fetchFn && (!apiClient || !endpoint)) {
      throw new Error('useDataFetching requires either fetchFn or both apiClient and endpoint');
    }
  }, [fetchFn, apiClient, endpoint]);
  
  /**
   * Fetch data using the provided fetch function or API client
   */
  const fetchData = useCallback(async () => {
    validateFetchMethod();
    
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      if (fetchFn) {
        // Use the provided fetch function
        response = await fetchFn();
      } else if (apiClient && endpoint) {
        // Use the API client
        response = await apiClient.request({
          url: endpoint,
          ...requestConfig
        });
      } else {
        // This should never happen due to validateFetchMethod
        throw new Error('No fetch method available');
      }
      
      // Extract data from the response
      const extractedData = extractData(response);
      
      // Update state
      setData(extractedData as T);
      
      return extractedData;
    } catch (error) {
      // Handle error using the standardized error handling
      const handledError = handleApiError(error, context);
      
      // Update state
      setError(handledError);
      
      // Call custom error handler if provided
      if (onError) {
        onError(handledError);
      }
      
      // Re-throw the error for the caller to handle if needed
      throw handledError;
    } finally {
      setLoading(false);
    }
  }, [
    fetchFn,
    apiClient, 
    endpoint, 
    requestConfig, 
    extractData, 
    context,
    onError,
    validateFetchMethod,
    refreshToken, // Include refreshToken to re-fetch when it changes
    ...dependencies // Include any additional dependencies
  ]);
  
  /**
   * Refresh the data
   */
  const refresh = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);
  
  // Fetch data on mount or when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchData().catch(() => {}); // Catch errors to avoid unhandled promise rejections
    }
  }, [fetchData, autoFetch]);
  
  return {
    data,
    loading,
    error,
    fetchData,
    refresh,
    setData
  };
}

export default useDataFetching;
