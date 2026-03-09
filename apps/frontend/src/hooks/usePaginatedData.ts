import { useState, useCallback, useEffect } from 'react';
import { AppError, handleApiError } from '../utils/errorHandling';
import { AxiosInstance } from 'axios';

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  limit: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * Options for the usePaginatedData hook
 */
export interface UsePaginatedDataOptions<T> {
  /**
   * API client instance (e.g., customerApiClient, reservationApiClient)
   */
  apiClient: AxiosInstance;
  
  /**
   * API endpoint
   */
  endpoint: string;
  
  /**
   * Initial page number
   */
  initialPage?: number;
  
  /**
   * Number of items per page
   */
  limit?: number;
  
  /**
   * Sort field
   */
  sortBy?: string;
  
  /**
   * Sort order ('asc' or 'desc')
   */
  sortOrder?: 'asc' | 'desc';
  
  /**
   * Additional query parameters
   */
  queryParams?: Record<string, any>;
  
  /**
   * Custom error handler
   */
  onError?: (error: AppError) => void;
  
  /**
   * Function to extract data from the response
   */
  extractData?: (response: any) => T[];
  
  /**
   * Function to extract pagination metadata from the response
   */
  extractPagination?: (response: any) => PaginationMeta;
  
  /**
   * Whether to fetch data automatically on mount
   */
  autoFetch?: boolean;
  
  /**
   * Context for error messages
   */
  context?: string;
}

/**
 * Custom hook for fetching paginated data
 */
export function usePaginatedData<T = any>(options: UsePaginatedDataOptions<T>) {
  const {
    apiClient,
    endpoint,
    initialPage = 1,
    limit = 10,
    sortBy,
    sortOrder = 'asc',
    queryParams = {},
    onError,
    extractData = (response) => {
      // Default data extraction function
      if (response?.data?.data) {
        // Extract from nested data object
        if (Array.isArray(response.data.data)) {
          return response.data.data;
        } else if (response.data.data.results && Array.isArray(response.data.data.results)) {
          return response.data.data.results;
        }
      } else if (response?.data?.results && Array.isArray(response.data.results)) {
        // Extract from results array
        return response.data.results;
      } else if (Array.isArray(response?.data)) {
        // Direct array
        return response.data;
      }
      
      // Fallback - return empty array
      console.warn('Could not extract data from response', response);
      return [];
    },
    extractPagination = (response) => {
      // Default pagination extraction function
      if (response?.data?.pagination) {
        // Extract from pagination object
        return {
          currentPage: response.data.pagination.currentPage || initialPage,
          totalPages: response.data.pagination.totalPages || 1,
          totalCount: response.data.pagination.totalCount,
          limit: response.data.pagination.limit || limit,
          hasNextPage: response.data.pagination.hasNextPage,
          hasPrevPage: response.data.pagination.hasPrevPage
        };
      } else if (response?.data) {
        // Try to extract from data object
        const data = response.data;
        return {
          currentPage: data.currentPage || initialPage,
          totalPages: data.totalPages || 1,
          totalCount: data.totalCount || data.results,
          limit: data.limit || limit,
          hasNextPage: data.hasNextPage || (data.currentPage < data.totalPages),
          hasPrevPage: data.hasPrevPage || (data.currentPage > 1)
        };
      }
      
      // Fallback - return default values
      return {
        currentPage: initialPage,
        totalPages: 1,
        limit,
        hasNextPage: false,
        hasPrevPage: false
      };
    },
    autoFetch = true,
    context = 'paginated-data'
  } = options;
  
  // State
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<AppError | null>(null);
  const [page, setPage] = useState<number>(initialPage);
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: initialPage,
    totalPages: 1,
    limit,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [refreshToken, setRefreshToken] = useState<number>(0);
  
  /**
   * Fetch data for the current page
   */
  const fetchPage = useCallback(async (pageNum: number = page) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params: Record<string, any> = {
        page: pageNum,
        limit,
        ...queryParams
      };
      
      // Add sorting parameters if provided
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }
      
      // Make the API request
      const response = await apiClient.get(endpoint, { params });
      
      // Extract data and pagination from the response
      const items = extractData(response);
      const paginationData = extractPagination(response);
      
      // Update state
      setData(items);
      setPagination(paginationData);
      setPage(pageNum);
      
      return { items, pagination: paginationData };
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
    apiClient,
    endpoint,
    page,
    limit,
    sortBy,
    sortOrder,
    queryParams,
    extractData,
    extractPagination,
    context,
    onError,
    refreshToken // Include refreshToken to re-fetch when it changes
  ]);
  
  /**
   * Go to a specific page
   */
  const goToPage = useCallback((pageNum: number) => {
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      fetchPage(pageNum).catch(() => {}); // Catch errors to avoid unhandled promise rejections
    }
  }, [fetchPage, pagination.totalPages]);
  
  /**
   * Go to the next page
   */
  const nextPage = useCallback(() => {
    if (page < pagination.totalPages) {
      goToPage(page + 1);
    }
  }, [goToPage, page, pagination.totalPages]);
  
  /**
   * Go to the previous page
   */
  const prevPage = useCallback(() => {
    if (page > 1) {
      goToPage(page - 1);
    }
  }, [goToPage, page]);
  
  /**
   * Go to the first page
   */
  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);
  
  /**
   * Go to the last page
   */
  const lastPage = useCallback(() => {
    goToPage(pagination.totalPages);
  }, [goToPage, pagination.totalPages]);
  
  /**
   * Refresh the data for the current page
   */
  const refresh = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);
  
  // Fetch data on mount or when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchPage().catch(() => {}); // Catch errors to avoid unhandled promise rejections
    }
  }, [fetchPage, autoFetch]);
  
  return {
    data,
    loading,
    error,
    page,
    pagination,
    fetchPage,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    refresh,
    setData
  };
}

export default usePaginatedData;
