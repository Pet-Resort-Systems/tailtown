import { AppConfig } from './types';

/**
 * Development environment configuration
 */
const developmentConfig: AppConfig = {
  api: {
    customerServiceUrl: process.env.REACT_APP_API_URL || '',
    reservationServiceUrl: process.env.REACT_APP_RESERVATION_API_URL || '',
    timeout: 30000,
    defaultTenantId: 'dev',
    includeTenantId: true,
  },
  calendar: {
    defaultView: 'week',
    dayStartTime: '06:00:00',
    dayEndTime: '20:00:00',
    slotDuration: 30,
    showWeekends: true,
    statusColors: {
      CONFIRMED: '#4caf50', // Green
      PENDING: '#ff9800', // Orange
      CHECKED_IN: '#2196f3', // Blue
      CHECKED_OUT: '#9e9e9e', // Gray
      COMPLETED: '#673ab7', // Purple
      CANCELLED: '#f44336', // Red
      NO_SHOW: '#d32f2f', // Dark Red
      default: '#9e9e9e', // Gray
    },
  },
  pagination: {
    defaultPageSize: 10,
    pageSizes: [5, 10, 20, 50],
  },
  dateFormat: {
    displayDate: 'MM/DD/YYYY',
    displayTime: 'h:mm A',
    displayDateTime: 'MM/DD/YYYY h:mm A',
    apiDate: 'YYYY-MM-DD',
  },
  features: {
    enableDarkMode: false,
    showDebugPanel: true,
    mockApi: false,
    useNewCalendarComponents: true,
  },
};

export default developmentConfig;
