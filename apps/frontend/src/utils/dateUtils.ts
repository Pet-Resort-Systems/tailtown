/**
 * Utility functions for date handling
 */

/**
 * Format a date as YYYY-MM-DD using local timezone
 * @param date The date to format, or null/undefined
 * @returns Formatted date string or undefined if no date provided
 */
export const formatDateToYYYYMMDD = (
  date?: Date | null
): string | undefined => {
  if (!date) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get the current date formatted as YYYY-MM-DD
 * @returns Current date formatted as YYYY-MM-DD
 */
export const getCurrentDateFormatted = (): string => {
  return formatDateToYYYYMMDD(new Date()) as string;
};

/**
 * Parse a date string (YYYY-MM-DD) in local timezone
 * This avoids timezone shifts that occur with new Date('YYYY-MM-DD')
 * which interprets the string as UTC midnight
 *
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in Date constructor
  return new Date(year, month - 1, day);
};

/**
 * Get day of week from a date string, timezone-safe
 *
 * @param dateString Date string in YYYY-MM-DD format or Date object
 * @returns Day of week (0 = Sunday, 6 = Saturday)
 */
export const getDayOfWeek = (dateString: string | Date): number => {
  if (typeof dateString === 'string') {
    const date = parseLocalDate(dateString);
    return date.getDay();
  }
  return dateString.getDay();
};

/**
 * Get day of week name from a date string, timezone-safe
 *
 * @param dateString Date string in YYYY-MM-DD format or Date object
 * @returns Day name (e.g., 'MONDAY', 'TUESDAY')
 */
export const getDayOfWeekName = (dateString: string | Date): string => {
  const days = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  const dayIndex = getDayOfWeek(dateString);
  return days[dayIndex];
};

/**
 * Check if a date is a weekend (Saturday or Sunday), timezone-safe
 *
 * @param dateString Date string in YYYY-MM-DD format or Date object
 * @returns True if weekend, false otherwise
 */
export const isWeekend = (dateString: string | Date): boolean => {
  const dayIndex = getDayOfWeek(dateString);
  return dayIndex === 0 || dayIndex === 6; // Sunday or Saturday
};

/**
 * Get the month number (1-12) from a date string, timezone-safe
 *
 * @param dateString Date string in YYYY-MM-DD format or Date object
 * @returns Month number (1-12)
 */
export const getMonth = (dateString: string | Date): number => {
  if (typeof dateString === 'string') {
    const date = parseLocalDate(dateString);
    return date.getMonth() + 1; // Convert from 0-indexed to 1-indexed
  }
  return dateString.getMonth() + 1;
};

/**
 * Get the year from a date string, timezone-safe
 *
 * @param dateString Date string in YYYY-MM-DD format or Date object
 * @returns Year
 */
export const getYear = (dateString: string | Date): number => {
  if (typeof dateString === 'string') {
    const date = parseLocalDate(dateString);
    return date.getFullYear();
  }
  return dateString.getFullYear();
};

/**
 * Compare two dates (ignoring time), timezone-safe
 *
 * @param date1 First date
 * @param date2 Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDates = (
  date1: string | Date,
  date2: string | Date
): number => {
  const d1 = typeof date1 === 'string' ? parseLocalDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseLocalDate(date2) : date2;

  const time1 = new Date(
    d1.getFullYear(),
    d1.getMonth(),
    d1.getDate()
  ).getTime();
  const time2 = new Date(
    d2.getFullYear(),
    d2.getMonth(),
    d2.getDate()
  ).getTime();

  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
};

/**
 * Add days to a date, timezone-safe
 *
 * @param dateString Date string in YYYY-MM-DD format
 * @param days Number of days to add (can be negative)
 * @returns New date string in YYYY-MM-DD format
 */
export const addDays = (dateString: string, days: number): string => {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return formatDateToYYYYMMDD(date) as string;
};

/**
 * Calculate difference in days between two dates, timezone-safe
 *
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of days between dates
 */
export const daysBetween = (
  startDate: string | Date,
  endDate: string | Date
): number => {
  const start =
    typeof startDate === 'string' ? parseLocalDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseLocalDate(endDate) : endDate;

  const startTime = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  ).getTime();
  const endTime = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  ).getTime();

  const diffTime = endTime - startTime;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// ============================================================================
// Gingr Date Handling
// ============================================================================
// Gingr stores dates as local time but without timezone info.
// When Prisma returns these dates, it appends 'Z' making them look like UTC.
// These utilities handle this quirk by treating the dates as local time.

/**
 * Parse a Gingr ISO date string as local time
 *
 * Gingr dates are stored as local time but returned with 'Z' suffix.
 * This function strips the 'Z' and parses as local time.
 *
 * Example: "2025-11-20T06:30:00.000Z" -> Date representing 6:30 AM local time
 *
 * @param isoString ISO date string from API (e.g., "2025-11-20T06:30:00.000Z")
 * @returns Date object in local timezone
 */
export const parseGingrDate = (
  isoString: string | Date | null | undefined
): Date | null => {
  if (!isoString) return null;

  // If already a Date object, return it directly
  if (isoString instanceof Date) {
    return isoString;
  }

  // Ensure we have a string before calling replace
  if (typeof isoString !== 'string') {
    console.warn(
      'parseGingrDate received non-string value:',
      typeof isoString,
      isoString
    );
    return null;
  }

  // Remove the 'Z' suffix and parse as local time
  // "2025-11-20T06:30:00.000Z" -> "2025-11-20T06:30:00.000"
  const localString = isoString.replace('Z', '');

  // Parse the components manually to avoid any timezone conversion
  const match = localString.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );
  if (!match) {
    // Fallback: try parsing as-is (for non-ISO formats)
    return new Date(isoString);
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1, // Month is 0-indexed
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
};

/**
 * Format a Gingr date for display (date only)
 *
 * @param isoString ISO date string from API
 * @param options Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatGingrDate = (
  isoString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string => {
  const date = parseGingrDate(isoString);
  if (!date) return '';
  return date.toLocaleDateString('en-US', options);
};

/**
 * Format a Gingr date for display (time only)
 *
 * @param isoString ISO date string from API
 * @param options Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export const formatGingrTime = (
  isoString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
): string => {
  const date = parseGingrDate(isoString);
  if (!date) return '';
  return date.toLocaleTimeString('en-US', options);
};

/**
 * Format a Gingr date for display (date and time)
 *
 * @param isoString ISO date string from API
 * @returns Formatted date and time string
 */
export const formatGingrDateTime = (
  isoString: string | null | undefined
): string => {
  const date = parseGingrDate(isoString);
  if (!date) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Extract just the date portion from a Gingr ISO string
 * Returns YYYY-MM-DD format
 *
 * @param isoString ISO date string from API
 * @returns Date string in YYYY-MM-DD format
 */
export const getGingrDateString = (
  isoString: string | null | undefined
): string => {
  if (!isoString) return '';
  // Just extract the date portion directly - no timezone conversion needed
  return isoString.split('T')[0];
};

/**
 * Extract just the time portion from a Gingr ISO string
 * Returns HH:MM format (24-hour)
 *
 * @param isoString ISO date string from API
 * @returns Time string in HH:MM format
 */
export const getGingrTimeString = (
  isoString: string | null | undefined
): string => {
  if (!isoString) return '';
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (!match) return '';
  return `${match[1]}:${match[2]}`;
};

/**
 * Convert a Gingr date to a Date input value (YYYY-MM-DD)
 * For use with <input type="date">
 *
 * @param isoString ISO date string from API
 * @returns Date string for input value
 */
export const gingrDateToInputValue = (
  isoString: string | null | undefined
): string => {
  return getGingrDateString(isoString);
};

/**
 * Convert a Gingr date to a Time input value (HH:MM)
 * For use with <input type="time">
 *
 * @param isoString ISO date string from API
 * @returns Time string for input value
 */
export const gingrTimeToInputValue = (
  isoString: string | null | undefined
): string => {
  return getGingrTimeString(isoString);
};

/**
 * Combine date and time inputs into a Gingr-compatible ISO string
 *
 * @param dateValue Date input value (YYYY-MM-DD)
 * @param timeValue Time input value (HH:MM)
 * @returns ISO string without 'Z' suffix (local time)
 */
export const inputsToGingrDate = (
  dateValue: string,
  timeValue: string
): string => {
  if (!dateValue) return '';
  const time = timeValue || '00:00';
  return `${dateValue}T${time}:00.000`;
};
