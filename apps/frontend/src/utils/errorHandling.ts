import axios, { AxiosError } from 'axios';

export interface AppError {
  message: string;
  code?: string;
  context?: string;
  originalError?: unknown;
  statusCode?: number;
  details?: any;
}

/**
 * Standardized error handler for API errors
 * @param error - The error to handle
 * @param context - The context in which the error occurred (e.g., "login", "customers")
 * @returns A standardized AppError object
 */
export function handleApiError(error: unknown, context: string = 'api'): AppError {
  // Log the error for debugging
  console.error(`Error in ${context}:`, error);
  
  // Handle Axios errors specially to extract useful information
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Handle 401 Unauthorized errors
    if (axiosError.response?.status === 401) {
      return {
        message: 'Your session has expired or you are not authorized. Please login again.',
        code: 'UNAUTHORIZED',
        context,
        originalError: error,
        statusCode: 401,
        details: axiosError.response?.data
      };
    }
    
    if (axiosError.response?.status === 404) {
      return {
        message: `The requested ${context} resource was not found`,
        code: 'NOT_FOUND',
        context,
        statusCode: axiosError.response.status,
        details: axiosError.response?.data
      };
    }
    
    // Handle specific HTTP status codes
    if (axiosError.response?.status === 400) {
      const details = axiosError.response?.data as any;
      const errorMessage = details?.message || details?.error || 'Invalid request';
      return {
        message: errorMessage,
        code: 'BAD_REQUEST',
        statusCode: 400,
        context,
        originalError: error,
        details
      };
    }
    
    // Handle other HTTP errors
    if (axiosError.response) {
      const details = axiosError.response?.data as any;
      const errorMessage = details?.message || details?.error || axiosError.message;
      return {
        message: errorMessage,
        code: `HTTP_${axiosError.response.status}`,
        statusCode: axiosError.response.status,
        context,
        originalError: error,
        details
      };
    }
    
    // Handle network errors (no response received)
    if (axiosError.request) {
      return {
        message: 'Unable to connect to the server. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        context,
        originalError: error
      };
    }
    
    // Other Axios errors
    return {
      message: axiosError.message || 'An unknown error occurred',
      code: 'AXIOS_ERROR',
      context,
      originalError: error
    };
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      context,
      originalError: error
    };
  }
  
  // Handle unknown error types
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    context,
    originalError: error,
    details: typeof error === 'object' ? error : { value: error }
  };
}

/**
 * Display an error message to the user
 * @param error - The error to display
 * @param setErrorMessage - Function to set the error message in the UI
 */
export function displayErrorToUser(error: unknown, setErrorMessage: (message: string) => void): void {
  let errorToDisplay = '';
  
  // Use our standardized error handling
  if (error) {
    const appError = error as AppError;
    if (appError.message) {
      errorToDisplay = appError.message;
    } else {
      const handled = handleApiError(error);
      errorToDisplay = handled.message;
    }
  } else {
    errorToDisplay = 'An unknown error occurred';
  }
  
  // Set the error message in the UI
  setErrorMessage(errorToDisplay);
}

/**
 * Helper function to wrap async functions with consistent error handling
 * @param fn - Async function to wrap
 * @param context - Context for error handling
 * @param onError - Optional error handler
 * @returns A wrapped function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string,
  onError?: (error: AppError) => void
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const handledError = handleApiError(error, context);
      
      if (onError) {
        onError(handledError);
      } else {
        console.error(`Error in ${context}:`, handledError.message);
      }
      
      throw handledError;
    }
  };
}

/**
 * Extract error message from various error types
 * @param error - The error
 * @returns A readable error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const data = axiosError.response?.data as any;
    return data?.message || data?.error || axiosError.message;
  }
  
  return 'An unknown error occurred';
}
