/**
 * API configuration
 */
export interface ApiConfig {
  /**
   * Base URL for the customer service
   */
  customerServiceUrl: string;
  
  /**
   * Base URL for the reservation service
   */
  reservationServiceUrl: string;
  
  /**
   * Request timeout in milliseconds
   */
  timeout: number;
  
  /**
   * Default tenant ID
   */
  defaultTenantId: string;
  
  /**
   * Whether to include tenant ID in requests
   */
  includeTenantId: boolean;
}

/**
 * Calendar configuration
 */
export interface CalendarConfig {
  /**
   * Default view type
   */
  defaultView: 'month' | 'week' | 'day';
  
  /**
   * Start time for day view
   */
  dayStartTime: string;
  
  /**
   * End time for day view
   */
  dayEndTime: string;
  
  /**
   * Slot duration in minutes
   */
  slotDuration: number;
  
  /**
   * Whether to show weekends
   */
  showWeekends: boolean;
  
  /**
   * Status colors
   */
  statusColors: Record<string, string>;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /**
   * Default page size
   */
  defaultPageSize: number;
  
  /**
   * Available page sizes
   */
  pageSizes: number[];
}

/**
 * Date format configuration
 */
export interface DateFormatConfig {
  /**
   * Date format for display
   */
  displayDate: string;
  
  /**
   * Time format for display
   */
  displayTime: string;
  
  /**
   * Date and time format for display
   */
  displayDateTime: string;
  
  /**
   * API date format
   */
  apiDate: string;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  /**
   * Whether to enable dark mode
   */
  enableDarkMode: boolean;
  
  /**
   * Whether to show the debug panel
   */
  showDebugPanel: boolean;
  
  /**
   * Whether to mock API responses in development
   */
  mockApi: boolean;
  
  /**
   * Whether to use the new calendar components
   */
  useNewCalendarComponents: boolean;
}

/**
 * Application configuration
 */
export interface AppConfig {
  /**
   * API configuration
   */
  api: ApiConfig;
  
  /**
   * Calendar configuration
   */
  calendar: CalendarConfig;
  
  /**
   * Pagination configuration
   */
  pagination: PaginationConfig;
  
  /**
   * Date format configuration
   */
  dateFormat: DateFormatConfig;
  
  /**
   * Feature flags
   */
  features: FeatureFlags;
}
