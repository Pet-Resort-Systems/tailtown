import { useState, useCallback } from 'react';
import { AppError, handleApiError } from '../utils/errorHandling';
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * HTTP method types
 */
export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Options for the useMutation hook
 */
export interface UseMutationOptions<TData = any, TVariables = any, TResponse = any> {
  /**
   * API client instance
   */
  apiClient?: AxiosInstance;
  
  /**
   * API endpoint
   */
  endpoint?: string;
  
  /**
   * HTTP method to use for the mutation
   */
  method?: HttpMethod;
  
  /**
   * Custom mutation function
   */
  mutationFn?: (variables: TVariables) => Promise<TResponse>;
  
  /**
   * Called when the mutation is successful
   */
  onSuccess?: (data: TData) => void;
  
  /**
   * Called when the mutation fails
   */
  onError?: (error: AppError) => void;
  
  /**
   * Called before the mutation starts
   */
  onStart?: () => void;
  
  /**
   * Called when the mutation completes (success or error)
   */
  onComplete?: () => void;
  
  /**
   * Function to extract data from the response
   */
  extractData?: (response: AxiosResponse<any>) => TData;
  
  /**
   * Context for error messages
   */
  context?: string;
}

/**
 * Custom hook for mutation operations (create, update, delete)
 */
export function useMutation<TData = any, TVariables = any, TResponse = any>(
  options: UseMutationOptions<TData, TVariables, TResponse>
) {
  const {
    apiClient,
    endpoint,
    method = 'POST',
    mutationFn,
    onSuccess,
    onError,
    onStart,
    onComplete,
    extractData = (response) => {
      // Default data extraction function
      if (response?.data?.data) {
        return response.data.data;
      } else if (response?.data) {
        return response.data;
      } else {
        return response;
      }
    },
    context = 'mutation'
  } = options;
  
  // State
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  
  /**
   * Validate that we have a way to perform the mutation
   */
  const validateMutationMethod = useCallback(() => {
    if (!mutationFn && (!apiClient || !endpoint)) {
      throw new Error('useMutation requires either mutationFn or both apiClient and endpoint');
    }
  }, [mutationFn, apiClient, endpoint]);
  
  /**
   * Perform the mutation
   */
  const mutate = useCallback(async (variables: TVariables, config?: AxiosRequestConfig) => {
    validateMutationMethod();
    
    try {
      // Start loading
      setLoading(true);
      setError(null);
      
      // Call onStart callback if provided
      if (onStart) {
        onStart();
      }
      
      let response;
      
      if (mutationFn) {
        // Use custom mutation function
        response = await mutationFn(variables);
      } else if (apiClient && endpoint) {
        // Use API client
        const axiosConfig: AxiosRequestConfig = {
          ...config
        };
        
        // Determine the method to use
        switch (method) {
          case 'POST':
            response = await apiClient.post(endpoint, variables, axiosConfig);
            break;
          case 'PUT':
            response = await apiClient.put(endpoint, variables, axiosConfig);
            break;
          case 'PATCH':
            response = await apiClient.patch(endpoint, variables, axiosConfig);
            break;
          case 'DELETE':
            // For DELETE, variables might be passed as URL parameters or in the request body
            response = await apiClient.delete(endpoint, { 
              data: variables,
              ...axiosConfig
            });
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      } else {
        // This should never happen due to validateMutationMethod
        throw new Error('No mutation method available');
      }
      
      // Extract data from the response
      const extractedData = extractData(response as AxiosResponse<any>) as TData;
      
      // Update state
      setData(extractedData);
      setError(null);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(extractedData);
      }
      
      return extractedData;
    } catch (error) {
      // Handle error using the standardized error handling
      const handledError = handleApiError(error, context);
      
      // Update state
      setError(handledError);
      setData(null);
      
      // Call onError callback if provided
      if (onError) {
        onError(handledError);
      }
      
      // Re-throw the error for the caller to handle if needed
      throw handledError;
    } finally {
      // Stop loading
      setLoading(false);
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    }
  }, [
    apiClient,
    endpoint,
    method,
    mutationFn,
    onSuccess,
    onError,
    onStart,
    onComplete,
    extractData,
    context,
    validateMutationMethod
  ]);
  
  /**
   * Reset the state
   */
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);
  
  return {
    data,
    loading,
    error,
    mutate,
    reset
  };
}

export default useMutation;
